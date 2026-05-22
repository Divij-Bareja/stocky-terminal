export function computeHoldingMetrics(holding) {
  const quantity = Number(holding.quantity) || 0;
  const currentPrice = Number(holding.currentPrice) || 0;
  const averageBuyPrice = Number(holding.averageBuyPrice ?? holding.averagePrice) || 0;

  const marketValue = quantity * currentPrice;
  const costBasis = quantity * averageBuyPrice;
  const unrealizedPnL = marketValue - costBasis;
  const unrealizedPnLPercent =
    costBasis > 0 ? (unrealizedPnL / costBasis) * 100 : 0;

  return {
    marketValue,
    costBasis,
    unrealizedPnL,
    unrealizedPnLPercent,
  };
}

export function computePortfolioAnalytics(portfolio) {
  if (!portfolio) {
    return {
      balance: 0,
      holdingsValue: 0,
      totalInvested: 0,
      totalPortfolioValue: 0,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      holdingsWithMetrics: [],
    };
  }

  const balance = Number(portfolio.balance) || 0;
  const holdings = portfolio.holdings ?? [];

  let totalInvested = 0;
  let holdingsValue = 0;
  let unrealizedPnL = 0;

  const holdingsWithMetrics = holdings.map((holding) => {
    const metrics = computeHoldingMetrics(holding);
    totalInvested += metrics.costBasis;
    holdingsValue += metrics.marketValue;
    unrealizedPnL += metrics.unrealizedPnL;
    return { holding, metrics };
  });

  const totalPortfolioValue = balance + holdingsValue;
  const unrealizedPnLPercent =
    totalInvested > 0 ? (unrealizedPnL / totalInvested) * 100 : 0;

  return {
    balance,
    holdingsValue,
    totalInvested,
    totalPortfolioValue,
    unrealizedPnL,
    unrealizedPnLPercent,
    holdingsWithMetrics,
  };
}
