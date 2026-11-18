---
name: refresh-auction-prices
description: Refresh the crafting planner's material minimum buyouts from WoWAuctions for US Normal Horde, including material item IDs, scan times, vendor alternatives, and unavailable quotes.
---

# Refresh crafting material prices

The live planner refreshes prices entirely in the browser using `professions/auction-client.js` and Auction House's CORS-enabled endpoint `https://auctionhouse.tk.gg/api/m/us-2-114`. It reuses a browser cache for one hour, matching the provider's polling guidance. Source selections and manual price edits survive incoming quotes. The saved WoWAuctions files below provide an offline fallback. This browser process runs automatically on live visits.

Run `npm run prices:refresh` from the project root. It discovers the materials used by all known recipes, reads WoWAuctions, and saves `professions/auction-prices.js` and `professions/auction-prices.csv`. Reload the planner after a refresh.

The requested market is `forever-us/pve-forever-us/horde`. Item IDs and independently known vendor prices live in `professions/auction-materials.json`. When a new recipe introduces a material, verify its item ID from its item link or a WoW Forever database and add it to that file. Do not infer vendor availability from the site's generic `BuyPrice` or `available_from_vendor` fields. The existing vendor prices are curated purchase alternatives.

Use the numeric `minimum_buyout` / `min_buyout` fields in embedded `__NEXT_DATA__`, after validating the market, item identity, current listing quantity, and scan time. WoWAuctions' visible price cards can omit copper. The Thunder Lizard Tail card displayed 2s when both embedded fields recorded 210c. Keep all prices as integer copper and distinguish scan time from refresh time.

The browser loads saved purchase prices and uses the cheaper of a current auction quote and a known vendor price. Gathered materials still cost 0c, and crafted inputs use their ingredient costs. A user can edit the loaded price to reflect an actual purchase.

Inspect the refresh output. A missing listing has an unknown auction price, with a vendor fallback where available. A fetch or validation failure keeps the previous quote with its original scan time and marks the refresh error. Resolve item mismatches or parser changes at the source and retry. Report any remaining failed materials or unavailable listings without calling them current quotes. Run `node --test tests/auction-prices.test.cjs tests/material-costs.test.cjs` after changing the process.
