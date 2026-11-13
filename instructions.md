# Cesspool Pruned

## Documentation

- [cesspool README](https://github.com/jasonsopko/cesspool/blob/master/README.md) — how the grading works: the policy checks, the classifier and the pool naming.
- [Plumb filter guide](https://github.com/plumb-node/plumb/blob/29.x-plumb/plumb/FILTERS.md) — the spam filters whose verdicts every page quotes.

## What you get on StartOS

- A **Web UI** interface: the cesspool.lol site, built from your own node. Every block is graded for spam, with the pool that mined it and what Bitcoin Knots and Plumb would have done with each transaction. It also has the lookups: a transaction, an address, the blocks you mined.
- It works with a **pruned** Bitcoin node, and with a node on either chain, SHA256 or BLAKE2b. It asks the node which chain it is on; there is nothing to set.
- Nothing leaves your server. The mining pool list and the fonts came with the package, and nothing is downloaded while it runs.

The pages' **About** page has a section, "What this install covers", that always says which blocks have been graded here and why any are missing.

## Getting set up

1. Install a **Bitcoin** node if you don't have one, then run **Select Node** and pick it. The node may be pruned, and needs no setting changed.
2. Start Cesspool Pruned. It waits until the node has finished syncing, then grades the newest dozen blocks, and the site appears, usually within a few minutes. Until then the Web UI shows a page that says what it is waiting for.
3. Leave it running. It grades each new block within seconds, and between new blocks it fills in older ones, newest first.

How far back the history goes depends on your node:

- **An archival node** has every block, so history fills in all the way back to block 961640, where grading starts on both chains.
- **A pruned node** has only its most recent blocks, so history starts at the oldest block the node still has. To go further back, install **Electrs Pruned** or **Fulcrum Pruned**, let it finish indexing, and run **Select Indexer**. Cesspool can then rebuild the discarded blocks. This is slow: every transaction an old block spends from has to be looked up, and for many of them the indexer fetches an old block from the Bitcoin network. On the SHA256 chain, where a block spends from several thousand earlier transactions, rebuilding one block took from half an hour to an hour and a half on a small server, which is slower than new blocks arrive. So it fills a short gap; it will not build a long history there. It runs only between new blocks, uses bandwidth while it runs, and you can turn it off with **Backfill History**.

## Disk space

Every graded block is stored, with what is needed to draw its page and to look up its transactions. How much that takes depends on the chain:

| Chain   | One block    | One day     |
| ------- | ------------ | ----------- |
| BLAKE2b | about 0.6 MB | about 90 MB |
| SHA256  | about 8 MB   | over 1 GB   |

**Storage Limit** sets how much disk the blocks of a chain may take, 50 GB unless you change it. History fills in until the limit is reached. After that the oldest block is dropped as each new one arrives, and the site says which block its history starts at. On the BLAKE2b chain 50 GB holds everything for a long time; on the SHA256 chain it holds about six weeks.

Cesspool also stops storing blocks, and says so, when the disk itself has less than 2 GB free.

## Using Cesspool Pruned

### Web UI

Open the **Web UI** interface. The home page shows the newest blocks and the last day's totals. Type a block height, a transaction id, an address, a pool name or a coinbase tag into the box at the top.

### Actions

- **Select Node** — which Bitcoin service to read: Bitcoin Knots (also Bitcoin Core, which shares its service), the Bitcoin Knots (SHA256) Companion, or the Bitcoin Knots (BLAKE2b) Companion. Switching to a node on the other chain switches the site to that chain. Each chain keeps its own history, so nothing is lost, and switching back picks up where it left off.
- **Select Indexer** — None, Electrs Pruned, Fulcrum Pruned, Fulcrum or Electrs. Only Electrs Pruned and Fulcrum Pruned can supply what a block below a pruned node's history needs. Fulcrum and Electrs work only beside an archival node, where no block is missing in the first place. The indexer must use the same Bitcoin node as Cesspool.
- **Backfill History** — turn the rebuilding of discarded blocks on or off. It is on unless you turn it off, and does nothing without an indexer.
- **Storage Limit** — see Disk space above.
- **Enable Lightning** — pick LND, Lightning Fork (BLAKE2b), Core Lightning or None. With a node picked, the site gains Lightning pages that show the public Lightning network as that node sees it: nodes, channels, capacity, which channels closed and how, and which Lightning transactions the default filters would refuse. Only public information is read, never your balances, payments or private channels. The Lightning node must use the same Bitcoin node as Cesspool. Lightning Fork cannot be picked while Select Node is on the SHA256 Companion.
- **Rebuild Site** — draw every page again from what is stored. Nothing is fetched or graded again. Use it if pages look out of date after an interrupted update.

## Backups

StartOS backs up your **choices** under the actions above, and nothing else. The graded blocks are not in the backup: they are large, and after a restore Cesspool grades again from your node, newest blocks first.

One thing does not come back by itself. Beside a pruned node with no indexer selected, blocks the node has discarded since they were graded cannot be graded again, so after a restore the history starts later than it did.

## Limitations

- **Mainnet only**, on either chain. Grading starts at block 961640 on both.
- **The Knots and Plumb columns are the BLAKE2b chain's software.** On the SHA256 chain the site also shows what Bitcoin Core's defaults would do, and each verdict names the policy code that gave it.
- **Some figures on Check Node are cesspool.lol's**, measured on the BLAKE2b chain, not counts of the blocks graded here. The page says so.
