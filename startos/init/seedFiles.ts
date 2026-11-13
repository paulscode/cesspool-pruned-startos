import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'

// Write store.json with its defaults when it is not there, so that every
// reader finds a whole file. An empty merge keeps whatever is already set.
export const seedFiles = sdk.setupOnInit(async (effects) => {
  await storeJson.merge(effects, {})
})
