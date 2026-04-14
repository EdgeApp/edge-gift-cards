import { Network, payments } from 'altcoin-js'
import { createHash } from 'crypto'
import ECPairFactory from 'ecpair'
import * as ecc from 'tiny-secp256k1'

import { type CardKeygenAdapter } from '../cardKeygen'

const ECPair = ECPairFactory(ecc)

type UtxoNetworkConfig = Network & { currencyCode: string }

const networks: Record<string, UtxoNetworkConfig> = {
  bitcoin: {
    currencyCode: 'btc',
    messagePrefix: '\x18Bitcoin Signed Message:\n',
    bech32: 'bc',
    bip32: {
      public: 0x019da462,
      private: 0x019d9cfe
    },
    pubKeyHash: 0x00,
    scriptHash: 0x05,
    wif: 0x80
  },
  bitcoincash: {
    currencyCode: 'bch',
    messagePrefix: '\x18Bitcoin Signed Message:\n',
    bech32: 'bc',
    bip32: {
      public: 0x019da462,
      private: 0x019d9cfe
    },
    pubKeyHash: 0x00,
    scriptHash: 0x05,
    wif: 0x80
  },
  litecoin: {
    currencyCode: 'ltc',
    messagePrefix: '\x19Litecoin Signed Message:\n',
    bech32: 'ltc',
    bip32: {
      public: 0x019da462,
      private: 0x019d9cfe
    },
    pubKeyHash: 0x30,
    scriptHash: 0x32,
    wif: 0xb0
  },
  dash: {
    currencyCode: 'dash',
    messagePrefix: '\x18Dash Signed Message:\n',
    bech32: '',
    bip32: {
      public: 0x019da462,
      private: 0x019d9cfe
    },
    pubKeyHash: 0x4c,
    scriptHash: 0x10,
    wif: 0xcc
  },
  dogecoin: {
    currencyCode: 'doge',
    messagePrefix: '\x18Dogecoin Signed Message:\n',
    bech32: 'dge',
    bip32: {
      public: 0x019da462,
      private: 0x019d9cfe
    },
    pubKeyHash: 0x1e,
    scriptHash: 0x16,
    wif: 0x9e
  }
}

function makeUtxoAdapter(
  networkName: string,
  network: UtxoNetworkConfig
): CardKeygenAdapter {
  return {
    networkName,
    networkMeta: { currencyCode: network.currencyCode },

    generate(entropy?: Uint8Array) {
      const keyPair =
        entropy == null
          ? ECPair.makeRandom({ network })
          : ECPair.fromPrivateKey(makePrivateKeyFromEntropy(entropy), {
              network
            })
      const privKey = keyPair.toWIF()
      if (privKey == null) throw new Error('Private key is null')

      const { address } = payments.p2pkh({
        network,
        pubkey: keyPair.publicKey
      })
      if (address == null) throw new Error('Address is null')

      return { address, privKey }
    }
  }
}

export function makeUtxoAdapters(): CardKeygenAdapter[] {
  return Object.entries(networks).map(([networkName, network]) =>
    makeUtxoAdapter(networkName, network)
  )
}

function makePrivateKeyFromEntropy(entropy: Uint8Array): Buffer {
  const maybePrivateKey = Buffer.from(entropy)
  if (maybePrivateKey.length === 32 && ecc.isPrivate(maybePrivateKey)) {
    return maybePrivateKey
  }

  const seed = maybePrivateKey
  let counter = 0
  while (true) {
    const counterBuffer = Buffer.alloc(4)
    counterBuffer.writeUInt32BE(counter)
    counter += 1

    const candidate = createHash('sha256')
      .update(seed)
      .update(counterBuffer)
      .digest()
    if (ecc.isPrivate(candidate)) return candidate
  }
}
