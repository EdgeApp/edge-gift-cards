import { makeConfig } from 'cleaner-config'
import { asObject, asOptional, asString } from 'cleaners'

export const asConfig = asObject({
  cardsFullpath: asOptional(asString, './output')
})

export const config = makeConfig(asConfig, 'config.json')
