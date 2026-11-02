// Add to HOI4GameEngine constructor:
this.navalManager = new SupplyAndNavalManager(this.nations); //[cite: 2]
this.tradeEngine = new TradeEngine(this, this.navalManager); //[cite: 2]

// Update processEconomy() inside game-engine.js:
processEconomy() {
  // 1. Process trade route checks & resource efficiency calculations[cite: 2]
  this.tradeEngine.processDailyTradeTick(); //[cite: 2]

  // 2. Advance production lines accounting for resource shortages[cite: 2]
  Object.keys(this.nations).forEach(tag => {
    const nation = this.nations[tag];
    
    nation.productionLines.forEach(line => {
      // Efficiency factor applied directly from trade calculations[cite: 2]
      const resourceEfficiency = line.currentResourceEfficiency || 1.0; 
      const dailyProgress = line.allocatedFactories * line.outputRate * resourceEfficiency * 0.1;
      
      line.progress += dailyProgress;
      if (line.progress >= 100) {
        line.progress -= 100;
        // Equipment stockpiled
      }
    });
  });
}