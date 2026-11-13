export const DEFAULT_LANG = 'en_US'

const dict = {
  'Rebuild Pruned History': 0,
  'When on, and an indexer is chosen under Select Indexer, Cesspool rebuilds the blocks your pruned node has discarded, newest first, and grades them. Each transaction an old block spends from has to be fetched through the indexer, which in turn may fetch an old block from the Bitcoin network for it. On the SHA256 chain a block spends from several thousand earlier transactions, and rebuilding one took from half an hour to an hour and a half on a small server, so it fills a short gap but cannot build a long history there. It uses bandwidth for as long as it runs. New blocks always come first. Turning it off keeps everything already graded.': 1,
  'Backfill History': 2,
  'Turn the rebuilding of blocks below a pruned node’s prune height on or off. It has no effect without an indexer, or beside an archival node, which has every block.': 3,
  'Lightning Node': 4,
  '- LND: the Lightning pages show the public channel graph as LND on this server sees it.\n- Lightning Fork (BLAKE2b): the same, from Lightning Fork on this server. It follows the BLAKE2b chain, and cannot be chosen while Cesspool reads the SHA256 chain through the SHA256 Companion.\n- Core Lightning: the same, from Core Lightning on this server.\n- None: there are no Lightning pages.\nOnly public information is read: nodes, channels and their fee policies. Cesspool never reads your balances, payments or private channels. The Lightning node must use the same Bitcoin node as Cesspool.': 5,
  LND: 6,
  'Lightning Fork (BLAKE2b)': 7,
  'Core Lightning': 8,
  None: 9,
  'Enable Lightning': 10,
  'Choose the Lightning node whose view of the public Lightning network the Lightning pages show': 11,
  'Lightning Fork follows the Bitcoin BLAKE2b chain, and Cesspool reads the SHA256 chain through the SHA256 Companion. Choose a node on the BLAKE2b chain under Select Node first.': 12,
  'Rebuild Site': 13,
  'Render every page again from the records already stored. Nothing is fetched or graded again. Use it if pages look out of date or incomplete, for example after an interrupted update. It can take a while when many blocks are stored, and new blocks wait until it is done.': 14,
  'Rebuild Requested': 15,
  'Cesspool will render every page again, starting within a minute if it is running, or when it is next started.': 16,
  'Select Node': 17,
  'Which Bitcoin service Cesspool reads blocks from. The node may be pruned. Cesspool finds out for itself which chain the node is on, SHA256 or BLAKE2b.': 18,
  'Choose which Bitcoin service Cesspool grades blocks from': 19,
  'Switching nodes may switch chains. Each chain keeps its own graded history, and nothing is deleted: switching back picks up where that chain left off.': 20,
  'Lightning Fork, the Lightning node chosen under Enable Lightning, follows the Bitcoin BLAKE2b chain, and the SHA256 Companion follows the SHA256 chain. Choose another Lightning node, or None, under Enable Lightning first.': 21,
  'Select Indexer': 22,
  '- None: Cesspool grades every block your node still has. Beside a pruned node, history starts at the oldest block the node kept.\n- Electrs Pruned: lets Cesspool rebuild and grade blocks your pruned node has already discarded.\n- Fulcrum Pruned: the same, through Fulcrum Pruned.\n- Fulcrum: works only beside an archival node, where no block is missing and Cesspool never needs to ask it anything.\n- Electrs: the same as Fulcrum.\nThe indexer you choose must be installed and running on this server, and must use the same Bitcoin node as Cesspool.': 23,
  'Electrs Pruned (works with a pruned node)': 24,
  'Fulcrum Pruned (works with a pruned node)': 25,
  Fulcrum: 26,
  Electrs: 27,
  'Choose an Electrum server that lets Cesspool grade blocks a pruned node has already discarded, or None.': 28,
  'No limit': 29,
  '${gb} GB': 30,
  'Storage Limit': 31,
  'The most disk space the graded blocks of one chain may take. A block with its records and pages takes about 0.6 MB on the BLAKE2b chain and about 8 MB on the SHA256 chain, where blocks are full: over 1 GB a day. History fills in, newest first, until the limit is reached. From then on the oldest block is dropped as each new one arrives, and the site says which block its history starts at. Raising the limit lets older blocks fill in again. Each chain has its own history and its own limit.': 32,
  'Set how much disk space the graded blocks of a chain may take before the oldest are dropped': 33,
  'Lowering the limit below what is stored now drops the oldest blocks until it fits. With an archival node, or an indexer, they can be graded again later; below a pruned node’s blocks with no indexer, they cannot.': 34,
  'Web UI': 35,
  'The site: every graded block, the pools that mined them, and the lookups': 36,
  'Starting Cesspool Pruned': 37,
  Grading: 38,
  'Waiting for the Bitcoin node chosen under Select Node. It is not installed, or has not started yet.': 39,
  'Cesspool Pruned is starting': 40,
  'The last update failed': 41,
  'Web Interface': 42,
  'The web interface is ready': 43,
  'The web interface is not ready': 44,
}

/**
 * Plumbing. DO NOT EDIT.
 *
 * Generated by startos/gen-i18n-dict.py from the i18n() calls in this
 * package. Add a string by using it, then re-run that script.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
