import { sdk } from './sdk'

// The `startos` volume only: store.json, the choices made under this package's
// actions. The `data` volume is left out on purpose. It holds every graded
// block and the rendered site, which is tens of gigabytes, and all of it comes
// from the node: after a restore the app grades again from the tip and fills
// history in behind it. What it cannot get back is history below a pruned
// node's blocks when no indexer is selected; instructions.md says so.
export const { createBackup, restoreInit } = sdk.setupBackups(async () =>
  sdk.Backups.ofVolumes('startos'),
)
