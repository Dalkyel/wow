# Crafting Profit

Open [Crafting Profit](index.html) to compare current purchase quotes with a complete buying plan that leaves at least 1 copper profit.

## Recipes

Choose a recipe, a sale destination, and an ingredient route. The three top figures are the sale proceeds, selling fee, and maximum total ingredient spend. **Purchase budget = sale proceeds − selling fee − 1c.** A vendor sale has no AH fee. An AH sale uses a 5% cut on the whole output sale and needs an output quote; otherwise its sale price and budget stay unknown.

**At current purchase quotes** prices the exact chosen ingredients using their AH snapshot minimums or curated vendor purchase prices. Missing quotes stay unknown. No gathered or hypothetical inventory cost is substituted.

**Buying plan** is one complete, hypothetical allocation of that same budget. It reserves fixed vendor supplies, divides the remaining budget across purchased units, and assigns leftover whole copper. Ingredient prices in a single example work together. Many other combinations can satisfy the same budget; no example target is a universal material price or a promise of AH availability. Plans requiring free purchased inputs are rejected.

For example, Light Leather Pants vendor for 599c. Keeping 1c leaves 598c for all purchases. Salt at 50c plus Fine Thread at 100c leave **448c for 10 Light Leather and 1 Light Hide together**. One complete example is 40c leather and 48c hide; another is 35c leather and 90c hide, which leaves 9c profit.

Every craftable ingredient has independent Buy and Craft buttons, including base leather conversions. Each row compares its quoted purchase price with its ingredient cost to craft. Defaults buy base leather and craft other intermediates; you can change any ingredient without resetting the others. Choosing Craft reveals deeper known conversions. Whole intermediate crafting batches are charged; no income is credited for leftovers. The crafting order appears below the buying plan.

## Materials

The Materials view lists purchase quotes and the known recipes using each material, including indirect uses. Opening a raw material such as Ruined Leather Scraps forces the conversions needed to reach that material, so its price limit is shown even when the default route would buy Light Leather. Each recipe card has its own shared spending budget and clearly labeled example target. **Open buying plan** takes you to that exact recipe and ingredient route, preserving the material as a purchased input so its target matches the card.

For a material you know how to craft, **Open craft-and-sell plan** opens its recipe with an AH sale selected. This uses the actual quoted ingredient costs and a 5% AH selling cut. Refunded deposits are not an expense; lost deposits and relisting costs are excluded.

Recipes and Materials have no manual price forms, global profitable material prices, or inferred historical inventory costs. Trial prices belong in the separate Price Calculator.

## Quotes and data

[known-recipes-data.js](known-recipes-data.js) is the recipe source of truth. To add a known recipe, use [add-crafting-recipe](../.claude/skills/add-crafting-recipe/SKILL.md). Ingredient item IDs and curated vendor prices are in [auction-materials.json](auction-materials.json).

The page fetches [Auction House’s US Normal Horde market](https://auctionhouse.tk.gg/api/m/us-2-114) when opened. Minimum listings are snapshot observations, not guaranteed purchase prices or quantities at the minimum. The status shows the scan time. A failed refresh uses older browser-cached or bundled quotes and labels the fallback. Output AH prices are available only for items included in the mappings; unsupported output prices stay unknown.

To refresh the offline [auction-prices.js](auction-prices.js) and [auction-prices.csv](auction-prices.csv) snapshot, use [refresh-auction-prices](../.claude/skills/refresh-auction-prices/SKILL.md), or `npm run prices:refresh`. Newly introduced ingredients need verified item IDs in the mapping file.

## Implementation and verification

The live page uses [planner-core.js](planner-core.js) for a shared price projection and [planner-ui.js](planner-ui.js) for both views. [recipe-buying-plan.js](recipe-buying-plan.js) builds complete ingredient targets and routes. [auction-client.js](auction-client.js) handles live quotes and fallback caching. The older UI modules are not loaded by the redesigned page; their existing regression coverage uses a legacy markup fixture.

Run `npm test` for the data, quote, core calculation, UI, and existing regression checks. The new UI is additionally checked in a real browser at desktop and mobile widths.

## Ready-made ingredients and buying alternatives

Recipes with intermediate inputs offer explicit **Craft [ingredient]** and **Buy [ingredient] ready-made** buttons. Choosing the ready-made route purchases that item directly and removes its raw ingredients from the budget. For pants, buying cured hide means no separate Salt or Light Hide purchase: 100c Fine Thread leaves 498c for 10 Light Leather plus 1 Cured Light Hide.

**What price should I look for?** solves a separate buy limit for every AH ingredient while holding all other purchases at their quoted prices. Every alternative lists those other prices, the combined spend, and final profit. Limits from different alternatives must not be combined. Missing other quotes stay unknown; if no positive purchase price can leave 1c profit, the option says so. Materials cards show the same conditional limits and open the matching recipe route.

For pants, choosing **Craft Light Leather** requires 30 Ruined Leather Scraps for 10 leather. Cured Light Hide can independently remain a ready-made purchase. At 220c cured hide and 100c thread, the 598c purchase budget leaves 278c for all 30 scraps: buy scraps at 9c each or less, giving at least 9c vendor profit. No Salt or raw Light Hide is charged in that route. Crafting the hide instead replaces that ready-made purchase with its own inputs, and every purchased raw material gets a new conditional buy limit.

## Price Calculator

Choose a recipe in the **Price Calculator** tab, or select **Try your own purchase prices** from a recipe to copy its ingredient route. Buy/Craft choices remain independent for all known intermediate inputs, including scraps-to-leather conversions. Enter known AH purchase prices per item in copper; leave prices to solve blank. Fixed vendor supplies are reserved automatically. Set the minimum profit per craft (1c by default). AH selling includes the 5% fee; when the output quote is unavailable, you can enter a proposed AH sale price per output item.

One blank price produces its highest whole-copper buy price for the desired profit. Multiple blanks share the remaining purchase budget and get one complete example; independent maximums are never combined. All filled prices show the resulting profit directly. Over-budget or invalid entries are labeled and cannot appear as a profitable plan. **Use AH quotes** fills available ingredient prices; **Clear my prices** restores blank AH inputs.

Trial inputs are isolated from quotes and other views, are preserved during live quote updates and route changes in this page session, and reset when the page reloads. Each recipe has its own trial purchase prices; a proposed output sale price is cleared when changing recipes.
