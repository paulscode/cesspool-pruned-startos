import { T } from '@start9labs/start-sdk'
import { controlHostId, restPort } from 'lnd-startos/startos/interfaces'
import { backends, defaultBackend } from './backends'
import {
  defaultStorageLimit,
  Indexer,
  IndexerChoice,
  LightningChoice,
  storeJson,
} from './fileModels/store.json'
import { sdk } from './sdk'
import type { healthFns } from '@start9labs/start-sdk'
import { i18n } from './i18n'

/**
 * A `.const` read of store.json, which an action may be writing at that moment.
 *
 * FileHelper writes in place and its watcher wakes on the truncate, so a re-run
 * can read the file empty or half written. The read then throws, and a `.const`
 * that throws never registers its watch, so nothing re-runs until the container
 * restarts. A parse failure is read again shortly; anything else is thrown as
 * before. Copied from Mempool Pruned, where it was learned.
 */
export async function settled<A>(read: () => Promise<A>): Promise<A> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await read()
    } catch (e) {
      if ((e as Error)?.name !== 'SyntaxError' || attempt >= 20) throw e
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }
}

export const uiPort = 8080
// Host id of the Web UI binding (see interfaces.ts). Exported so a dependent
// can resolve Cesspool's site over the bridge.
export const mainHostId = 'main'

// Where the image keeps everything it writes, and the two files this package
// reads or leaves there (cesspool-pruned: tools/serve.py).
export const dataMountpoint = '/data'
export const statusFile = sdk.volumes.data.subpath('status.json')
export const rebuildRequest = sdk.volumes.data.subpath('rebuild')

export const btcMountpoint = '/mnt/bitcoind'
export const lndMountpoint = '/mnt/lnd'
export const clnMountpoint = '/mnt/cln'

export const lndCertPath = `${lndMountpoint}/tls.cert`
export const lndMacaroonPath = `${lndMountpoint}/data/chain/bitcoin/mainnet/readonly.macaroon`
export const clnSocketPath = `${clnMountpoint}/lightning-rpc`

/**
 * The packages that serve LND's API. Lightning Fork shares LND's REST host and
 * port, its volume layout (tls.cert at the root, macaroons under
 * data/chain/bitcoin/mainnet) and its `lnd` and `sync-progress` health checks,
 * so everything about the LND backend applies to it unchanged.
 */
export type LndPackage = 'lnd' | 'lightning-fork'

/** A bridge address is always `<ipv4>:<port>`; split it into a host and a port. */
export const hostPort = (addr: string) => {
  const i = addr.lastIndexOf(':')
  return { host: addr.slice(0, i), port: addr.slice(i + 1) }
}

export const selectedBackend = async (effects: T.Effects) =>
  (await settled(() => storeJson.read((s) => s?.backend).const(effects))) ??
  defaultBackend

export const selectedIndexer = async (
  effects: T.Effects,
): Promise<IndexerChoice> =>
  (await settled(() => storeJson.read((s) => s?.indexer).const(effects))) ??
  'none'

export const selectedLightning = async (
  effects: T.Effects,
): Promise<LightningChoice> =>
  (await settled(() => storeJson.read((s) => s?.lightning).const(effects))) ??
  'none'

export const backfillEnabled = async (effects: T.Effects) =>
  (await settled(() => storeJson.read((s) => s?.backfill).const(effects))) ??
  true

export const storageLimit = async (effects: T.Effects) =>
  (await settled(() =>
    storeJson.read((s) => s?.storageLimitGb).const(effects),
  )) ?? defaultStorageLimit

/**
 * The selected node's RPC bridge address (`<osIp>:<port>`). `null` while that
 * node is absent: the caller then passes no address rather than a made-up one,
 * the updater reports that it is waiting for a node, and the `.const()` heals
 * with the real address when the node appears.
 *
 * Which flavor, and therefore which host id and port, is the user's choice. The
 * official package and its two mainnet forks share both; knots-blake2b is a
 * separate lineage and does not, which is why this reads the endpoints from
 * `backends` rather than importing one set of constants.
 *
 * When the node is pruned its package puts btc-rpc-proxy on this same port and
 * moves bitcoind to loopback, so nothing here needs to know.
 */
export const bitcoindRpcBridge = async (effects: T.Effects) => {
  const backend = await selectedBackend(effects)
  const { rpcHostId: hostId, rpcPort: internalPort } =
    backends[backend].endpoints
  return sdk.host
    .getBridgeAddress(effects, {
      packageId: backend,
      hostId,
      internalPort,
      ssl: false,
    })
    .const()
}

// The indexers are optional dependencies this package does not depend on at
// the npm level, so their host ids are string literals rather than imported
// constants. All of them bind the plaintext Electrum port 50001; the electrs
// packages group it under host `electrum`, the fulcrum packages under `main`.
// Checked against electrs-pruned-startos (`electrumHostId`, startos/utils.ts)
// and fulcrum-pruned-startos (`mainHostId`, startos/utils.ts); recheck them
// whenever one of those packages changes its interfaces.
const INDEXER_HOSTS: Record<Indexer, { packageId: string; hostId: string }> = {
  electrs: { packageId: 'electrs', hostId: 'electrum' },
  'electrs-pruned': { packageId: 'electrs-pruned', hostId: 'electrum' },
  fulcrum: { packageId: 'fulcrum', hostId: 'main' },
  'fulcrum-pruned': { packageId: 'fulcrum-pruned', hostId: 'main' },
}
const electrumPort = 50001

