import { T } from '@start9labs/start-sdk'
import { BackendId, backends, versionRange } from './backends'
import { IndexerChoice, LightningChoice } from './fileModels/store.json'
import {
  bitcoindDescription,
  indexerDescription,
  lightningDescription,
} from './manifest/i18n'
import { sdk } from './sdk'
import { selectedBackend, selectedIndexer, selectedLightning } from './utils'

// There is deliberately no autoconfig task here: Cesspool asks nothing of the
// node's settings. It reads blocks over RPC with the coins they spend, which
// an archival node and a pruned one both answer for the blocks they still
// have. Pruning is permitted rather than tolerated; `txindex` is not needed.
//
// Every dependency is optional, and each is enabled by the choice stored for
// it: exactly one node flavor, chosen under Select Node, plus at most one
// indexer and at most one Lightning node. Declaring bitcoind required would
// demand the official package of someone running a companion node. Each
// `enabled` re-runs on its own when store.json changes, and only enabled
// entries are published to StartOS, so a switch moves the requirement from one
// id to the other.
//
// The health-check ids are literals, because no package exports them, and a
// wrong one shows a permanent "Required health check not passing" that nothing
// clears. Each was read from the package's own `main.ts`:
//   bitcoind, knots-prerdts   daemon `bitcoind`, check `sync-progress`
//   knots-blake2b             daemon `node`, check `chain`
//   electrs, electrs-pruned   daemon `electrs`, check `sync`
//   fulcrum, fulcrum-pruned   daemon `primary`, check `sync-progress`
//   lnd                       daemon `lnd`, check `sync-progress`
//   lightning-fork            the same, plus `chain-identity`
//   c-lightning               daemon `lightningd`, check `check-synced`

const backendIcons: Record<BackendId, string> = {
  bitcoind:
    'https://raw.githubusercontent.com/Start9Labs/bitcoin-core-startos/refs/heads/30.x/dep-icon.svg',
  'knots-prerdts':
    'https://raw.githubusercontent.com/paulscode/knots-prerdts-startos/main/dep-icon.png',
  'knots-blake2b':
    'https://raw.githubusercontent.com/paulscode/knots-blake2b-startos/main/dep-icon.png',
}

const backend = (id: BackendId) =>
  sdk.Dependency.optional(id, {
    description: bitcoindDescription,
    metadata: { title: backends[id].title, icon: backendIcons[id] },
    kind: 'running',
    versionRange: versionRange[id],
    healthChecks: [...backends[id].healthChecks],
    enabled: async ({ effects }) => (await selectedBackend(effects)) === id,
  })

const indexerEnabled =
  (id: IndexerChoice) =>
  async ({ effects }: { effects: T.Effects }) =>
    (await selectedIndexer(effects)) === id

const lightningEnabled =
  (id: LightningChoice) =>
  async ({ effects }: { effects: T.Effects }) =>
    (await selectedLightning(effects)) === id

// The four indexers, with Mempool Pruned's floors. Only the two Pruned ones can
// serve a transaction from a block the node has discarded, which is the one
// thing Cesspool asks an indexer for. The other two are offered because beside
// an archival node any of them works, and a user who already runs one should
// not be told to install another; there the app never needs to ask it anything.
const fulcrum = sdk.Dependency.optional('fulcrum', {
  description: indexerDescription,
  metadata: {
    title: 'Fulcrum',
    icon: 'https://raw.githubusercontent.com/Start9Labs/fulcrum-startos/master/icon.png',
  },
  kind: 'running',
  // Start9's floor, plus privkeyio's BLAKE2b build, which takes the `fulcrum` id
  // under the `#blake` flavor and so matches no unflavored range. Both run a
  // daemon `primary` with a `sync-progress` check and bind host `main`. Checked
  // with the SDK's comparator:
  //   2.1.1:8        vs this range => true     2.1.1:7        => false
  //   #blake:2.1.4:0 vs this range => true     #blake:2.1.3:0 => false
  versionRange: '>=2.1.1:8 || >=#blake:2.1.4:0',
  healthChecks: ['primary', 'sync-progress'],
  enabled: indexerEnabled('fulcrum'),
})

const electrs = sdk.Dependency.optional('electrs', {
  description: indexerDescription,
  metadata: {
    title: 'Electrs',
    icon: 'https://raw.githubusercontent.com/Start9Labs/electrs-startos/refs/heads/master/icon.svg',
  },
  kind: 'running',
  versionRange: '>=0.11.1:11',
  healthChecks: ['electrs', 'sync'],
  enabled: indexerEnabled('electrs'),
})

const electrsPruned = sdk.Dependency.optional('electrs-pruned', {
  description: indexerDescription,
  metadata: {
    title: 'Electrs Pruned',
    icon: 'https://raw.githubusercontent.com/paulscode/electrs-pruned-startos/master/dep-icon.png',
  },
  kind: 'running',
  versionRange: '>=0.11.1:24',
  healthChecks: ['electrs', 'sync'],
  enabled: indexerEnabled('electrs-pruned'),
})

// 2.1.4:1 is the first build that speaks Electrum protocol 1.8, which a server
// on the BLAKE2b chain requires and Cesspool offers beside 1.4.
const fulcrumPruned = sdk.Dependency.optional('fulcrum-pruned', {
  description: indexerDescription,
  metadata: {
    title: 'Fulcrum Pruned',
    icon: 'https://raw.githubusercontent.com/paulscode/fulcrum-pruned/master/dep-icon.png',
  },
  kind: 'running',
  versionRange: '>=2.1.4:1',
  healthChecks: ['primary', 'sync-progress'],
  enabled: indexerEnabled('fulcrum-pruned'),
})

const lnd = sdk.Dependency.optional('lnd', {
  description: lightningDescription,
  metadata: {
    title: 'LND',
    icon: 'https://raw.githubusercontent.com/Start9Labs/lnd-startos/refs/heads/master/icon.svg',
  },
  kind: 'running',
  versionRange: '>=0.21.1-beta:4',
  healthChecks: ['lnd', 'sync-progress'],
  enabled: lightningEnabled('lnd'),
})

// Lightning Fork also answers whether its node is on the BLAKE2b chain: waited
// on too, since its graph means nothing beside blocks of another chain.
const lightningFork = sdk.Dependency.optional('lightning-fork', {
  description: lightningDescription,
  metadata: {
    title: 'Lightning Fork',
    icon: 'https://raw.githubusercontent.com/paulscode/lightning-fork-startos/master/icon.png',
  },
  kind: 'running',
  versionRange: '>=0.21.3-beta.16:0',
  healthChecks: ['lnd', 'sync-progress', 'chain-identity'],
  enabled: lightningEnabled('lightning-fork'),
})

const cln = sdk.Dependency.optional('c-lightning', {
  description: lightningDescription,
  metadata: {
    title: 'Core Lightning',
    icon: 'https://raw.githubusercontent.com/Start9Labs/cln-startos/refs/heads/master/icon.svg',
  },
  kind: 'running',
  versionRange: '>=26.6.6:1',
  healthChecks: ['lightningd', 'check-synced'],
  enabled: lightningEnabled('cln'),
})

export const dependencies = sdk.Dependencies.of()
  .addDependency(backend('bitcoind'))
  .addDependency(backend('knots-prerdts'))
  .addDependency(backend('knots-blake2b'))
  .addDependency(electrs)
  .addDependency(electrsPruned)
  .addDependency(fulcrum)
  .addDependency(fulcrumPruned)
  .addDependency(lightningFork)
  .addDependency(cln)
  .addDependency(lnd)
