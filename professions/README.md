# WoW Forever recipe profit tracker

Open the [Crafting Profit calculator](index.html) to plan vendor sales with the leather and hides you have. The planner gives each leather or hide in your known recipes its own inventory field. Enter 0 if you have none.

[known-recipes-data.js](known-recipes-data.js) is the source of truth for every recipe, yield, and material price — nothing else in the project is read by the page. To add a recipe to **My recipes**, ask Codex to use the [add-crafting-recipe skill](../.claude/skills/add-crafting-recipe/SKILL.md) with the recipe name or item link. The skill records it in the project and the page ranks it by vendor profit per craft.

## Refresh auction prices

The planner reads [Auction House's public API](https://auctionhouse.tk.gg/data/) directly in your browser every time the page opens, so prices are always a fresh live fetch rather than a cached copy. The US Normal Horde market is `us-2-114`. The provider permits cross-origin requests and requires no key. Prices come from hourly auction snapshots.

The page recalculates recipes, purchase limits, and vendor plans when quotes arrive. Manual price edits and material source selections are preserved during a request. A failed request falls back to the last successful fetch saved in browser storage, or the bundled snapshot, and labels that fallback. The displayed scan time identifies the age of the data.

Bought materials use the cheaper of the auction minimum and a known vendor price. Gathered materials cost 0c and crafted inputs use their ingredient costs. Listed quantities cover all price levels, so a larger purchase may cost more than the minimum.

For an offline fallback snapshot, ask Codex to use [refresh-auction-prices](../.claude/skills/refresh-auction-prices/SKILL.md), or run `npm run prices:refresh`. This optional local process saves WoWAuctions quotes in [auction-prices.csv](auction-prices.csv) and [auction-prices.js](auction-prices.js). Add verified item IDs for newly introduced materials to [auction-materials.json](auction-materials.json), which both refresh processes read.

## Sources

This project started from a bulk import of the WoWTBC.GG **All Recipes** tables on November 17, 2026, but [known-recipes-data.js](known-recipes-data.js) now holds only the curated **known recipes** list — recipes actually added one at a time via the [add-crafting-recipe skill](../.claude/skills/add-crafting-recipe/SKILL.md), not every recipe in a profession. Each ingredient quantity is for one craft. A recipe's yield defaults to one unless its source shows a different quantity.

| Profession | Recipes tracked | Guide |
| --- | ---: | --- |
| Leatherworking | 50 | [WoWTBC.GG Leatherworking](https://wowtbc.gg/warcraftforever/professions/leatherworking/) |
| Cooking | 21 | [WoWTBC.GG Cooking](https://wowtbc.gg/warcraftforever/professions/cooking/) |
| First Aid | 11 | [WoWTBC.GG First Aid](https://wowtbc.gg/warcraftforever/professions/first-aid/) |

For cross-checking reagents, skill thresholds, and where recipes are learned, see the [ConquestCapped WoW Forever Recipe Database](https://conquestcapped.com/guides/wow-forever/wow-forever-recipes/). It covers all eight crafting professions, including the three tracked here.

## Track profit

The calculator tracks profit live — there's no manual spreadsheet step. For each material, pick a source (Gathered, Bought, or Crafted) and, for bought materials, a purchase price; the recipe tables and the vendor plan recalculate immediately from your selections. Bought materials default to the cheaper of the live auction minimum and a known vendor price (see [Refresh auction prices](#refresh-auction-prices) above), gathered materials cost 0c, and crafted materials use their own ingredients' cost recursively. **Profit per craft = units per craft × vendor sale price − material cost per craft.**

For example, Simple Poultice uses one Spider Ichor, one Mild Spices, and one Bottle of Dalaran Noir to produce three poultices. At the bundled guide prices, material cost is 72 copper per craft, or 24 copper per poultice.

## Shared material max buy

Max buy is the highest whole-copper purchase ceiling across all known recipes that use a material, with positive vendor profit and current selected costs for other ingredients. If two recipes allow 30c and 45c, the shared maximum is 45c everywhere that material appears. The Materials tab also shows the smallest and largest eligible recipe ceilings and the recipe supporting the maximum. Filters and inventory do not affect the shared limit. Live price updates, manual price edits, and source changes recalculate it.

Individual recipe comparisons retain their own ceilings. A shared maximum only supports the recipe with that ceiling; check current recipe profit before crafting. Other ingredient costs must stay at their selected values, and individual maximum prices cannot all be combined. Unknown and negative ceilings are excluded; 0c is valid.

Recipes also include purchase tradeoff side notes for every pair of their priced ingredients (including ones reached through a currently-crafted sub-chain), each shown in both directions: the highest whole-copper price for one material when buying the other at its selected purchase price, and vice versa. Other ingredient costs stay fixed and each scenario leaves positive profit. They show the quantities, achievable profit, and how each 1c saved on one material changes the allowance for the other. Both target materials are treated as purchases in the scenario, even if currently selected as gathered or crafted; other crafted ingredients follow selected crafting chains. Missing prices, unsupported vendor payouts, and scenarios impossible even with the discounted material free produce no note for that direction. A recipe with several priced ingredients can show many notes, one per pair. Turn off Profitable only to see alternatives for recipes currently making a loss. Notes recalculate with price and source changes.

A material with a known vendor price is never the one a note solves a ceiling for — a vendor is always there to undercut a pricier auction listing, so that ceiling would never be worth bidding up to. It can still anchor the other side of a note (e.g. "buy Light Leather at ≤34c to afford Fine Thread at its 1s 0c vendor price").
