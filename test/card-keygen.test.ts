import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

import { makeUtxoAdapters } from '../src/adapters/utxo'
import { makeZanoAdapters } from '../src/adapters/zano'
import { makeCardKeygen } from '../src/cardKeygen'

const cardKeygen = makeCardKeygen([
  ...makeUtxoAdapters(),
  ...makeZanoAdapters()
])
const testEntropy = Uint8Array.fromHex('ed9e'.repeat(16))

interface CardKeygenFixture {
  readonly networkName: string
  readonly currencyCode: string
  readonly expectedAddress: string
  readonly expectedPrivKey: string
}

interface CardKeygenFixtureHooks {
  readonly beforeEach?: () => void
  readonly afterEach?: () => void
}

function testCardKeygenFixture(
  fixture: CardKeygenFixture,
  hooks?: CardKeygenFixtureHooks
): void {
  describe(fixture.networkName, () => {
    if (hooks?.beforeEach != null) {
      beforeEach(hooks.beforeEach)
    }
    if (hooks?.afterEach != null) {
      afterEach(hooks.afterEach)
    }

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
  testCardKeygenFixture(
    {
      networkName: 'zano',
      currencyCode: 'zano',
      expectedAddress:
        'ZxDG5iV9oQ7REsYaAif9xmUXpc12nWodi4EnzdLPMy1C3qDwv9s388oBy8FXcwjdhZ4sCw9y5nRTqMDbowRMTW3J1n9HzWQFw',
      expectedPrivKey:
        'slap rose puzzle slap rose puzzle slap rose puzzle slap rose puzzle slap rose puzzle slap rose puzzle slap rose puzzle slap rose puzzle anymore stun'
    },
    makeFixedDateNowHooks(1700000000000)
  )

  it('returns null metadata for unknown network', () => {
    expect(cardKeygen.getNetworkMeta('unknown')).toBeNull()
  })

  it('throws for unknown network generation', () => {
    expect(() => cardKeygen.generate('unknown', testEntropy)).toThrow(
      'No keygen adapter registered for network "unknown"'
    )
  })

  it('lists registered network names in stable order', () => {
    expect(cardKeygen.listNetworkNames()).toEqual([
      'bitcoin',
      'bitcoincash',
      'dash',
      'dogecoin',
      'litecoin',
      'zano'
    ])
  })
})

/**
 * Make hooks for deterministic `Date.now` for adapters whose mnemonics embed
 * a timestamp (e.g. Zano).
 **/
function makeFixedDateNowHooks(ms: number): CardKeygenFixtureHooks {
  let saved: typeof Date.now
  return {
    beforeEach: () => {
      saved = Date.now
      Date.now = () => ms
    },
    afterEach: () => {
      Date.now = saved
    }
  }
}
