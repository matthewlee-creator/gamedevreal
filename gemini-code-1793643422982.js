/**
 * Main Game Initializer & Glue Code
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Main Game Engine (Player: GER, Normal Difficulty)
  const game = new HOI4GameEngine('GER', 'normal');

  // 2. Instantiate Subsystems
  const navalManager = new SupplyAndNavalManager(game.nations);
  const tradeEngine = new TradeEngine(game, navalManager);
  const aiEngine = new AIPersonalityEngine(game);
  const eventEngine = new HistoricalEventEngine(game, aiEngine);
  const mapRenderer = new HOI4MapRenderer('hoi4Canvas', game);

  // Attach subsystems to main engine instance
  game.tradeEngine = tradeEngine;
  game.aiEngine = aiEngine;
  game.eventEngine = eventEngine;

  // Selected state for canvas unit movement
  let selectedProvinceKey = null;

  // 3. UI Sync Callback on Daily Tick
  game.onUIUpdate = (state) => {
    document.getElementById('ui-date').innerText = state.date;
    document.getElementById('ui-stability').innerText = state.stability;
    document.getElementById('ui-civ-fac').innerText = state.civilianFactories;
    document.getElementById('ui-mil-fac').innerText = state.militaryFactories;

    // Redraw map canvas
    mapRenderer.render();
  };

  // 4. Canvas Interactivity (Selecting Provinces & Moving Units)
  const canvas = document.getElementById('hoi4Canvas');
  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Check click collision against province nodes
    Object.keys(mapRenderer.provinces).forEach(key => {
      const p = mapRenderer.provinces[key];
      const dist = Math.hypot(p.x - clickX, p.y - clickY);

      if (dist <= 16) { // Node radius
        if (!selectedProvinceKey) {
          selectedProvinceKey = key;
          console.log(`Selected province: ${p.name}`);
        } else {
          console.log(`Issued movement/attack command from ${selectedProvinceKey} to ${key}`);
          selectedProvinceKey = null;
        }
      }
    });
  });

  // 5. Controls & Pause Toggle
  const btnPause = document.getElementById('btn-pause');
  btnPause.addEventListener('click', () => {
    game.togglePause();
    btnPause.innerText = game.isPaused ? 'Play' : 'Pause';
  });

  // Initial draw
  mapRenderer.render();
});