# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

**Start every task at the recipe index** — `../start-technologies/projects/start-sdk/docs/src/recipes.md`
(or <https://docs.start9.com/packaging/recipes.html>). It maps an intent ("prompt the user to create
admin credentials", "expose a web UI") to the constructs, the reference pages, and a named production
package to copy. Find the recipe before you read this package's neighbours: a package you reach by
grepping may be non-conformant, and the recipe outranks it.

Keep `README.md` (technical reference for an AI support or administering agent) and
`instructions.md` (end-user docs) in sync with your changes. This file restates neither:
whoever changes the package has both, so it carries only what they don't — repo mechanics,
a change that looks right and is not, where the next thing gets added, a naming trap, a
build or test invocation particular to this repo.

**Fix a defect you spot rather than reporting it** — you have the package open and the
context to be sure. File **a GitHub issue on this repo** only when the call isn't yours to
make: you can't pin the cause down, two defensible fixes exist, or it's too large to ride on
the work in hand. An open issue is a report, not a queue — implement one when you're asked
to or when it's labelled `Approved`, then close it with `Closes #<n>`.

Don't record work in the repo instead: no `TODO.md`, no `NOTES.md`, no `PLAN.md`. What you
verified, tried, and decided belongs in the commit message and the PR body.

## This repo

- **Publishing needs the owner's go-ahead each time.** Upstream cesspool is MIT since 5463865 (2026-11-12), so the licence no longer blocks it, but a `git push`, a registry publish or a GitHub release is still the owner's call, every time. `LICENSE` and the manifest's `license` say the same and change together.
- **The image is pulled, not built here.** `startos/manifest/index.ts` names `ghcr.io/paulscode/cesspool-pruned:<tag>`, which the application repository's `publish-image.yml` builds. A change to the application reaches this package only through a new tag there; see `UPDATING.md`.
- **`make install` is refused by a server on StartOS 0.4.1 or later.** Such a server takes a sideload only from a signer it trusts, and an s9pk packed here is signed with the workspace build key (`../.startos/build.key.pem`), which is not the identity key a server has been told to trust. Installing needs a start-cli new enough to endorse the file with the identity key (`start-cli s9pk sign`) or to pass `--trust`, or the build key added to the server's trusted keys. All three are the owner's call, not an agent's.
- **The chain is not a setting, and must not become one.** The app asks the node for block 961640 and keeps each chain's state apart (`/data/<chain>`). Nothing in `store.json` may record a chain: it would be wrong the moment Select Node points at a node on the other one.
- **The app is configured by environment only.** `main.ts` builds it from `store.json` and the bridge addresses; there is no config file to model. A new app setting is a `store.json` field, an action, and one line in `main.ts`'s `env`.
- **Resolve addresses in `main.ts`, never store them.** Each is a `.const` read of the chosen package's bridge binding. A package that is not installed resolves to `null` and gets no variable: the app then reports what it is waiting for.
- **Health-check ids and indexer host ids are literals**, in `dependencies.ts` and `utils.ts`, because none of those packages exports them. A wrong id shows a permanent "Required health check not passing". Recheck them against each package's `main.ts` and `interfaces.ts` whenever one changes; the list of what was checked is in `dependencies.ts`.
- **`backends.ts` is Mempool Pruned's, kept the same on purpose.** Change the two together.
- **The updater's health message is the app's own sentence**, read from `/data/status.json`, not an `i18n` string. It names the chain, which this package cannot know.
- **`startos/i18n/dictionaries/default.ts` is generated.** After adding or changing an `i18n('...')` string, run `python3 <workspace>/gen-i18n-dict.py .` (a copy is in `/mnt/Black/fulcrum-pruned/packaging/`). `translations.ts` stays empty until someone translates; the script re-indexes, which is safe only while it is.
- **Both daemons run as root.** The updater reads the node's cookie (mode 0600 in the node's volume) and writes a root-owned volume; nginx's workers drop to `nobody` and read what the updater wrote world-readable. The image's own default user (1000) is for Umbrel.
