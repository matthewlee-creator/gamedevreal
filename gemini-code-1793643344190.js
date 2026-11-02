/**
 * HOI4 Web Grand Strategy Engine
 * Scope: Europe (1936 - 1955)
 */

class HOI4GameEngine {
  constructor(playerCountryCode = 'GER', difficulty = 'normal') {
    // Difficulty affects AI modifiers only, never the player
    this.difficulty = difficulty; 
    this.isPaused = true;
    this.gameSpeed = 1; // 1 (slow) to 5 (fast)
    this.tickInterval = null;
    this.tickRateMs = 1000; // Base speed: 1 day per second

    // Time Tracking (1936 - 1955 hard-stop)
    this.currentDate = new Date(1936, 0, 1);
    this.endDate = new Date(1955, 11, 31);

    // Player Assignment
    this.playerCountry = playerCountryCode;

    // World State Data Structures
    this.nations = {};
    this.factions = {};
    this.tradeRoutes = [];
    
    this.initDefaultNations();
  }

  initDefaultNations() {
    // Core Nation State Template
    const nationDefaults = {
      GER: {
        name: "German Reich",
        ideology: "fascism", // Modifier-based, no focus trees
        stability: 0.85, // 0.0 to 1.0 (triggers civil war below critical thresholds)[cite: 2]
        warExhaustion: 0.0,
        resources: { steel: 120, aluminum: 40, oil: 10, rubber: 5 },
        civilianFactories: 35,
        militaryFactories: 28,
        navalDockyards: 10,
        productionLines: [
          { item: 'infantry_equipment', allocatedFactories: 10, progress: 0, outputRate: 15 },
          { item: 'light_tank', allocatedFactories: 5, progress: 0, outputRate: 4 }
        ],
        intel: {}, // Spy/intel network data (intel hidden without spying/alliance)[cite: 2]
        isOccupied: false
      },
      FRA: {
        name: "French Republic",
        ideology: "democratic",
        stability: 0.50, // High instability modifier[cite: 2]
        warExhaustion: 0.0,
        resources: { steel: 80, aluminum: 60, oil: 5, rubber: 0 },
        civilianFactories: 25,
        militaryFactories: 15,
        navalDockyards: 8,
        productionLines: [
          { item: 'infantry_equipment', allocatedFactories: 8, progress: 0, outputRate: 10 }
        ],
        intel: {},
        isOccupied: false
      },
      SOV: {
        name: "Soviet Union",
        ideology: "communism",
        stability: 0.70,
        warExhaustion: 0.0,
        resources: { steel: 150, aluminum: 50, oil: 90, rubber: 0 },
        civilianFactories: 40,
        militaryFactories: 30,
        navalDockyards: 5,
        productionLines: [],
        intel: {},
        isOccupied: false
      }
    };

    this.nations = nationDefaults;
  }

