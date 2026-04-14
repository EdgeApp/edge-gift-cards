import {
  getAccountBySecretSpendKey,
  getMasterAddress,
  mnemonicToSeed,
  seedToMnemonic
} from '@zano-project/zano-utils-js'
import { createHash } from 'crypto'

import { type CardKeygenAdapter } from '../cardKeygen'

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

      return { address, privKey: mnemonic }
    }
  }
}

export function makeZanoAdapters(): CardKeygenAdapter[] {
  return [makeZanoAdapter()]
}
