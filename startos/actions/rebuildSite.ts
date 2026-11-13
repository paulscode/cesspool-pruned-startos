import { writeFile } from 'fs/promises'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { rebuildRequest } from '../utils'

export const rebuildSite = sdk.Action.withoutInput(
  'rebuild-site',

  async () => ({
    name: i18n('Rebuild Site'),
    description: i18n(
      'Render every page again from the records already stored. Nothing is fetched or graded again. Use it if pages look out of date or incomplete, for example after an interrupted update. It can take a while when many blocks are stored, and new blocks wait until it is done.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  // A request left on the volume, not work done here: the updater owns the
  // site and the lock on it, and picks the request up before its next update
  // (cesspool-pruned: tools/serve.py). Run while stopped, it is picked up at
  // the next start.
  async () => {
    await writeFile(rebuildRequest, '')
    return {
      version: '1',
      title: i18n('Rebuild Requested'),
      message: i18n(
        'Cesspool will render every page again, starting within a minute if it is running, or when it is next started.',
      ),
      result: null,
    }
  },
)
