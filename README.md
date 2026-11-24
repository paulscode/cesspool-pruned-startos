<p align="center">
  <img src="icon.png" alt="Cesspool Pruned Logo" width="21%">
</p>

# Cesspool Pruned on StartOS

> Everything not listed in this document should behave the same as upstream
> cesspool. If a feature, setting, or behavior is not mentioned here, the
> upstream documentation is accurate and fully applicable — see the
> Documentation section of `instructions.md` for links.

[cesspool](https://github.com/jasonsopko/cesspool) is the software behind cesspool.lol: it runs every transaction of every block through the policy code of Bitcoin Knots and Plumb, grades each block for spam, and renders the result as a static site. Upstream is one public site, fed by one archival node on the BLAKE2b chain. This package runs a build of it, [Cesspool Pruned](https://github.com/paulscode/cesspool-pruned), on your own server: beside a pruned node, on either chain, with the node, the indexer and the Lightning node chosen by actions.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

One image, `cesspool`, runs as two daemons. Upstream has no image: it is a set of Python scripts run from cron on the author's server, with nginx beside them.

| Daemon    | Command                  | What it does                                                                                                  |
| --------- | ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `updater` | `/app/docker/updater.sh` | Waits for the node, asks it which chain it is on, fetches and grades blocks, renders the site into the volume |
| `web`     | `/app/docker/web.sh`     | nginx on port 8080, serving what the updater rendered; a "starting" page until the first build exists         |

- **Architectures:** x86_64 and aarch64, never emulated.
- **User:** both daemons run as root. The updater has to read the node's RPC cookie, which is mode 0600 in the node's volume. nginx's workers drop to `nobody`.
- **The checker** is a binary compiled from the Plumb source tree at the release the site names; it runs the node's own policy code on each transaction. It is part of the image, and the pages name the release.
- **No outbound traffic.** The updater talks to the Bitcoin node, and to the indexer and Lightning node when those are selected, all over the server's internal bridge. The mining pool lists (one per chain) and the fonts are in the image, and upstream's periodic download of the pool list is turned off.

The updater is configured by environment variables alone, which `main.ts` builds on every start from `store.json` and the selected packages' bridge addresses. There is no config file.

## Volume and Data Layout

Two volumes. Everything the app writes is on `data`, kept apart per chain so that pointing the app at a node on the other chain never mixes two chains' blocks.

| Volume    | Mounted at                                    | Holds                                          | Backed up |
| --------- | --------------------------------------------- | ---------------------------------------------- | --------- |
| `data`    | `/data` (updater, read-write; web, read-only) | Graded blocks and the rendered site, per chain | No        |
| `startos` | not mounted                                   | `store.json`                                   | Yes       |

Inside `data`:

| Path                              | What                                                                                                     |
| --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `<chain>/raw/`                    | Each graded block as the node returned it, with the coins it spends, gzipped                             |
| `<chain>/blocks/`, `<chain>/txd/` | One record per block: the grade and findings, and a line per transaction                                 |
| `<chain>/coverage.json`           | Which blocks are graded, the gaps, the node's prune height, why history is not filling in when it is not |
| `www/<chain>/`                    | The rendered site for that chain                                                                         |
| `www/current`                     | A link to the chain being graded now; nginx serves it                                                    |
| `status.json`                     | Where the updater stands; the health check reads it                                                      |
| `rebuild`                         | Left by the Rebuild Site action; removed by the updater when it has rendered every page again            |

`<chain>` is `blake2b` or `sha256`. A block costs about 0.6 MB on the BLAKE2b chain and about 8 MB on the SHA256 chain, where blocks are full, split roughly as: stored block 40%, per-transaction records and their published copy 45%, the rest the block record and page.

The selected node's `main` volume is mounted read-only at `/mnt/bitcoind`, for the cookie only. With Lightning on, LND's or Lightning Fork's `main` volume is mounted read-only at `/mnt/lnd`, or Core Lightning's `bitcoin` subdirectory at `/mnt/cln`.

## File Models

One file model, `store.json` on the `startos` volume. It is StartOS-level state: the choices made under the actions. The app never reads it; `main.ts` turns it into environment variables.

| Field            | Values                                                           | Default    | Written by       |
| ---------------- | ---------------------------------------------------------------- | ---------- | ---------------- |
| `backend`        | `bitcoind`, `knots-prerdts`, `knots-blake2b`                     | `bitcoind` | Select Node      |
| `indexer`        | `none`, `electrs-pruned`, `fulcrum-pruned`, `fulcrum`, `electrs` | `none`     | Select Indexer   |
| `backfill`       | `true`, `false`                                                  | `true`     | Backfill History |
| `storageLimitGb` | `10`, `25`, `50`, `100`, `250`, `500`, `0` (no limit)            | `50`       | Storage Limit    |
| `lightning`      | `none`, `lnd`, `lightning-fork`, `cln`                           | `none`     | Enable Lightning |

It is seeded with its defaults on every init, and a field that is missing or unreadable reads as its default. A hand edit survives until the next action that writes the same field. The chain is not in it: the app asks the node.

## Dependencies

Every dependency is optional and enabled by the choice stored for it, so exactly one node is required at a time, and an indexer or a Lightning node only when one is selected. All are `running` dependencies with health checks.

| Package          | Enabled when                          | Used for                                                                                            |
| ---------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `bitcoind`       | Select Node = Bitcoin Knots (default) | Blocks over RPC; `main` volume mounted for the cookie                                               |
| `knots-prerdts`  | Select Node = SHA256 Companion        | The same                                                                                            |
| `knots-blake2b`  | Select Node = BLAKE2b Companion       | The same                                                                                            |
| `electrs-pruned` | Select Indexer                        | Transactions that discarded blocks spend from, over the Electrum protocol                           |
| `fulcrum-pruned` | Select Indexer                        | The same                                                                                            |
| `fulcrum`        | Select Indexer                        | Nothing in practice: it works only beside an archival node, which has every block                   |
| `electrs`        | Select Indexer                        | The same as `fulcrum`                                                                               |
| `lnd`            | Enable Lightning = LND                | The public channel graph over REST; `main` volume mounted for `tls.cert` and the read-only macaroon |
| `lightning-fork` | Enable Lightning = Lightning Fork     | The same                                                                                            |
| `c-lightning`    | Enable Lightning = Core Lightning     | The public channel graph over the `lightning-rpc` socket                                            |

`fulcrum` is accepted in both of its flavors: Start9's build (`>=2.1.1:8`) and privkeyio's BLAKE2b build, which ships under the same id as `#blake` (`>=#blake:2.1.4:0`). An unflavored range matches no flavored version, so the range names both.

No setting is asked of any dependency. In particular the node needs neither `txindex` nor to be archival. When the node is pruned, its own package puts btc-rpc-proxy on the RPC port this package dials, which is what serves a discarded block's bytes during a backfill.

Addresses are read from each package's binding on the internal bridge at start, never stored. A selected package that is not installed resolves to nothing, the updater gets no address for it, and the health check says what it is waiting for; the service restarts itself onto the address when the package appears.

## Network Access and Interfaces

One interface. The app makes no outbound request to the internet.

| Interface | Host id | Internal port | Protocol | Purpose                   |
| --------- | ------- | ------------- | -------- | ------------------------- |
| Web UI    | `main`  | 8080          | HTTP     | The site and its JSON API |

The site includes a read-only JSON API under `/api/v1/` (a block's grade by height, blocks by thousand, the tip), described on its About page, and `/status.json`, the same document the health check reads. Upstream's rate limit on the API is not applied. nginx keeps no access log.

## Installation and First-Run Flow

Nothing has to be configured before the first start, and no task is raised. The defaults are the `bitcoind` node, no indexer, no Lightning, backfill on and a 50 GB storage limit.

What differs from upstream is the order blocks are graded in. Upstream grades from block 961640 forward and has every block. Here the updater:

1. waits for the node to answer, to finish its initial sync, and to reach block 961640, then reads that block's hash to tell the chains apart;
2. grades the newest 12 blocks and renders the site, so there is something to see within minutes;
3. grades each new block as it arrives, ahead of everything else;
4. between new blocks, fills in older ones, newest first: from the node while it has them, then, below a pruned node's prune height, by rebuilding them through the selected indexer;
5. stops filling when the storage limit is reached, and from then on drops the oldest block as each new one arrives.

So the site is usable long before its history is complete, and its pages say "since block N" rather than "since the fork" until it is. Switching nodes with Select Node repeats step 1; a node on the other chain gets that chain's own state, and the first chain's stays on disk.

## Actions

Six actions, all of which may be run in any state. Each one that changes a setting restarts the two daemons, which costs nothing but a few seconds: the updater carries on from the state on disk.

### Select Node

Sets `backend`. Run it once after install if the node is not the default `bitcoind`, and again to move to another node. Moving to a node on the other chain starts or resumes that chain's history; nothing is deleted. Refused for the SHA256 Companion while Enable Lightning is on Lightning Fork.

### Select Indexer

Sets `indexer`. Only worth running beside a pruned node, to extend history below the node's prune height with Electrs Pruned or Fulcrum Pruned. The indexer must itself be fully indexed, and must follow the same node. Choosing Fulcrum or Electrs beside a pruned node changes nothing but the health message: they cannot serve a discarded block's transactions, and the site's About page says so.

### Backfill History

Sets `backfill`. Off stops the rebuilding of discarded blocks and keeps what is graded. The cost of leaving it on: every transaction an old block spends from is fetched through the indexer, which fetches an old block from the Bitcoin network for those it cannot get from the node. Measured on an Intel N100 server with a pruned SHA256 node and Electrs Pruned: a block spends from 4,000 to 6,500 distinct earlier transactions; they came back at about 4 a second for a block just inside the node's history and 0.7 a second for one 500 blocks below it, which is half an hour and an hour and a half a block. That is slower than the chain grows, so on the SHA256 chain backfill closes a short gap and never reaches far back. Not measured on the BLAKE2b chain, whose blocks spend several times fewer coins. It only runs between new blocks, one batch of 25 lookups at a time, so a new block waits for at most one batch.

### Storage Limit

Sets `storageLimitGb`, per chain. Lowering it below what is stored drops the oldest blocks at the next update, which is not reversible beside a pruned node with no indexer. Raising it lets history fill in further.

### Enable Lightning

Sets `lightning`. Adds Lightning pages built from the chosen node's view of the public channel graph. Read-only, public information only. Refused for Lightning Fork while Select Node is on the SHA256 Companion. The node must follow the same chain as the Bitcoin node; the app compares the two and reports a mismatch rather than mixing data.

### Rebuild Site

Leaves a request for the updater to render every page again from stored records. Nothing is fetched or graded. Safe to repeat. It takes as long as the history is large, and new blocks wait behind it.

## Tasks

None. The package raises no task on install or later: every setting has a working default.

## Health Checks

Two checks, one per daemon.

| Check                 | Probes                                | Result                                                                                                                         |
| --------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Grading (`updater`)   | `status.json`, written by the updater | Starting while it waits for the node or grades its first blocks; success once blocks are graded; failure when an update failed |
| Web Interface (`web`) | Port 8080 listening                   | Success once nginx is up                                                                                                       |

The Grading message is the app's own sentence and is the place to look first. It names the chain, the range graded, and what is happening: "Waiting for the Bitcoin node chosen under Select Node" (the node is not installed or not started; this one sentence is the package's own), "Waiting for the Bitcoin node to finish syncing: block N of M", "Grading the BLAKE2b chain, blocks A to B, and filling in N older blocks from the node", "... through the indexer", "... as many as fit in the disk space it may use", "Paused: the disk is nearly full", or "The last update failed: ...", after which it retries by itself, less often each time. A failure that names the checker (`plumb-check failed`) or a block that will not process does not clear by itself and needs a report.

Both checks go through `bounded` in `startos/utils.ts` (since 0.1.0:1). start-sdk awaits a check's run with no limit, and a stop waits for each daemon's check to end before it signals that daemon, so one run that never returned (a stalled read of the data volume, or in other packages a subcontainer `exec` waiting on its mounts) would hold up Stop, updates and restarts, as it did in Bitcoin Knots (BLAKE2b) Companion before 29.5.0:1. A run still pending after a minute is left behind: the check repeats its last result twice, then reads _This check has not finished after a minute_ (`starting`, never `failure`), the other sentence of the package's own a check can show. No second run starts while one is pending, and a run that finishes late is the next call's answer. Both checks answer in milliseconds, so the minute only runs out on a call that is not coming back.

## Backups and Restore

Only the `startos` volume is backed up: `store.json`. The `data` volume is left out because it is large and comes from the node. After a restore the app starts as on a first run and grades again.

What is not recoverable: beside a pruned node with no indexer, blocks the node has discarded since they were graded. History then starts later than it did before the restore.

## Limitations and Differences

- **Home page:** upstream's opening text, its "Latest sample" card, the "Get Plumb" cards and the Discord link are removed. The newest block leads the strip of blocks instead.
- **Two chains:** upstream grades the BLAKE2b chain. Here the chain is whichever the selected node is on. On the SHA256 chain a third verdict column, Bitcoin Core, is shown, and the checker leaves out the BLAKE2b chain's unified signature hash. The Knots and Plumb verdicts are those programs' policy code on both chains.
- **Coverage:** history can start after block 961640 and can have gaps (a stop longer than a pruned node's history). The About page states both, with the reason.
- **Storage limit:** upstream keeps everything; here the oldest blocks are dropped past the limit.
- **Share images** are not drawn, and pages carry no absolute address of their own.
- **Privacy page** is this install's, not cesspool.lol's.
- **Pool names** come from the list in the image, mempool's on the SHA256 chain and Kilombino's on the BLAKE2b chain, and are not refreshed between releases.
- **Baked-in figures:** the counts quoted on Check Node, and in the `bitcoin.conf` files it offers, were measured by cesspool.lol on the BLAKE2b chain. The page says so.
- **A pruned Retropex Bitcoin Knots on the BLAKE2b chain** (the `bitcoind` id, `#knots` flavor) is expected not to work: Mempool Pruned's `backends.ts` records that its bundled btc-rpc-proxy cannot parse a BLAKE2b header, and every block here is read through that proxy when the node is pruned. Not tested with this package. Unpruned it works.
- **Mainnet only.**

---

## Quick Reference for AI Consumers

```yaml
package_id: 'cesspool-pruned'
image: built from github.com/paulscode/cesspool-pruned (docker/Dockerfile)
architectures: [x86_64, aarch64]
subcontainers: [updater, web]
volumes:
  data: /data (not backed up)
  startos: store.json (backed up)
file_models: [store.json]
startos_managed_env_vars:
  - CESSPOOL_RPC_URL
  - CESSPOOL_RPC_COOKIE
  - CESSPOOL_ELECTRUM_HOST
  - CESSPOOL_ELECTRUM_PORT
  - CESSPOOL_BACKFILL
  - CESSPOOL_MAX_GB
  - CESSPOOL_LN_BACKEND
  - CESSPOOL_LND_REST_URL
  - CESSPOOL_LND_TLS_CERT
  - CESSPOOL_LND_MACAROON
  - CESSPOOL_CLN_SOCKET
  - CESSPOOL_LN_REFRESH
dependencies:
  - bitcoind (optional, one of three nodes)
  - knots-prerdts (optional)
  - knots-blake2b (optional)
  - electrs-pruned (optional)
  - fulcrum-pruned (optional)
  - fulcrum (optional)
  - electrs (optional)
  - lnd (optional)
  - lightning-fork (optional)
  - c-lightning (optional)
interfaces:
  webui: { host: main, port: 8080, type: ui }
actions:
  - select-backend
  - select-indexer
  - backfill-history
  - storage-limit
  - enable-lightning
  - rebuild-site
tasks: []
health_checks: [updater, web]
```
