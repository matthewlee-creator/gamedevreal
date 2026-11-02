// Add to HOI4GameEngine constructor:
this.aiEngine = new AIPersonalityEngine(this);
this.eventEngine = new HistoricalEventEngine(this, this.aiEngine);

// Add to onDailyTick() inside game-engine.js:
onDailyTick() {
  // Advance Game Clock
  this.currentDate.setDate(this.currentDate.getDate() + 1);

  // 1. Process Economy & Production Lines[cite: 2]
  this.processEconomy();

  // 2. Process AI Decisions[cite: 2]
  this.aiEngine.processDailyAITick();

  // 3. Process Historical Triggers & Milestones[cite: 2]
  this.eventEngine.processDailyEventTick();

  // 4. Process Stability & Ideology Drift[cite: 2]
  this.processInternalPolitics();

  // 5. Check Year / Milestone Hard Stops[cite: 2]
  this.checkGameConditions();
}