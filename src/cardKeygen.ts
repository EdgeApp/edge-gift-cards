export interface CardKeygen {
  getNetworkMeta: (networkName: string) => CardKeygenNetworkMeta | null
  generate: (networkName: string, entropy: Uint8Array) => CardKeygenResult
}

export interface CardKeygenAdapter {
  readonly networkName: string
  readonly networkMeta: CardKeygenNetworkMeta
  generate: (entropy: Uint8Array) => CardKeygenResult
}

export interface CardKeygenResult {
  address: string
  privKey: string
}

export interface CardKeygenNetworkMeta {
  currencyCode: string
}

export function makeCardKeygen(adapters: CardKeygenAdapter[]): CardKeygen {
  const adaptersByNetwork: Record<string, CardKeygenAdapter> = {}

  for (const adapter of adapters) {
    const networkName = adapter.networkName
    if (adaptersByNetwork[networkName] != null) {
      throw new Error(`Duplicate keygen adapter for network "${networkName}"`)
    }
    adaptersByNetwork[networkName] = adapter
  }

  return {
    getNetworkMeta(networkName: string) {
      const adapter = adaptersByNetwork[networkName]
      if (adapter == null) return null
      return adapter.networkMeta
    },

    generate(networkName: string, entropy: Uint8Array) {
      const adapter = adaptersByNetwork[networkName]
      if (adapter == null) {
        throw new Error(
          `No keygen adapter registered for network "${networkName}"`
        )
      }
      return adapter.generate(entropy)
    }
  }
}
