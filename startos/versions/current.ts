import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

const notes = `Stopping, updating and restarting Cesspool Pruned can no longer be held up by a status check that never finishes.

A check still unanswered after a minute now says so, and no longer keeps the service from stopping. The same problem made Bitcoin Knots (BLAKE2b) Companion updates hang at "Installing 80%" before its 29.5.0:1.

Nothing you have set changes, and nothing is graded again.`

export const current = VersionInfo.of({
  version: '0.1.0:1',
  releaseNotes: {
    en_US: notes,
    es_ES: notes,
    de_DE: notes,
    pl_PL: notes,
    fr_FR: notes,
  },
  migrations: {
    // Nothing to migrate: only how the health checks are run changed.
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
