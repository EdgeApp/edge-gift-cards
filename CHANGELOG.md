# edge-info-server

## Unreleased

## 2.1.0 (2024-02-25)

- added: PromoCards2 'dismissable' flag
- changed: PromoCards2 'newAccount' flag renamed to 'noBalance'
- fixed: Broken types.d.ts generation for export.

## 2.0.0 (2024-02-05)

- added: newAccount flag to promoCards2
- changed: BREAKING change. Export types as both types.d.ts file and types.js file. Import must now only include repo name without path.

## 1.4.1 (2024-01-30)

- fixed: Older documents being served by API

## 1.4.0 (2023-12-30)

  added: asBlogPost cleaner export
  changed: Update promoCard2 to use start and end iso dates to align with AssetStatus
  changed: Rename version to appVersion

## 1.3.0 (2023-12-22)

- added: infoRollup endpoint that returns data from all current GET endpoints
- added: blogPosts endpoint for home screen carousel

## 1.2.0 (2023-12-01)

- added: 'promoCards2' endpoint
- fixed: Misspelled BSC pluginId for APY queries

## 1.1.0 (2023-11-06)

- added: buySellPluginsPatch endpoint
- added: 'assetStatusCards' endpoint
- added: Export asExchangeInfo cleaner
- changed: asExchangeInfo cleaner to not have default empty array for Thorchain servers

## 1.0.2 (2023-10-19)

- added: 'appVersions' property on AssetStatus to specify target client versions

## 1.0.1 (2023-10-10)

- fixed: Removed indexInfo.js from package export

## 1.0.0 (2023-10-09)

- added: assetStatus endpoint
