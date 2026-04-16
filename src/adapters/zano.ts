import {
  getAccountBySecretSpendKey,
  getMasterAddress,
  mnemonicToSeed,
  seedToMnemonic
} from '@zano-project/zano-utils-js'
import { createHash } from 'crypto'

import { type CardKeygenAdapter } from '../cardKeygen'
import { base58 } from '../util/encoding'

const ZANO_NETWORK_NAME = 'zano'

/**
 * Normalize caller entropy to a keys-seed buffer suitable for `seedToMnemonic`.
 * Zano encoding requires the binary seed length to be a multiple of 4 bytes.
 */
function entropyToKeysSeedBuffer(entropy: Uint8Array): Buffer {
  if (entropy.length === 0) {
    throw new Error('Entropy must not be empty')
  }

  const buf = Buffer.from(entropy)
  if (buf.length % 4 === 0) {
    return buf
  }

  return createHash('sha256').update(buf).digest()
}

function makeZanoAdapter(): CardKeygenAdapter {
  return {
    networkName: ZANO_NETWORK_NAME,
    networkMeta: { currencyCode: 'zano' },

    generate(entropy: Uint8Array) {
      const keysSeed = entropyToKeysSeedBuffer(entropy)
      if (keysSeed.length % 4 !== 0) {
        throw new Error('Invalid keys seed length after normalization')
      }

      const keysSeedHex = keysSeed.toString('hex')
      const mnemonic = seedToMnemonic(keysSeedHex)

      const secretSpendKey = mnemonicToSeed(mnemonic)
      if (secretSpendKey === false) {
        throw new Error('Failed to derive secret spend key from mnemonic')
      }

      const accountKeys = getAccountBySecretSpendKey(secretSpendKey)
      const address = getMasterAddress(
        accountKeys.publicSpendKey,
        accountKeys.publicViewKey
      )

      return { address, privKey: encodeMnemonicToBase58(mnemonic) }
    }
  }
}

export function makeZanoAdapters(): CardKeygenAdapter[] {
  return [makeZanoAdapter()]
}

/**
 * Encode a Zano mnemonic phrase as Base58 using flattened seed bytes.
 *
 * The underlying `mnemonicToSeed(..., true)` ("full" mode) call appends
 * timestamp/checksum
 * word identifiers to the seed hex, so the encoded Base58 preserves metadata
 * that plain `mnemonicToSeed(..., false)` drops.
 *
 * @param mnemonic Zano mnemonic phrase.
 * @returns Base58 string representation of flattened mnemonic seed bytes.
 */
export function encodeMnemonicToBase58(mnemonic: string): string {
  const normalizedMnemonic = mnemonic.trim()
  if (normalizedMnemonic.length === 0) {
    throw new Error('Mnemonic must not be empty')
  }
  const flattenedSeedHex = mnemonicToSeed(normalizedMnemonic, true)
  if (flattenedSeedHex === false) {
    throw new Error('Failed to derive flattened seed from mnemonic')
  }
  return base58.stringify(Buffer.from(flattenedSeedHex, 'hex'))
}
