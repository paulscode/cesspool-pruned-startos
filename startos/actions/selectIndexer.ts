import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { selectedIndexer } from '../utils'

const { InputSpec, Value } = sdk

// Mempool Pruned's list of indexers, for a different job. There the indexer
// answers address lookups and the choice is forced on install. Here Cesspool
// works without one: it grades every block the node still has. An indexer adds
// one thing, the transactions that blocks below a pruned node's prune height
// spend from, so those blocks can be rebuilt and graded too. So the default is
// None, nothing is forced, and each option says what it does for that job.
const indexerInputSpec = InputSpec.of({
  indexer: Value.select({
    name: i18n('Select Indexer'),
    description: i18n(
      '- None: Cesspool grades every block your node still has. Beside a pruned node, history starts at the oldest block the node kept.\n- Electrs Pruned: lets Cesspool rebuild and grade blocks your pruned node has already discarded.\n- Fulcrum Pruned: the same, through Fulcrum Pruned.\n- Fulcrum: works only beside an archival node, where no block is missing and Cesspool never needs to ask it anything.\n- Electrs: the same as Fulcrum.\nThe indexer you choose must be installed and running on this server, and must use the same Bitcoin node as Cesspool.',
    ),
    values: {
      none: i18n('None'),
      'electrs-pruned': i18n('Electrs Pruned (works with a pruned node)'),
      'fulcrum-pruned': i18n('Fulcrum Pruned (works with a pruned node)'),
      fulcrum: i18n('Fulcrum'),
      electrs: i18n('Electrs'),
    },
    default: 'none',
  }),
})

export const selectIndexer = sdk.Action.withInput(
  'select-indexer',

  {
    name: i18n('Select Indexer'),
    description: i18n(
      'Choose an Electrum server that lets Cesspool grade blocks a pruned node has already discarded, or None.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  },

  indexerInputSpec,

  async ({ effects }) => ({ indexer: await selectedIndexer(effects) }),

  // Recorded as intent; main.ts resolves the indexer's bridge address at start.
  async ({ effects, input }) =>
    storeJson.merge(effects, { indexer: input.indexer }),
)
