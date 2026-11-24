import { readFile } from 'fs/promises'
import { FileHelper } from '@start9labs/start-sdk'
import { manifest as bitcoinManifest } from 'bitcoin-core-startos/startos/manifest'
import { manifest as clnManifest } from 'cln-startos/startos/manifest'
import { manifest as lndManifest } from 'lnd-startos/startos/manifest'
import { bounded, unanswered } from './boundedCheck'
import { i18n } from './i18n'
import { sdk } from './sdk'
import {
  backfillEnabled,
  bitcoindRpcBridge,
  btcMountpoint,
  clnMountpoint,
  clnSocketPath,
  dataMountpoint,
  electrumBridge,
  hostPort,
  lndCertPath,
  lndMacaroonPath,
  lndMountpoint,
  lndRestBridge,
  selectedBackend,
  selectedIndexer,
  selectedLightning,
  statusFile,
  storageLimit,
  uiPort,
} from './utils'

/**
 * What the updater writes to status.json on the data volume (cesspool-pruned:
 * tools/serve.py and cesspool/local.py). Only the fields read here.
 */
type Status = {
  state?: 'waiting' | 'starting' | 'grading' | 'error'
  message?: string
  alive?: number
  updated?: number
}

const readStatus = async (): Promise<Status | null> => {
  try {
    return JSON.parse(await readFile(statusFile, 'utf8')) as Status
  } catch {
    // Not written yet, or caught mid-rename: the next poll reads it.
    return null
  }
}

