const factionAuctionCutPercent = 5;

function purchaseUnitCost(name, prices, quotes) {
  const setting = prices.get(name);
  return setting?.manual ? setting.price ?? null : quotes[name]?.vendorCopper ?? setting?.price ?? null;
}

function auctionSaleVerdict(cost, price) {
  const sale = auctionSaleCosts(cost, price);
  if (sale.profit === null) return 'Current AH profitability is unknown: a price is missing.';
  return sale.profit > 0
    ? `Potential profit at the current AH price: ${formatPrice(sale.profit)} per item after the fee.`
    : sale.profit < 0
      ? `Do not craft for AH at current prices: selling at ${formatPrice(price)} loses ${formatPrice(-sale.profit)} per item after the fee.`
      : `No profit at the current AH price of ${formatPrice(price)}: it only covers costs.`;
}

function minimumProfitableAuctionPrice(craftCost) {
  if (craftCost === null || !Number.isFinite(craftCost) || craftCost < 0) return null;
  let low = Math.floor(craftCost) + 1;
  let high = Math.floor(craftCost / (1 - factionAuctionCutPercent / 100)) + 1;
  while (low < high) {
    const price = Math.floor((low + high) / 2);
    if (auctionSaleCosts(craftCost, price).profit > 0) high = price;
    else low = price + 1;
  }
  return low;
}

function auctionSaleCosts(craftCost, salePrice, quantity = 1) {
  if (salePrice === null) return { fee: null, totalCost: null, profit: null };
  const revenue = salePrice * quantity;
  const fee = Math.floor(revenue * factionAuctionCutPercent / 100);
  const totalCost = craftCost === null ? null : craftCost + fee;
  return { fee, totalCost, profit: totalCost === null ? null : revenue - totalCost };
}

