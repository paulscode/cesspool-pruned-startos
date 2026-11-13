import { sdk } from '../sdk'
import { backfillHistory } from './backfillHistory'
import { enableLightning } from './enableLightning'
import { rebuildSite } from './rebuildSite'
import { selectBackend } from './selectBackend'
import { selectIndexer } from './selectIndexer'
import { storageLimit } from './storageLimit'

export const actions = sdk.Actions.of()
  .addAction(selectBackend)
  .addAction(selectIndexer)
  .addAction(backfillHistory)
  .addAction(storageLimit)
  .addAction(enableLightning)
  .addAction(rebuildSite)
