# WoW Forever recipe profit tracker

Open the [Crafting Profit calculator](index.html) to plan vendor sales with the leather and hides you have. The planner gives each leather or hide in your known recipes its own inventory field. Enter 0 if you have none.

To add a recipe to **My recipes**, ask Codex to use the [add-crafting-recipe skill](../.claude/skills/add-crafting-recipe/SKILL.md) with the recipe name or item link. The skill records it in the project and the page ranks it by vendor profit per craft.

## Refresh auction prices

The planner reads [Auction House's public API](https://auctionhouse.tk.gg/data/) directly in your browser when the page opens. The US Normal Horde market is `us-2-114`. It caches the tracked material quotes for one hour in browser storage and reuses them on repeat visits. The provider permits cross-origin requests and requires no key. Prices come from hourly auction snapshots.

The page recalculates recipes, purchase limits, and vendor plans when quotes arrive. Manual price edits and material source selections are preserved during a request. A failed request uses the older browser cache or the bundled snapshot and labels that fallback. The displayed scan time identifies the age of the data.

Bought materials use the cheaper of the auction minimum and a known vendor price. Gathered materials cost 0c and crafted inputs use their ingredient costs. Listed quantities cover all price levels, so a larger purchase may cost more than the minimum.

For an offline fallback snapshot, ask Codex to use [refresh-auction-prices](../.claude/skills/refresh-auction-prices/SKILL.md), or run `npm run prices:refresh`. This optional local process saves WoWAuctions quotes in [auction-prices.csv](auction-prices.csv) and [auction-prices.js](auction-prices.js). Add verified item IDs for newly introduced materials to [auction-materials.json](auction-materials.json), which both refresh processes read.

## Sources

Imported from the WoWTBC.GG **All Recipes** tables on November 17, 2026. Each ingredient quantity is for one craft. A recipe's yield defaults to one unless the guide shows a different quantity.

| Profession | Recipes | Guide |
| --- | ---: | --- |
| Leatherworking | 511 | [WoWTBC.GG Leatherworking](https://wowtbc.gg/warcraftforever/professions/leatherworking/) |
| Cooking | 123 | [WoWTBC.GG Cooking](https://wowtbc.gg/warcraftforever/professions/cooking/) |
| First Aid | 32 | [WoWTBC.GG First Aid](https://wowtbc.gg/warcraftforever/professions/first-aid/) |

For cross-checking reagents, skill thresholds, and where recipes are learned, see the [ConquestCapped WoW Forever Recipe Database](https://conquestcapped.com/guides/wow-forever/wow-forever-recipes/). It covers all eight crafting professions, including the three tracked here.

## Local database

| File | Contents |
| --- | --- |
| [recipes.csv](recipes.csv) | One row per recipe with skill, yield, how it's learned, material cost, and fields for sale price, selling fees, and profit. |
| [recipe-materials.csv](recipe-materials.csv) | One row per ingredient per recipe, linked by `recipe_id`. |
| [material-prices.csv](material-prices.csv) | One row per material with the guide's unit price where available and a field for a local price. |

The leveling guides supply prices for 42 of the 284 materials, enough to calculate 110 recipe costs. These are the guide prices visible on the import date. Cost totals are blank when any ingredient price is missing. Recipe unlocks and trainer fees are one-time costs outside the per-craft material totals.

## Track profit

1. Enter prices for your realm in `local_price_copper_per_unit`. Use the guide price as a fallback where available. All prices are in copper (1 silver = 100 copper and 1 gold = 10,000 copper).
2. For each recipe, multiply each ingredient's unit price by its quantity and sum the results into `material_cost_copper_per_craft`. Recalculate this field when prices change. Price crafted ingredients using either their purchase price or their own crafting cost per unit.
3. Enter the expected sale price per item and total selling fees per craft in `recipes.csv`. Set fees to zero if none apply. Calculate **profit per craft = units per craft × sale price per unit − material cost per craft − selling fees per craft**.
4. Sort by `profit_copper_per_craft` descending once you have prices. The CSV files store values, so totals and rankings need to be recalculated after price edits.

For example, Simple Poultice uses one Spider Ichor, one Mild Spices, and one Bottle of Dalaran Noir to produce three poultices. The guide prices put the material cost at 72 copper per craft, or 24 copper per poultice before selling fees.

## Shared material max buy

Max buy is the highest whole-copper purchase ceiling across all known recipes that use a material, with positive vendor profit and current selected costs for other ingredients. If two recipes allow 30c and 45c, the shared maximum is 45c everywhere that material appears. The Materials tab also shows the smallest and largest eligible recipe ceilings and the recipe supporting the maximum. Filters and inventory do not affect the shared limit. Live price updates, manual price edits, and source changes recalculate it.

Individual recipe comparisons retain their own ceilings. A shared maximum only supports the recipe with that ceiling; check current recipe profit before crafting. Other ingredient costs must stay at their selected values, and individual maximum prices cannot all be combined. Unknown and negative ceilings are excluded; 0c is valid.

Leather-and-hide recipes also include purchase tradeoff side notes. These show both directions: the highest whole-copper leather price when buying the hide at its selected purchase price, and the highest whole-copper hide price when buying leather at its selected purchase price. Other ingredient costs stay fixed and each scenario leaves positive profit. They show the quantities, achievable profit, and how each 1c saved on one material changes the allowance for the other. Both target materials are treated as purchases in the scenario, even if currently selected as gathered or crafted; other crafted ingredients follow selected crafting chains. Missing prices, unsupported vendor payouts, and scenarios impossible even with the discounted material free produce no note for that direction. Turn off Profitable only to see alternatives for recipes currently making a loss. Notes recalculate with price and source changes.