/**
 * The selected indexer's plaintext Electrum bridge address (`<osIp>:<port>`),
 * `null` while the indexer is absent. Each of these packages binds the port
 * with `secure: null` and an `addSsl`, which publishes a plaintext and a TLS
 * address on the bridge, so `ssl: false` is what selects the right one.
 */
export const electrumBridge = (effects: T.Effects, indexer: Indexer) => {
  const { packageId, hostId } = INDEXER_HOSTS[indexer]
  return sdk.host
    .getBridgeAddress(effects, {
      packageId,
      hostId,
      internalPort: electrumPort,
      ssl: false,
    })
    .const()
}

/**
 * LND's REST bridge address (`<osIp>:<port>`). LND terminates its own TLS
 * against the mounted `tls.cert`, so the caller prefixes `https://`. `null`
 * until LND's REST binding publishes at wallet unlock; the caller then passes
 * no URL and the Lightning pages stay off until it does.
 */
export const lndRestBridge = (effects: T.Effects, packageId: LndPackage) =>
  sdk.host
    .getBridgeAddress(effects, {
      packageId,
      hostId: controlHostId,
      internalPort: restPort,
    })
    .const()

// ---- Bounded health checks ----

type Result = healthFns.HealthCheckResult

/**
 * How long one run of a health check may take before it is treated as
 * unanswered. Grading reads `status.json` from the data volume, and Web
 * Interface reads /proc/net under the SDK's own one-second limit; neither runs
 * a command or calls the app, so both answer in milliseconds and a minute only
 * ever runs out on a call that is not coming back. It is not a limit on
 * Cesspool: nothing is killed.
 */
export const CHECK_TIMEOUT_MS = 60_000

/**
 * How many runs in a row may go unanswered while the check keeps showing its
 * last real result. Anything but `success` pauses every daemon that
 * `requires` the check, so one slow answer must not stop them; a check
 * that stays unanswered must still say so.
 */
export const STALE_REPEATS = 2

/**
 * Wrap a health check's `fn` so a run that never returns cannot wedge it.
 *
 * Why this exists: start-sdk's `HealthDaemon.runHealthCheckLoop` awaits `fn()`
 * with no limit and only looks at its abort signal once `fn()` returns. When a
 * service stops, `Daemons` terms entries in reverse dependency order (`_term`,
 * and `stopEntries` when it reconciles), every check before the daemon it
 * requires, and each term waits for that loop to end. So one `fn()` that
 * never returns freezes its check at "Starting" for the life of the service,
 * and later blocks every stop, update and restart. In Bitcoin Knots (BLAKE2b)
 * Companion that left the node running while an update sat at "Installing
 * 80%" and the OS Restart hung (knots-blake2b-startos#4), where the stuck run
 * was a `SubContainer.exec` waiting, without a limit, for its file mounts.
 * Neither check here runs a command, but a read of a volume can still stall,
 * and each daemon's check must end before that daemon is signalled.
 *
 * At most one run is outstanding. If the previous one is still pending when
 * the check fires again, this waits on that run again rather than starting
 * another, so a call that never returns costs one pending promise, not one a
 * minute. A run that finishes after it was given up on keeps its result for
 * the next call, which returns it rather than starting over, so a check that
 * always takes a little longer than the bound still reports.
 */
export function bounded(
  fn: () => Result | Promise<Result>,
  onTimeout: () => Result,
  ms: number = CHECK_TIMEOUT_MS,
): () => Promise<Result> {
  let inFlight: Promise<Result> | null = null
  let abandoned: Promise<Result> | null = null
  let late: Result | null = null
  let last: Result | null = null
  let misses = 0

  return async () => {
    if (!inFlight && late) {
      const res = late
      late = null
      misses = 0
      last = res
      return res
    }
    if (!inFlight) {
      const run = Promise.resolve()
        .then(fn)
        .finally(() => {
          if (inFlight === run) inFlight = null
        })
      inFlight = run
      run.then(
        (res) => {
          if (abandoned === run) late = res
        },
        () => {},
      )
    }

    let timer: ReturnType<typeof setTimeout> | undefined
    const timedOut = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), ms)
    })
    const current = inFlight
    try {
      // The race also handles the run, so if it is abandoned here and rejects
      // later there is no unhandled rejection to take down the runtime.
      const res = await Promise.race([current, timedOut])
      if (res !== null) {
        // Answered here, so it is not kept for the next call as well.
        if (abandoned === current) abandoned = late = null
        misses = 0
        last = res
        return res
      }
    } catch (e) {
      // A thrown fn is the SDK's to report, exactly as before.
      misses = 0
      last = null
      throw e
    } finally {
      clearTimeout(timer)
    }

    abandoned = current
    misses += 1
    console.warn(
      `health check run unanswered after ${ms / 1000}s (${misses} in a row)`,
    )
    if (last && misses <= STALE_REPEATS) return last
    return onTimeout()
  }
}

// What a health check shows when a run of it has not finished in time:
// starting, never failure, so a slow answer does not read as a fault. The
// check shows its result again once that run finishes.
export const unanswered = () => ({
  result: 'starting' as const,
  message: i18n('This check has not finished after a minute'),
})
