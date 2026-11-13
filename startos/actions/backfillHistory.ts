import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  enabled: Value.toggle({
    name: i18n('Rebuild Pruned History'),
    description: i18n(
      'When on, and an indexer is chosen under Select Indexer, Cesspool rebuilds the blocks your pruned node has discarded, newest first, and grades them. Each transaction an old block spends from has to be fetched through the indexer, which in turn may fetch an old block from the Bitcoin network for it. On the SHA256 chain a block spends from several thousand earlier transactions, and rebuilding one took from half an hour to an hour and a half on a small server, so it fills a short gap but cannot build a long history there. It uses bandwidth for as long as it runs. New blocks always come first. Turning it off keeps everything already graded.',
    ),
    default: true,
  }),
})

export const backfillHistory = sdk.Action.withInput(
  'backfill-history',

  {
    name: i18n('Backfill History'),
    description: i18n(
      'Turn the rebuilding of blocks below a pruned node’s prune height on or off. It has no effect without an indexer, or beside an archival node, which has every block.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  },

  inputSpec,

  async ({ effects }) => ({
    enabled: (await storeJson.read((s) => s?.backfill).const(effects)) ?? true,
  }),

  async ({ effects, input }) =>
    storeJson.merge(effects, { backfill: input.enabled }),
)
