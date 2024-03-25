import { makeConfig } from 'cleaner-config'
import { asBoolean, asObject, asOptional, asString } from 'cleaners'

export const asConfig = asObject({
  cardsFullpath: asOptional(asString, './output'),
  printToCard: asOptional(asBoolean, true)
})

export const config = makeConfig(asConfig, 'config.json')
