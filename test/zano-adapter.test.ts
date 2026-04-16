import { describe, expect, it } from 'bun:test'
import { mnemonicToSeed, seedToMnemonic } from '@zano-project/zano-utils-js'

import { makeZanoAdapters } from '../src/adapters/zano'

describe('Zano adapter', () => {
  const zanoAdapter = makeZanoAdapters()[0]

  it('maps entropy to base58 private key and master address', () => {
    const origDateNow = Date.now
    Date.now = () => 1700000000000

    try {
      const entropy = Uint8Array.fromHex('ed9e'.repeat(16))
      const { address, privKey } = zanoAdapter.generate(entropy)

      expect(address).toBe(
        'ZxDG5iV9oQ7REsYaAif9xmUXpc12nWodi4EnzdLPMy1C3qDwv9s388oBy8FXcwjdhZ4sCw9y5nRTqMDbowRMTW3J1n9HzWQFw'
      )
      expect(privKey).toBe(
        '2oehsoAYzjctGUA6ZNW8ekuMNRfPsbu1zoS13Kac6yoXx66h9F'
      )
    } finally {
      Date.now = origDateNow
    }
  })

  it('round-trips mnemonic through full seed hex', () => {
    const origDateNow = Date.now
    Date.now = () => 1700000000000

    try {
      const seedHex = Buffer.from(Uint8Array.fromHex('ed9e'.repeat(16))).toString(
        'hex'
      )
      const originalMnemonic = seedToMnemonic(seedHex)
      const fullSeedHex = mnemonicToSeed(originalMnemonic, true)

      expect(fullSeedHex).not.toBe(false)
      if (fullSeedHex === false) {
        throw new Error('Failed to derive full seed hex from mnemonic')
      }

      // Use a different timestamp source to prove full seed restores exact words.
      Date.now = () => 1705000000000

      const roundTrippedMnemonic = seedToMnemonic(fullSeedHex)
      expect(roundTrippedMnemonic).toBe(originalMnemonic)
    } finally {
      Date.now = origDateNow
    }
  })

  it('produces identical output for identical entropy when Date.now is fixed', () => {
    const origDateNow = Date.now
    Date.now = () => 1700000000000

    try {
      const entropy = Uint8Array.fromHex('ed9e'.repeat(16))
      const a = zanoAdapter.generate(entropy)
      const b = zanoAdapter.generate(entropy)
      expect(a).toEqual(b)
    } finally {
      Date.now = origDateNow
    }
  })

  it('normalizes non-aligned entropy with SHA-256 to a 4-byte-aligned seed', () => {
    const origDateNow = Date.now
    Date.now = () => 1700000000000

    try {
      const entropy31 = new Uint8Array(31)
      entropy31.fill(7)
      const once = zanoAdapter.generate(entropy31)
      const twice = zanoAdapter.generate(entropy31)
      expect(once.address).toBe(twice.address)
      expect(once.privKey).toBe(twice.privKey)
      expect(once.address.startsWith('Zx')).toBe(true)
    } finally {
      Date.now = origDateNow
    }
  })

  it('throws when entropy is empty', () => {
    expect(() => zanoAdapter.generate(new Uint8Array(0))).toThrow(
      'Entropy must not be empty'
    )
  })
})