  // --- TIME & TICK ENGINE ---[cite: 2]

  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    } else {
      this.startLoop();
    }
  }

  setSpeed(speedLevel) {
    this.gameSpeed = Math.max(1, Math.min(5, speedLevel));
    this.tickRateMs = 1200 / (this.gameSpeed * 1.5); // Scaled tick delay
    if (!this.isPaused) {
      clearInterval(this.tickInterval);
      this.startLoop();
    }
  }

  startLoop() {
    this.tickInterval = setInterval(() => {
      this.onDailyTick();
    }, this.tickRateMs);
  }

  onDailyTick() {
    // Advance Game Clock
    this.currentDate.setDate(this.currentDate.getDate() + 1);

    // 1. Process Economy & Production Lines[cite: 2]
    this.processEconomy();

    // 2. Process AI Decisions & Triggered Events[cite: 2]
    this.processAITick();

    // 3. Process Stability & Ideology Drift[cite: 2]
    this.processInternalPolitics();

    // 4. Check Year / Milestone Hard Stops[cite: 2]
    this.checkGameConditions();

    // 5. Daily Autosave Trigger (Every 30 Game Days)[cite: 2]
    if (this.currentDate.getDate() === 1) {
      this.saveToLocalStorage();
    }

    // Trigger UI Update Callback
    if (typeof this.onUIUpdate === 'function') {
      this.onUIUpdate(this.getStateSummary());
    }
  }

  // --- ECONOMIC ENGINE ---[cite: 2]

  processEconomy() {
    Object.keys(this.nations).forEach(tag => {
      const nation = this.nations[tag];
      
      // Advance Production Lines based on factory output & resource access
      nation.productionLines.forEach(line => {
        const resourceEfficiency = 1.0; // Reduced if missing steel/oil/rubber[cite: 2]
        const dailyProgress = line.allocatedFactories * line.outputRate * resourceEfficiency * 0.1;
        line.progress += dailyProgress;

        if (line.progress >= 100) {
          line.progress -= 100;
          // Completed item added to national stockpile
        }
      });
    });
  }

  // --- INTERNAL POLITICS & STABILITY ---[cite: 2]

  processInternalPolitics() {
    Object.keys(this.nations).forEach(tag => {
      const nation = this.nations[tag];
      
      // High war exhaustion degrades stability[cite: 2]
      if (nation.warExhaustion > 0.5) {
        nation.stability -= 0.001;
      }

      // Check for low stability civil war threshold[cite: 2]
      if (nation.stability < 0.20 && !nation.inCivilWar) {
        this.triggerCivilWar(tag);
      }
    });
  }

  triggerCivilWar(countryTag) {
    if (countryTag === this.playerCountry) {
      // Player temporarily loses full control or faces severe disruption during civil war[cite: 2]
      console.warn("CRITICAL: Civil war broken out in player's nation!");
    }
  }

  // --- AI PERSONALITY & HISTORICAL TRIGGERS ---[cite: 2]

  processAITick() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth() + 1;
    const day = this.currentDate.getDate();

    // Historical Year-Triggered Event Example (Anschluss 1938)[cite: 2]
    if (year === 1938 && month === 3 && day === 12) {
      this.triggerEvent('ANSCHLUSS_EVENT');
    }
  }

  triggerEvent(eventId) {
    if (eventId === 'ANSCHLUSS_EVENT') {
      // Execute Anschluss event consequences[cite: 2]
    }
  }

  // --- VICTORY & GAME OVER CHECKS ---[cite: 2]

  checkGameConditions() {
    // 1. Check Player Total Occupation Game Over[cite: 2]
    if (this.nations[this.playerCountry].isOccupied) {
      this.togglePause();
      alert("Your nation has been fully occupied. Game Over!"); // No government-in-exile[cite: 2]
      return;
    }

    // 2. 1955 Sandbox Hard-Stop[cite: 2]
    if (this.currentDate >= this.endDate) {
      this.togglePause();
      alert("Reached December 31, 1955. Sandbox playthrough complete!");[cite: 2]
    }
  }

  // --- LOCALSTORAGE SAVE SYSTEM ---[cite: 2]

  saveToLocalStorage() {
    const saveData = {
      currentDate: this.currentDate.toISOString(),
      playerCountry: this.playerCountry,
      difficulty: this.difficulty,
      nations: this.nations
    };
    localStorage.setItem('hoi4_web_savegame', JSON.stringify(saveData));
  }

  loadFromLocalStorage() {
    const raw = localStorage.getItem('hoi4_web_savegame');
    if (!raw) return false;
    
    const saveData = JSON.parse(raw);
    this.currentDate = new Date(saveData.currentDate);
    this.playerCountry = saveData.playerCountry;
    this.difficulty = saveData.difficulty;
    this.nations = saveData.nations;
    return true;
  }

  getStateSummary() {
    const player = this.nations[this.playerCountry];
    return {
      date: this.currentDate.toISOString().split('T')[0],
      playerTag: this.playerCountry,
      stability: (player.stability * 100).toFixed(1) + '%',
      civilianFactories: player.civilianFactories,
      militaryFactories: player.militaryFactories
    };
  }
}