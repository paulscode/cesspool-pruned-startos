import {
  defaultStorageLimit,
  StorageLimit,
  storageLimits,
  storeJson,
} from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

const { InputSpec, Value } = sdk

// Select keys are strings; the store holds the number.
const key = (gb: StorageLimit) => String(gb)
const label = (gb: StorageLimit) =>
  gb === 0 ? i18n('No limit') : i18n('${gb} GB', { gb })

const inputSpec = InputSpec.of({
  limit: Value.select({
    name: i18n('Storage Limit'),
    description: i18n(
      'The most disk space the graded blocks of one chain may take. A block with its records and pages takes about 0.6 MB on the BLAKE2b chain and about 8 MB on the SHA256 chain, where blocks are full: over 1 GB a day. History fills in, newest first, until the limit is reached. From then on the oldest block is dropped as each new one arrives, and the site says which block its history starts at. Raising the limit lets older blocks fill in again. Each chain has its own history and its own limit.',
    ),
    values: Object.fromEntries(
      storageLimits.map((gb) => [key(gb), label(gb)]),
    ) as Record<string, string>,
    default: key(defaultStorageLimit),
  }),
})

export const storageLimit = sdk.Action.withInput(
  'storage-limit',

  {
    name: i18n('Storage Limit'),
    description: i18n(
      'Set how much disk space the graded blocks of a chain may take before the oldest are dropped',
    ),
    warning: i18n(
      'Lowering the limit below what is stored now drops the oldest blocks until it fits. With an archival node, or an indexer, they can be graded again later; below a pruned node’s blocks with no indexer, they cannot.',
    ),
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  },

  inputSpec,

  async ({ effects }) => ({
    limit: key(
      (await storeJson.read((s) => s?.storageLimitGb).const(effects)) ??
        defaultStorageLimit,
    ),
  }),

  async ({ effects, input }) => {
    const gb = storageLimits.find((x) => key(x) === input.limit)
    if (gb === undefined)
      throw new Error(`Unknown storage limit ${input.limit}`)
    await storeJson.merge(effects, { storageLimitGb: gb })
  },
)
