import { FileHelper, z } from '@start9labs/start-sdk'
import { BackendId, backendIds, defaultBackend } from '../backends'
import { sdk } from '../sdk'

/**
 * The disk ceilings Storage Limit offers, in GB. 0 is no limit.
 *
 * A number, not a free field, because the cost of a block is fixed by the
 * chain (about 0.6 MB on the BLAKE2b chain, about 8 MB on the SHA256 chain) and
 * a ceiling too small to hold two days of blocks does nothing: the app always
 * keeps the newest 288.
 */
export const storageLimits = [10, 25, 50, 100, 250, 500, 0] as const
export type StorageLimit = (typeof storageLimits)[number]
export const defaultStorageLimit: StorageLimit = 50

export const indexers = [
  'electrs',
  'electrs-pruned',
  'fulcrum',
  'fulcrum-pruned',
] as const
export type Indexer = (typeof indexers)[number]
export type IndexerChoice = Indexer | 'none'

export const lightningChoices = [
  'lnd',
  'lightning-fork',
  'cln',
  'none',
] as const
export type LightningChoice = (typeof lightningChoices)[number]

// Everything the user has chosen. Cesspool has no config file of its own: it
// takes its settings from the environment, which `main.ts` builds from this.
// Each field is intent; the addresses the choices resolve to are read from the
// chosen package's bridge binding at start and never stored, so nothing here
// can go stale.
//
// Every field `.catch()`es to its default rather than being optional, so an
// absent or unreadable store still yields a complete answer.
const shape = z.looseObject({
  /** Which Bitcoin service to read blocks from. The chain is not stored: the app asks the node. */
  backend: z
    .enum(backendIds as [BackendId, ...BackendId[]])
    .catch(defaultBackend),
  /**
   * The Electrum server that lets history below a pruned node's blocks be
   * rebuilt. 'none' is a complete answer here, unlike in Mempool Pruned:
   * Cesspool grades every block the node still has without one.
   */
  indexer: z.enum([...indexers, 'none']).catch('none'),
  /** Whether to rebuild that history when an indexer is selected. */
  backfill: z.boolean().catch(true),
  /** Disk ceiling for a chain's blocks and pages, in GB; 0 for none. */
  storageLimitGb: z
    .union([
      z.literal(10),
      z.literal(25),
      z.literal(50),
      z.literal(100),
      z.literal(250),
      z.literal(500),
      z.literal(0),
    ])
    .catch(defaultStorageLimit),
  /** The Lightning node whose view of the public channel graph the Lightning pages show. */
  lightning: z.enum(lightningChoices).catch('none'),
})

export const storeJson = FileHelper.json(
  { base: sdk.volumes.startos, subpath: '/store.json' },
  shape,
)
