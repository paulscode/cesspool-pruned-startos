import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { selectedLightning } from '../utils'

const { InputSpec, Value } = sdk

// Mempool Pruned's action, with the choice held in one store.json field: that
// package splits it between Mempool's own config file and the store, and
// Cesspool has no config file.
export const lightningInputSpec = InputSpec.of({
  lightning: Value.select({
    name: i18n('Lightning Node'),
    description: i18n(
      '- LND: the Lightning pages show the public channel graph as LND on this server sees it.\n- Lightning Fork (BLAKE2b): the same, from Lightning Fork on this server. It follows the BLAKE2b chain, and cannot be chosen while Cesspool reads the SHA256 chain through the SHA256 Companion.\n- Core Lightning: the same, from Core Lightning on this server.\n- None: there are no Lightning pages.\nOnly public information is read: nodes, channels and their fee policies. Cesspool never reads your balances, payments or private channels. The Lightning node must use the same Bitcoin node as Cesspool.',
    ),
    default: 'none',
    values: {
      lnd: i18n('LND'),
      'lightning-fork': i18n('Lightning Fork (BLAKE2b)'),
      cln: i18n('Core Lightning'),
      none: i18n('None'),
    },
  }),
})

export const enableLightning = sdk.Action.withInput(
  'enable-lightning',

  {
    name: i18n('Enable Lightning'),
    description: i18n(
      'Choose the Lightning node whose view of the public Lightning network the Lightning pages show',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  },

  lightningInputSpec,

  async ({ effects }) => ({ lightning: await selectedLightning(effects) }),

  async ({ effects, input }) => {
    // Lightning Fork's graph is the Bitcoin BLAKE2b chain's: its channels are
    // funded there, so beside blocks of the SHA256 chain none of them would
    // match a transaction Cesspool has.
    if (input.lightning === 'lightning-fork') {
      const backend = await storeJson.read((s) => s?.backend).once()
      if (backend === 'knots-prerdts') {
        throw new Error(
          i18n(
            'Lightning Fork follows the Bitcoin BLAKE2b chain, and Cesspool reads the SHA256 chain through the SHA256 Companion. Choose a node on the BLAKE2b chain under Select Node first.',
          ),
        )
      }
    }
    await storeJson.merge(effects, { lightning: input.lightning })
  },
)
