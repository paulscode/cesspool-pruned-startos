# Updating the upstream version

Cesspool Pruned ships as one image, built from this package's application repository, [`paulscode/cesspool-pruned`](https://github.com/paulscode/cesspool-pruned): upstream [cesspool](https://github.com/jasonsopko/cesspool) plus the changes that let it run on someone's own server, beside a pruned node, on either chain. Upstream publishes no image and no version numbers, so "upstream" for this package means that repository, and a bump is a change there first and here second.

The image carries three more pinned things, all set in that repository's `docker/Dockerfile`: the Plumb release the verdicts come from (`PLUMB_TAG`, which must equal `PLUMB_TAG` in `cesspool/site.py`; the build stops when they differ), reorg-watch (`REORG_WATCH_COMMIT`), and the two mining pool lists under `docker/pools/`.

## Determining the upstream version

The application repository tags its releases `v<x.y.z>-pruned.<n>`; this package's version is `<x.y.z>:<downstream>`.

```sh
git -C ../../cesspool-pruned tag --list 'v*-pruned.*' --sort=-v:refname | head -3
git -C ../../cesspool-pruned log -1 --format=%h upstream/master   # what upstream has moved to
```

The pin lives in `startos/manifest/index.ts` at `images.cesspool.source`: `dockerTag: 'ghcr.io/paulscode/cesspool-pruned:v<x.y.z>-pruned.<n>'`. For a local build of an unpublished change, point it at `dockerBuild: { workdir: '../../cesspool-pruned', dockerfile: '../../cesspool-pruned/docker/Dockerfile' }` for the time being.

## Applying the bump

1. In the application repository, merge upstream, run `tools/since.py` (it rewords "since the fork" again where the merge brought new text), and when upstream moved `PLUMB_TAG`, move `PLUMB_TAG` and `PLUMB_COMMIT` in `docker/Dockerfile` with it. Refresh the pool lists under `docker/pools/` at the same time.
2. Tag the result `v<x.y.z>-pruned.<n>` and let its `publish-image.yml` workflow build the amd64 and arm64 image and push it to `ghcr.io/paulscode/cesspool-pruned`.
3. In `startos/manifest/index.ts`, set `images.cesspool.source` to that tag.
4. The Umbrel app in `paulscode/umbrel-store` pins the same image by digest; move it too.

A release that changes the grader (a new Plumb, or a change to the classifier) regrades every stored block by itself, newest first, between new blocks. Say so in the release notes: it takes a while and the pages change as it goes.

## Cutting a release of this package

1. Move the old `startos/versions/current.ts` to `startos/versions/v<old>.ts`, list it under `other` in `startos/versions/index.ts`, and write the new `current.ts` with its notes and any migration.
2. From the workspace root, `./release.sh cesspool-pruned-startos` builds the universal s9pk into `builds/<dotted version>/` beside an unsigned `SHA256SUMS`. It refuses a tree that differs from HEAD.
3. Sign `SHA256SUMS` on the air-gapped machine and put `SHA256SUMS.asc` beside it.
4. `./release.sh cesspool-pruned-startos --publish` pushes the branch and cuts the GitHub release. Then publish to the registry from its own repository.

GitHub Actions only type-checks (`.github/workflows/check.yml`); nothing is built or released there.