export const main = sdk.setupMain(async ({ effects }) => {
  /**
   * ======================== Setup ========================
   */
  console.info(i18n('Starting Cesspool Pruned'))

  // Every one of these is a `.const` read: changing the node, the indexer, the
  // Lightning node, the backfill switch or the storage limit restarts the two
  // daemons with the new environment. That is all a change needs; the app
  // keeps its state per chain and picks up where it was.
  const backend = await selectedBackend(effects)
  const indexer = await selectedIndexer(effects)
  const lightning = await selectedLightning(effects)
  const backfill = await backfillEnabled(effects)
  const limitGb = await storageLimit(effects)

  // Addresses, read from each chosen package's own binding on the bridge. A
  // package that is not installed resolves to null and gets no variable at all:
  // the updater then says what it is waiting for, and the `.const` re-runs this
  // when the package appears. No address is ever made up.
  const rpc = await bitcoindRpcBridge(effects)
  const electrum =
    indexer !== 'none' ? await electrumBridge(effects, indexer) : null
  const lndRest =
    lightning === 'lnd' || lightning === 'lightning-fork'
      ? await lndRestBridge(effects, lightning)
      : null

  let updaterMounts = sdk.Mounts.of()
    .mountVolume({
      volumeId: 'data',
      subpath: null,
      mountpoint: dataMountpoint,
      readonly: false,
    })
    .mountDependency<typeof bitcoinManifest>({
      // The selected node, not a hardcoded `bitcoind`. All of them share a
      // volume id and layout, so the mountpoint stays constant and only the
      // source changes. Read-only, and only for the RPC cookie.
      dependencyId: backend as 'bitcoind',
      volumeId: 'main',
      subpath: null,
      mountpoint: btcMountpoint,
      readonly: true,
    })

  if (lightning === 'lnd' || lightning === 'lightning-fork') {
    updaterMounts = updaterMounts.mountDependency<typeof lndManifest>({
      // Start9's LND or Lightning Fork, whose volume is laid out the same:
      // tls.cert at the root, the read-only macaroon under data/chain.
      dependencyId: lightning as 'lnd',
      volumeId: 'main',
      subpath: null,
      mountpoint: lndMountpoint,
      readonly: true,
    })
  } else if (lightning === 'cln') {
    updaterMounts = updaterMounts.mountDependency<typeof clnManifest>({
      dependencyId: 'c-lightning',
      volumeId: 'main',
      subpath: 'bitcoin',
      mountpoint: clnMountpoint,
      readonly: true,
    })
  }

  const updaterSub = sdk.SubContainer.of(
    effects,
    { imageId: 'cesspool' },
    updaterMounts,
    'updater',
  )

  // Where the node keeps its RPC cookie, which depends on the network it is on.
  //
  // bitcoind puts a non-mainnet chain's data in a subdirectory named for that
  // chain and keeps mainnet's at the root, so a single pinned path
  // authenticates on one network only. Derived from the node's own generated
  // config rather than from the backend id, because the BLAKE2b node can be on
  // either and the id does not say which. (Cesspool grades mainnet only; on
  // another network it authenticates, finds no block 961640, and says so.)
  //
  // Read reactively: the node rewrites this file on every start, so switching
  // its network restarts the updater here rather than leaving it authenticating
  // against a path that no longer exists.
  const updaterRootfs = await updaterSub.rootfs
  const nodeConf = await FileHelper.string(
    `${updaterRootfs}${btcMountpoint}/bitcoin.conf`,
  )
    .read(
      (c) => c,
      (prev, next) => next === null || prev === next,
    )
    .const(effects)

  // Mainnet is spelled by the absence of a network line rather than by
  // `mainnet=1`, so a search for a positive marker is the only correct shape.
  const nodeNetwork =
    (['regtest', 'testnet4', 'testnet', 'signet'] as const).find((c) =>
      nodeConf?.split('\n').some((l) => l.trim() === `${c}=1`),
    ) ?? null

  // The updater's settings. The image reads nothing else.
  const env: Record<string, string> = {
    CESSPOOL_RPC_COOKIE: nodeNetwork
      ? `${btcMountpoint}/${nodeNetwork}/.cookie`
      : `${btcMountpoint}/.cookie`,
    CESSPOOL_BACKFILL: backfill ? '1' : '0',
    CESSPOOL_MAX_GB: String(limitGb),
  }
  if (rpc) env.CESSPOOL_RPC_URL = `http://${rpc}`
  if (electrum) {
    const { host, port } = hostPort(electrum)
    env.CESSPOOL_ELECTRUM_HOST = host
    env.CESSPOOL_ELECTRUM_PORT = port
  }
  if (lndRest) {
    // LND terminates its own TLS; the app checks it against the mounted cert.
    env.CESSPOOL_LN_BACKEND = 'lnd'
    env.CESSPOOL_LND_REST_URL = `https://${lndRest}`
    env.CESSPOOL_LND_TLS_CERT = lndCertPath
    env.CESSPOOL_LND_MACAROON = lndMacaroonPath
    env.CESSPOOL_LN_REFRESH = '3600'
  } else if (lightning === 'cln') {
    env.CESSPOOL_LN_BACKEND = 'cln'
    env.CESSPOOL_CLN_SOCKET = clnSocketPath
    env.CESSPOOL_LN_REFRESH = '3600'
  }

  // status.json outlives a restart, so what is in it when this starts was
  // written by the run before. Until the new updater has written its own, the
  // honest answer is "starting".
  const startedAt = Math.floor(Date.now() / 1000)

  /**
   *  ======================== Daemons ========================
   */
  return sdk.Daemons.of(effects)
    .addDaemon('updater', {
      subcontainer: updaterSub,
      exec: {
        command: ['/app/docker/updater.sh'],
        // root, to read the node's cookie (mode 0600 in the node's volume) and
        // to write a volume StartOS mounts root-owned.
        user: 'root',
        env,
      },
      ready: {
        display: i18n('Grading'),
        fn: bounded(async () => {
          // No address means the chosen node is not installed, or has not
          // bound its RPC port yet. The updater is waiting on a variable it
          // was never given, and says so in those terms; this says it in the
          // user's.
          if (!rpc) {
            return {
              result: 'starting',
              message: i18n(
                'Waiting for the Bitcoin node chosen under Select Node. It is not installed, or has not started yet.',
              ),
            }
          }
          const status = await readStatus()
          const written = Math.max(status?.alive ?? 0, status?.updated ?? 0)
          if (!status || !status.state || written < startedAt - 5) {
            return {
              result: 'starting',
              message: i18n('Cesspool Pruned is starting'),
            }
          }
          // The message is the app's own sentence, such as "Grading the
          // BLAKE2b chain, blocks 961640 to 981500": it names the chain, which
          // is found out at run time and is nowhere in this package's settings.
          const message = status.message ?? null
          switch (status.state) {
            case 'grading':
              return { result: 'success', message }
            case 'error':
              return {
                result: 'failure',
                message: message ?? i18n('The last update failed'),
              }
            default:
              // waiting (for the node to answer, to finish syncing, or to
              // reach the block that tells the chains apart) and starting
              // (the first blocks are being graded).
              return { result: 'starting', message }
          }
        }, unanswered),
      },
      requires: [],
    })
    .addDaemon('web', {
      subcontainer: sdk.SubContainer.of(
        effects,
        { imageId: 'cesspool' },
        sdk.Mounts.of().mountVolume({
          volumeId: 'data',
          subpath: null,
          mountpoint: dataMountpoint,
          readonly: true,
        }),
        'web',
      ),
      exec: {
        command: ['/app/docker/web.sh'],
        // root for the same volume; nginx's workers drop to `nobody`, and the
        // updater writes everything world-readable.
        user: 'root',
      },
      ready: {
        display: i18n('Web Interface'),
        fn: bounded(
          () =>
            sdk.healthCheck.checkPortListening(effects, uiPort, {
              successMessage: i18n('The web interface is ready'),
              errorMessage: i18n('The web interface is not ready'),
            }),
          unanswered,
        ),
      },
      // Not gated on the updater: until the first build exists the web server
      // shows a page that says what the updater is waiting for, which is more
      // use than no page.
      requires: [],
    })
})
