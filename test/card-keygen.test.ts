import { describe, expect, it } from 'bun:test'

import { makeUtxoAdapters } from '../src/adapters/utxo'
import { makeCardKeygen } from '../src/cardKeygen'

const cardKeygen = makeCardKeygen(makeUtxoAdapters())
const testEntropy = Uint8Array.fromHex('ed9e'.repeat(16))

interface CardKeygenFixture {
  readonly networkName: string
  readonly currencyCode: string
  readonly expectedAddress: string
  readonly expectedPrivKey: string
}
function testCardKeygenFixture(fixture: CardKeygenFixture): void {
  describe(fixture.networkName, () => {
    it('returns expected network metadata', () => {
      const networkMeta = cardKeygen.getNetworkMeta(fixture.networkName)
      expect(networkMeta).not.toBeNull()
      expect(networkMeta?.currencyCode).toBe(fixture.currencyCode)
    })

    it('generates expected deterministic address/private key', () => {
      const { address, privKey } = cardKeygen.generate(
        fixture.networkName,
        testEntropy
      )
      expect(address).toBe(fixture.expectedAddress)
      expect(privKey).toBe(fixture.expectedPrivKey)
    })
  })
}

describe('Card keygen', () => {
  testCardKeygenFixture({
    networkName: 'bitcoin',
    currencyCode: 'btc',
    expectedAddress: '1DkFoN4fgwgFuAABZXSd5k9DEMnDRWwSFr',
    expectedPrivKey: 'L5Bcc5KuZu6i7WyBwEQDV3m7vXHMKX45RwrcyKb8BBrpRyi2ZSsC'
  })
  testCardKeygenFixture({
    networkName: 'bitcoincash',
    currencyCode: 'bch',
    expectedAddress: '1DkFoN4fgwgFuAABZXSd5k9DEMnDRWwSFr',
    expectedPrivKey: 'L5Bcc5KuZu6i7WyBwEQDV3m7vXHMKX45RwrcyKb8BBrpRyi2ZSsC'
  })
  testCardKeygenFixture({
    networkName: 'litecoin',
    currencyCode: 'ltc',
    expectedAddress: 'LXyD4aNVmbvK9xrLjfRvMmCySa9Vc6Z9fA',
    expectedPrivKey: 'TB1t3pd5yH5JtMc4UsM5hQJVsNvfPc4yF9ksq8DfkA2ywsG5WZ7S'
  })
  testCardKeygenFixture({
    networkName: 'dash',
    currencyCode: 'dash',
    expectedAddress: 'XoS6dciZeetr46kmRQkqwGq14hMuYuA5fe',
    expectedPrivKey: 'XKFY4LiGsajAAqyZxzQ5zGx8qYYvmKfKoXCXVqvKVZ8uq8jWv55c'
  })
  testCardKeygenFixture({
    networkName: 'dogecoin',
    currencyCode: 'doge',
    expectedAddress: 'DHtMLd1JzMaYSALnJ7SBdWJp7VWWnzMyxZ',
    expectedPrivKey: 'QWaXkv8tpWaqM3NEXWF1NGbjPZJvN5BtKCYXkwyxuYUAsudwJPuY'
  })

  it('returns null metadata for unknown network', () => {
    expect(cardKeygen.getNetworkMeta('unknown')).toBeNull()
  })

  it('throws for unknown network generation', () => {
    expect(() => cardKeygen.generate('unknown', testEntropy)).toThrow(
      'No keygen adapter registered for network "unknown"'
    )
  })
})
