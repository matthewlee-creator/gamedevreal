/**
 * HOI4 Web Grand Strategy Engine - Combat & Supply System
 * Handles division templates, front lines, combat width, supply, and air/naval modifiers.
 */

// --- DIVISION & TEMPLATE MODEL ---

class Division {
  constructor(id, name, ownerTag, templateType = 'infantry') {
    this.id = id;
    this.name = name;
    this.ownerTag = ownerTag;
    this.templateType = templateType;

    // Base division stats (simplified model)
    const baseStats = this.getTemplateStats(templateType);
    
    this.maxOrganization = baseStats.maxOrganization;
    this.currentOrganization = baseStats.maxOrganization;
    this.maxHp = baseStats.maxHp;
    this.currentHp = baseStats.maxHp;
    
    this.softAttack = baseStats.softAttack;
    this.hardAttack = baseStats.hardAttack;
    this.defense = baseStats.defense;
    this.breakthrough = baseStats.breakthrough;
    this.combatWidth = baseStats.combatWidth; // e.g., 20 or 40 width
    this.supplyConsumption = baseStats.supplyConsumption;
    
    this.digInLevel = 0; // Entrenchment bonus when stationary
    this.isRetreating = false;
  }

  getTemplateStats(type) {
    switch (type) {
      case 'armored':
        return { maxOrganization: 40, maxHp: 100, softAttack: 28, hardAttack: 18, defense: 15, breakthrough: 36, combatWidth: 30, supplyConsumption: 1.8 };
      case 'motorized':
        return { maxOrganization: 55, maxHp: 120, softAttack: 16, hardAttack: 5, defense: 22, breakthrough: 18, combatWidth: 20, supplyConsumption: 1.2 };
      case 'infantry':
      default:
        return { maxOrganization: 60, maxHp: 150, softAttack: 12, hardAttack: 3, defense: 28, breakthrough: 8, combatWidth: 20, supplyConsumption: 0.8 };
    }
  }
}

// --- FRONT LINE & BATTLE RESOLUTION ---[cite: 2]

class ActiveBattle {
  constructor(battleId, provinceId, attackers, defenders, terrain = 'plains') {
    this.battleId = battleId;
    this.provinceId = provinceId;
    this.attackers = attackers; // Array of Division objects
    this.defenders = defenders; // Array of Division objects
    this.terrain = terrain;
    
    // Combat parameters[cite: 2]
    this.baseCombatWidth = 80; // Standard HOI4 base frontage[cite: 2]
    this.airSupremacyFactor = 0.0; // -1.0 (Defender full air control) to +1.0 (Attacker full air control)[cite: 2]
    this.isResolved = false;
    this.winner = null; // 'attacker' or 'defender'
  }

  getTerrainModifier() {
    switch (this.terrain) {
      case 'mountains': return { attackPenalty: 0.40, combatWidthMult: 0.66 };
      case 'forest':    return { attackPenalty: 0.20, combatWidthMult: 0.80 };
      case 'urban':     return { attackPenalty: 0.30, combatWidthMult: 0.90 };
      case 'plains':
      default:          return { attackPenalty: 0.00, combatWidthMult: 1.00 };
    }
  }

