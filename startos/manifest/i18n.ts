// en_US only for now, as in this package's dictionary (see
// i18n/dictionaries/translations.ts). The other locales carry the English text
// rather than a translation nobody has checked.
const same = (text: string) => ({
  en_US: text,
  es_ES: text,
  de_DE: text,
  pl_PL: text,
  fr_FR: text,
})

export const short = same(
  'Bitcoin water quality, block by block: every block graded for spam, from your own node',
)

export const long = same(
  'Cesspool Pruned is a self-hosted build of cesspool.lol. It runs every transaction of every block through the policy code of Bitcoin Knots and Plumb, grades each block for spam, names the pool that mined it and the filter that would have kept the spam out, and serves the result as a site on your server. It works with a pruned Bitcoin node, on either the SHA256 chain or the BLAKE2b chain, and makes no request to any machine but your own.',
)

export const bitcoindDescription = same(
  'Supplies the blocks, with the coins they spend, that Cesspool grades.',
)

export const indexerDescription = same(
  'Supplies the transactions that old blocks spend from, so that blocks your pruned node has discarded can be graded too.',
)

export const lightningDescription = same(
  'Supplies the public Lightning channel graph that the Lightning pages show.',
)
