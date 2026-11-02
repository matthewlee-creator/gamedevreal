/**
 * HOI4 Web Grand Strategy Engine - Historical Event System
 * Triggers date/condition-based historical events and handles outcomes[cite: 2].
 */

class HistoricalEventEngine {
  constructor(gameEngine, aiEngine) {
    this.game = gameEngine;
    this.ai = aiEngine;

    this.firedEvents = new Set();
    this.eventRegistry = this.initHistoricalEvents();
  }

  /**
   * Defines historical event database (1936-1955)[cite: 2]
   */
  initHistoricalEvents() {
    return [
      {
        id: 'ANSCHLUSS_1938',
        title: 'The Anschluss of Austria',
        description: 'Germany demands immediate unification with Austria to consolidate all German-speaking peoples.',
        triggerCondition: (date, nations) => {
          return date.getFullYear() === 1938 && date.getMonth() === 2 && date.getDate() >= 12; // March 12, 1938[cite: 2]
        },
        targetCountry: 'GER',
        options: [
          {
            id: 'ANNEX_AUSTRIA',
            text: 'Demand annexation of Austria (Historical)',
            isHistorical: true,
            isAggressive: true,
            effect: (game) => {
              // Annex Austria into German Reich[cite: 2]
              if (game.nations['GER']) {
                game.nations['GER'].civilianFactories += 6;
                game.nations['GER'].militaryFactories += 4;
                game.nations['GER'].resources.steel += 15;
                game.nations['GER'].stability += 0.05;
              }
              return "Germany has annexed Austria!";
            }
          },
          {
            id: 'REFRAIN',
            text: 'Respect Austrian sovereignty',
            isHistorical: false,
            effect: (game) => {
              if (game.nations['GER']) game.nations['GER'].stability -= 0.05;
              return "Germany decided not to press claims on Austria.";
            }
          }
        ]
      },
      {
        id: 'DANZIG_OR_WAR_1939',
        title: 'Danzig or War',
        description: 'Germany issues an ultimatum to Poland demanding the return of Danzig and a transit corridor across Pomerania.',
        triggerCondition: (date, nations) => {
          return date.getFullYear() === 1939 && date.getMonth() === 7 && date.getDate() >= 24; // August 24, 1939[cite: 2]
        },
        targetCountry: 'GER',
        options: [
          {
            id: 'DEMAND_DANZIG',
            text: 'Issue the ultimatum for Danzig! (Triggers WWII)',
            isHistorical: true,
            isAggressive: true,
            effect: (game) => {
              // Sets war status between Axis and Allies[cite: 2]
              if (game.nations['GER']) game.nations['GER'].warExhaustion = 0.0;
              return "Germany has issued the ultimatum. World War II has begun!";
            }
          },
          {
            id: 'BACK_DOWN',
            text: 'Seek a peaceful diplomatic resolution',
            isHistorical: false,
            effect: (game) => {
              return "Germany refrained from invading Poland. Peace holds temporarily.";
            }
          }
        ]
      },
      {
        id: 'NATO_FOUNDING_1949',
        title: 'Founding of NATO',
        description: 'Western democratic powers sign the North Atlantic Treaty, creating a unified defensive alliance.',
        triggerCondition: (date, nations) => {
          return date.getFullYear() === 1949 && date.getMonth() === 3 && date.getDate() >= 4; // April 4, 1949[cite: 2]
        },
        targetCountry: 'FRA',
        options: [
          {
            id: 'FOUND_NATO',
            text: 'Establish the Atlantic Alliance (Soft Milestone)',
            isHistorical: true,
            effect: (game) => {
              // Soft milestone event; sandbox gameplay continues[cite: 2]
              if (game.nations['FRA']) game.nations['FRA'].stability += 0.10;
              if (game.nations['GBR']) game.nations['GBR'].stability += 0.10;
              return "NATO has been founded to secure Western Europe.";
            }
          }
        ]
      }
    ];
  }

  /**
   * Daily Event Processor[cite: 2]
   */
  processDailyEventTick() {
    this.eventRegistry.forEach(event => {
      if (this.firedEvents.has(event.id)) return;

      if (event.triggerCondition(this.game.currentDate, this.game.nations)) {
        this.firedEvents.add(event.id);
        this.executeEvent(event);
      }
    });
  }

  /**
   * Executes event logic for Player vs AI[cite: 2]
   */
  executeEvent(event) {
    const targetTag = event.targetCountry;

    if (targetTag === this.game.playerCountry) {
      // Pause game and present interactive dialog UI to the player[cite: 2]
      this.game.togglePause();
      this.presentPlayerEventModal(event);
    } else {
      // AI chooses based on personality profile[cite: 2]
      const chosenOptionId = this.ai.evaluateEventChoice(event, event.options, targetTag);
      const option = event.options.find(o => o.id === chosenOptionId);
      const resultMessage = option.effect(this.game);
      console.log(`[EVENT] ${event.title}: ${resultMessage}`);
    }
  }

  /**
   * Player Event Popup Renderer
   */
  presentPlayerEventModal(event) {
    let optionsHTML = '';
    event.options.forEach((opt) => {
      optionsHTML += `<button style="display:block; width:100%; margin:8px 0; padding:8px;" onclick="eventEngine.selectPlayerOption('${event.id}', '${opt.id}')">${opt.text}</button>`;
    });

    const modalHTML = `
      <div id="event-modal-overlay" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:9999;">
        <div style="background:#222b35; border:2px solid #5d6d7e; padding:20px; max-width:500px; width:90%; color:#fff;">
          <h2>${event.title}</h2>
          <p>${event.description}</p>
          <hr style="border-color:#444;">
          ${optionsHTML}
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  /**
   * Callback for player UI decision
   */
  selectPlayerOption(eventId, optionId) {
    const event = this.eventRegistry.find(e => e.id === eventId);
    const option = event.options.find(o => o.id === optionId);

    const resultMessage = option.effect(this.game);
    alert(resultMessage);

    // Remove modal overlay and resume flow
    const modal = document.getElementById('event-modal-overlay');
    if (modal) modal.remove();
  }

  /**
   * Peace Settlement Engine: Annex vs. Puppet Government[cite: 2]
   */
  resolveNationConquest(conquerorTag, victimTag, choice = 'ANNEX') {
    const victim = this.game.nations[victimTag];
    const conqueror = this.game.nations[conquerorTag];

    if (!victim || !conqueror) return;

    if (choice === 'ANNEX') {
      // Full Annexation: Transfer all factory count directly[cite: 2]
      conqueror.civilianFactories += Math.floor(victim.civilianFactories * 0.7);
      conqueror.militaryFactories += Math.floor(victim.militaryFactories * 0.7);
      victim.isOccupied = true;
    } else if (choice === 'PUPPET') {
      // Puppet Government: Loyal puppet matching ideology[cite: 2]
      victim.ideology = conqueror.ideology;
      victim.stability = 0.60;
      victim.isPuppet = true;
      victim.masterTag = conquerorTag;
    }
  }
}