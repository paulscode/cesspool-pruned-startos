import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'cesspool-pruned',
  title: 'Cesspool Pruned',
  // Upstream cesspool is MIT (jasonsopko/cesspool 5463865, 2026-11-12), and so are
  // this wrapper and the fork it packages.
  license: 'MIT',
  packageRepo: 'https://github.com/paulscode/cesspool-pruned-startos',
  upstreamRepo: 'https://github.com/jasonsopko/cesspool',
  marketingUrl: 'https://cesspool.lol',
  donationUrl: null,
  description: { short, long },
  // StartOS 0.4.0.2, as Mempool Pruned declares and for the same reason: the
  // Bitcoin Knots (pre-RDTS) floor in `backends.ts` cannot be installed below it.
  osVersion: '0.4.0.2',
  // `data` holds every graded block and the rendered site, and is large; it is
  // left out of backups (backups.ts). `startos` holds store.json alone.
  volumes: ['data', 'startos'],
  images: {
    cesspool: {
      // The application's image, from paulscode/cesspool-pruned's
      // publish-image.yml, for amd64 and arm64. A bump starts there; see
      // UPDATING.md.
      source: {
        dockerTag: 'ghcr.io/paulscode/cesspool-pruned:v0.1.0-pruned.1',
      },
      arch: ['x86_64', 'aarch64'],
      // Never run this image under emulation. Left unset, emulateMissing
      // defaults to true and buildManifest then drops the architecture
      // requirement, so the package would offer itself to a riscv64 server and
      // run the checker there under emulation, which nobody has tested.
      emulateMissing: false,
    },
  },
})
