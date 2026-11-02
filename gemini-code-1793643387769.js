/**
 * HOI4 Web Grand Strategy Engine - Trade & Resource Economy
 * Manages raw materials, market agreements, factory allocations, and trade blockades[cite: 2].
 */

class TradeEngine {
  constructor(gameEngine, navalManager) {
    this.game = gameEngine;
    this.navalManager = navalManager;
    
    // Resource constants
    this.RESOURCE_TYPES = ['steel', 'aluminum', 'oil', 'rubber']; // Core strategic resources[cite: 2]
    this.UNITS_PER_CIV_FACTORY = 8; // Standard trade rate: 1 Civilian Factory buys 8 units of a resource
    
    this.activeTradeDeals = []; // Array of active trade objects
  }

  /**
   * Calculates dynamic available resources for a nation (Local Production + Imports - Exports)
   */
  getNationResourceBalance(tag) {
    const nation = this.game.nations[tag];
    if (!nation) return null;

    // Base local resource production
    const balance = {
      steel: nation.resources.steel || 0,
      aluminum: nation.resources.aluminum || 0,
      oil: nation.resources.oil || 0,
      rubber: nation.resources.rubber || 0,
      civFactoriesAllocatedToTrade: 0
    };

    // Calculate active trade imports and exports
    this.activeTradeDeals.forEach(deal => {
      if (deal.status !== 'ACTIVE') return;

      // Imports coming into this nation
      if (deal.importer === tag) {
        if (deal.isBlockaded) return; // Blockaded imports yield 0 resources[cite: 2]
        balance[deal.resourceType] += deal.amount;
        balance.civFactoriesAllocatedToTrade += deal.civFactoriesCost;
      }

      // Exports leaving this nation
      if (deal.exporter === tag) {
        balance[deal.resourceType] -= deal.amount;
      }
    });

    return balance;
  }

  /**
   * Calculates total Civilian Factories available for domestic construction/use
   */
  getAvailableCivilianFactories(tag) {
    const nation = this.game.nations[tag];
    const resourceBalance = this.getNationResourceBalance(tag);
    return Math.max(0, nation.civilianFactories - resourceBalance.civFactoriesAllocatedToTrade);
  }

  /**
   * Initiates a new trade deal between importer and exporter
   */
  createTradeDeal(importerTag, exporterTag, resourceType, requestedAmount, requiredSeaZone = null) {
    const importer = this.game.nations[importerTag];
    const exporter = this.game.nations[exporterTag];

    if (!importer || !exporter) return { success: false, reason: "Invalid nation tag." };
    if (!this.RESOURCE_TYPES.includes(resourceType)) return { success: false, reason: "Invalid resource type." };

    // 1. Calculate required civilian factories
    const civFactoriesNeeded = Math.ceil(requestedAmount / this.UNITS_PER_CIV_FACTORY);
    const availableCivs = this.getAvailableCivilianFactories(importerTag);

    if (availableCivs < civFactoriesNeeded) {
      return { success: false, reason: "Insufficient free civilian factories." };
    }

    // 2. Check if exporter has enough surplus resources
    const exporterBalance = this.getNationResourceBalance(exporterTag);
    if (exporterBalance[resourceType] < requestedAmount) {
      return { success: false, reason: "Exporter has insufficient resource surplus." };
    }

    // 3. Create Deal Record
    const deal = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      importer: importerTag,
      exporter: exporterTag,
      resourceType: resourceType,
      amount: requestedAmount,
      civFactoriesCost: civFactoriesNeeded,
      requiredSeaZone: requiredSeaZone, // e.g., 'English_Channel'[cite: 2]
      isBlockaded: false,
      status: 'ACTIVE'
    };

    // Verify naval safety immediately if route involves shipping[cite: 2]
    if (requiredSeaZone) {
      const isSafe = this.navalManager.checkTradeRouteSafety(importerTag, exporterTag, requiredSeaZone); //[cite: 2]
      deal.isBlockaded = !isSafe;
    }

    this.activeTradeDeals.push(deal);
    return { success: true, deal: deal };
  }

  /**
   * Cancels an existing trade deal
   */
  cancelTradeDeal(dealId) {
    const index = this.activeTradeDeals.findIndex(d => d.id === dealId);
    if (index !== -1) {
      this.activeTradeDeals[index].status = 'CANCELLED';
      this.activeTradeDeals.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Evaluates trade blockades and updates production efficiency for all nations on daily tick[cite: 2]
   */
  processDailyTradeTick() {
    // 1. Re-evaluate naval supremacy for all active sea trade routes[cite: 2]
    this.activeTradeDeals.forEach(deal => {
      if (deal.requiredSeaZone && deal.status === 'ACTIVE') {
        const isSafe = this.navalManager.checkTradeRouteSafety(deal.importer, deal.exporter, deal.requiredSeaZone); //[cite: 2]
        deal.isBlockaded = !isSafe;
      }
    });

    // 2. Apply Resource Requirements to Production Lines[cite: 2]
    Object.keys(this.game.nations).forEach(tag => {
      const nation = this.game.nations[tag];
      const currentResources = this.getNationResourceBalance(tag);
      
      // Calculate total resource demand from active production lines
      const resourceDemand = { steel: 0, aluminum: 0, oil: 0, rubber: 0 };
      
      nation.productionLines.forEach(line => {
        const lineReqs = this.getProductionResourceRequirements(line.item, line.allocatedFactories);
        resourceDemand.steel += lineReqs.steel || 0;
        resourceDemand.aluminum += lineReqs.aluminum || 0;
        resourceDemand.oil += lineReqs.oil || 0;
        resourceDemand.rubber += lineReqs.rubber || 0;
      });

      // Calculate efficiency multiplier based on resource fulfillment ratio[cite: 2]
      nation.productionLines.forEach(line => {
        const reqs = this.getProductionResourceRequirements(line.item, line.allocatedFactories);
        let lineEfficiency = 1.0;

        this.RESOURCE_TYPES.forEach(res => {
          if (reqs[res] > 0) {
            const ratio = currentResources[res] / Math.max(1, resourceDemand[res]);
            if (ratio < 1.0) {
              // Missing resources scale down line progress down to a minimum of 10% base speed[cite: 2]
              lineEfficiency *= Math.max(0.1, ratio);
            }
          }
        });

        line.currentResourceEfficiency = lineEfficiency;
      });
    });
  }

  /**
   * Returns resource costs per factory for equipment types[cite: 2]
   */
  getProductionResourceRequirements(itemType, factoryCount) {
    const baseRequirements = {
      'infantry_equipment': { steel: 2, aluminum: 0, oil: 0, rubber: 0 },
      'support_equipment': { steel: 1, aluminum: 1, oil: 0, rubber: 0 },
      'light_tank':         { steel: 3, aluminum: 0, oil: 1, rubber: 1 },
      'medium_tank':        { steel: 4, aluminum: 0, oil: 2, rubber: 1 },
      'fighter_aircraft':   { steel: 1, aluminum: 3, oil: 1, rubber: 1 }
    };

    const base = baseRequirements[itemType] || { steel: 1, aluminum: 0, oil: 0, rubber: 0 };
    return {
      steel: base.steel * factoryCount,
      aluminum: base.aluminum * factoryCount,
      oil: base.oil * factoryCount,
      rubber: base.rubber * factoryCount
    };
  }
}