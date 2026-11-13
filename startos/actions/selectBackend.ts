import { backends, defaultBackend } from '../backends'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

const { InputSpec, Value } = sdk

/**
 * Which bitcoind flavor this package reads.
 *
 * `dependencies.ts` declares each as an optional dependency and enables exactly
 * one, so the UI shows a single node dependency and does not nag about the
 * flavors the user is not running.
 */
const backendInputSpec = InputSpec.of({
  backend: Value.select({
    name: i18n('Select Node'),
    description: i18n(
      'Which Bitcoin service Cesspool reads blocks from. The node may be pruned. Cesspool finds out for itself which chain the node is on, SHA256 or BLAKE2b.',
    ),
    values: Object.fromEntries(
      Object.entries(backends).map(([id, b]) => [id, b.title]),
    ) as Record<string, string>,
    default: defaultBackend,
  }),
})

export const selectBackend = sdk.Action.withInput(
  'select-backend',

  {
    name: i18n('Select Node'),
    description: i18n(
      'Choose which Bitcoin service Cesspool grades blocks from',
    ),
    warning: i18n(
      'Switching nodes may switch chains. Each chain keeps its own graded history, and nothing is deleted: switching back picks up where that chain left off.',
    ),
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  },

  backendInputSpec,

  async ({ effects }) => ({
    backend: ((await storeJson.read((s) => s?.backend).const(effects)) ??
      defaultBackend) as any,
  }),

  // Recorded as intent. The address it resolves to is read from the selected
  // package's bridge at start, by bitcoindRpcBridge, so nothing here writes an
  // address that could go stale.
  async ({ effects, input }) => {
    // The reverse of the check in Enable Lightning: Lightning Fork's channels
    // are funded on the BLAKE2b chain, which the SHA256 Companion does not
    // follow.
    if (input.backend === 'knots-prerdts') {
      const lightning = await storeJson.read((s) => s?.lightning).once()
      if (lightning === 'lightning-fork') {
        throw new Error(
          i18n(
            'Lightning Fork, the Lightning node chosen under Enable Lightning, follows the Bitcoin BLAKE2b chain, and the SHA256 Companion follows the SHA256 chain. Choose another Lightning node, or None, under Enable Lightning first.',
          ),
        )
      }
    }
    await storeJson.merge(effects, { backend: input.backend as any })
  },
)
