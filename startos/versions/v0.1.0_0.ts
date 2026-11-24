import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

const notes = `The first release of Cesspool Pruned: cesspool.lol on your own server, from your own node.

It grades every block for spam with the policy code of Bitcoin Knots and Plumb, names the pool that mined each one, and serves the result as a site. It works with a pruned node and on either chain, SHA256 or BLAKE2b, and finds out which by asking the node.

It starts at the newest blocks and fills in older ones behind them. Beside a pruned node, history starts at the oldest block the node kept, unless you choose Electrs Pruned or Fulcrum Pruned under Select Indexer, which lets older blocks be rebuilt, slowly.

Storage Limit sets how much disk the graded blocks may take, 50 GB unless you change it. A block takes about 0.6 MB on the BLAKE2b chain and about 8 MB on the SHA256 chain.`

export const v_0_1_0_0 = VersionInfo.of({
  version: '0.1.0:0',
  releaseNotes: {
    en_US: notes,
    es_ES: notes,
    de_DE: notes,
    pl_PL: notes,
    fr_FR: notes,
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