  // Executes one daily tick of battle combat width & damage calculations[cite: 2]
  resolveDailyTick() {
    if (this.isResolved) return;

    const terrainMod = this.getTerrainModifier();
    const activeWidthLimit = this.baseCombatWidth * terrainMod.combatWidthMult;

    // 1. Select divisions fitting within available combat width[cite: 2]
    const activeAttackers = this.selectUnitsForFrontage(this.attackers, activeWidthLimit);
    const activeDefenders = this.selectUnitsForFrontage(this.defenders, activeWidthLimit);

    if (activeAttackers.length === 0) {
      this.isResolved = true;
      this.winner = 'defender';
      return;
    }
    if (activeDefenders.length === 0) {
      this.isResolved = true;
      this.winner = 'attacker';
      return;
    }

    // 2. Air Superiority Combat Bonus[cite: 2]
    const attackerAirBonus = Math.max(0, this.airSupremacyFactor * 0.25);
    const defenderAirBonus = Math.max(0, -this.airSupremacyFactor * 0.25);

    // 3. Aggregate Total Offense vs. Defense
    let totalAttackerSoftDamage = 0;
    activeAttackers.forEach(unit => {
      let unitDamage = unit.softAttack * (1 - terrainMod.attackPenalty) * (1 + attackerAirBonus);
      totalAttackerSoftDamage += unitDamage;
    });

    let totalDefenderSoftDamage = 0;
    activeDefenders.forEach(unit => {
      let entrenchmentBonus = 1 + (unit.digInLevel * 0.05);
      let unitDamage = unit.softAttack * entrenchmentBonus * (1 + defenderAirBonus);
      totalDefenderSoftDamage += unitDamage;
    });

    // 4. Apply Organization & HP Damage to Defenders[cite: 2]
    const defenderDamagePerUnit = totalAttackerSoftDamage / activeDefenders.length;
    activeDefenders.forEach(defender => {
      // Organization damage determines combat endurance[cite: 2]
      defender.currentOrganization -= (defenderDamagePerUnit * 0.15);
      defender.currentHp -= (defenderDamagePerUnit * 0.05);
    });

    // 5. Apply Organization & HP Damage to Attackers[cite: 2]
    const attackerDamagePerUnit = totalDefenderSoftDamage / activeAttackers.length;
    activeAttackers.forEach(attacker => {
      attacker.currentOrganization -= (attackerDamagePerUnit * 0.12);
      attacker.currentHp -= (attackerDamagePerUnit * 0.04);
    });

    // 6. Check for shattered or retreating units (Organization <= 0)[cite: 2]
    this.cleanUpRetreatedUnits();
  }

  selectUnitsForFrontage(units, maxFrontage) {
    let currentWidth = 0;
    const selected = [];
    for (const unit of units) {
      if (unit.currentOrganization > 0 && (currentWidth + unit.combatWidth <= maxFrontage)) {
        selected.push(unit);
        currentWidth += unit.combatWidth;
      }
    }
    return selected;
  }

  cleanUpRetreatedUnits() {
    const remainingAttackers = this.attackers.filter(u => u.currentOrganization > 0);
    const remainingDefenders = this.defenders.filter(u => u.currentOrganization > 0);

    if (remainingAttackers.length === 0) {
      this.isResolved = true;
      this.winner = 'defender';
    } else if (remainingDefenders.length === 0) {
      this.isResolved = true;
      this.winner = 'attacker';
    }
  }
}

// --- SUPPLY & NAVAL SUPREMACY ENGINE ---[cite: 2]

class SupplyAndNavalManager {
  constructor(nations) {
    this.nations = nations;
    this.seaZones = {
      'English_Channel': { controller: null, attackerSupremacy: 0, defenderSupremacy: 0 },
      'North_Sea': { controller: null, attackerSupremacy: 0, defenderSupremacy: 0 },
      'Mediterranean': { controller: null, attackerSupremacy: 0, defenderSupremacy: 0 }
    };
  }

  // Simple naval battle resolution for sea zone control[cite: 2]
  resolveNavalPresence(zoneId, nationTag, fleetStrength) {
    const zone = this.seaZones[zoneId];
    if (!zone) return;

    if (fleetStrength > 50) {
      zone.controller = nationTag; // Controls naval supremacy[cite: 2]
    }
  }

  // Naval supremacy dictates trade route viability[cite: 2]
  checkTradeRouteSafety(originTag, destinationTag, requiredSeaZone) {
    const zone = this.seaZones[requiredSeaZone];
    if (!zone || !zone.controller) return true; // Uncontested sea zone

    // If an enemy nation controls the sea zone, naval trade is blockaded[cite: 2]
    if (zone.controller !== originTag && zone.controller !== destinationTag) {
      return false; // Interdicted by hostile naval supremacy[cite: 2]
    }
    return true;
  }

  // Calculate province supply caps against total division consumption[cite: 2]
  calculateProvinceSupply(province, divisionsInProvince) {
    const totalSupplyCapacity = province.infrastructureLevel * 10 + (province.hasSupplyHub ? 35 : 0);
    const totalDemand = divisionsInProvince.reduce((sum, unit) => sum + unit.supplyConsumption, 0);

    const supplyRatio = Math.min(1.0, totalSupplyCapacity / Math.max(1, totalDemand));

    // Apply out-of-supply penalties if demand exceeds capacity[cite: 2]
    if (supplyRatio < 1.0) {
      divisionsInProvince.forEach(unit => {
        unit.currentOrganization = Math.max(0, unit.currentOrganization - (1.0 - supplyRatio) * 2.0);
      });
    }

    return { supplyCapacity: totalSupplyCapacity, demand: totalDemand, ratio: supplyRatio };
  }
}