/**
 * Lightweight SVG/Canvas Map Renderer
 * Renders European provinces, ownership, and active front lines[cite: 2].
 */

class HOI4MapRenderer {
  constructor(canvasId, gameEngine) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.engine = gameEngine;

    // Color code mapping for nation ideologies & borders[cite: 2]
    this.nationColors = {
      GER: '#4A4A4A', // German Reich (Grey)
      FRA: '#3B5998', // French Republic (Blue)
      SOV: '#A93226', // Soviet Union (Red)
      GBR: '#D4AC0D', // United Kingdom (Yellow)
      ITA: '#229954'  // Italy (Green)
    };

    // Simplified province graph (Node-based grid system)[cite: 2]
    this.provinces = {
      'BER': { name: 'Berlin', x: 420, y: 220, owner: 'GER', terrain: 'plains', infrastructure: 5 },
      'RHR': { name: 'Rhineland', x: 360, y: 250, owner: 'GER', terrain: 'plains', infrastructure: 4 },
      'PAR': { name: 'Paris', x: 280, y: 280, owner: 'FRA', terrain: 'plains', infrastructure: 4 },
      'ALS': { name: 'Alsace', x: 320, y: 300, owner: 'FRA', terrain: 'forest', infrastructure: 3 },
      'MOS': { name: 'Moscow', x: 680, y: 180, owner: 'SOV', terrain: 'plains', infrastructure: 3 }
    };

    this.provinceAdjacency = [
      ['RHR', 'ALS'],
      ['BER', 'RHR'],
      ['PAR', 'ALS']
    ];
  }

  render() {
    // Clear canvas
    this.ctx.fillStyle = '#1c252e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. Draw Adjacency Front Line Connections
    this.ctx.strokeStyle = '#555';
    this.ctx.lineWidth = 2;
    this.provinceAdjacency.forEach(([fromKey, toKey]) => {
      const p1 = this.provinces[fromKey];
      const p2 = this.provinces[toKey];
      this.ctx.beginPath();
      this.ctx.moveTo(p1.x, p1.y);
      this.ctx.lineTo(p2.x, p2.y);
      this.ctx.stroke();

      // Highlight hostile border front line[cite: 2]
      if (p1.owner !== p2.owner) {
        this.drawFrontLineMarker(p1, p2);
      }
    });

    // 2. Draw Province Nodes
    Object.keys(this.provinces).forEach(key => {
      const p = this.provinces[key];
      
      // Node fill by owner nation
      this.ctx.fillStyle = this.nationColors[p.owner] || '#7F8C8D';
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 16, 0, 2 * Math.PI);
      this.ctx.fill();

      // Province Border
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Label
      this.ctx.fillStyle = '#EAEAEA';
      this.ctx.font = '11px sans-serif';
      this.ctx.fillText(p.name, p.x - 18, p.y + 30);
    });
  }

  drawFrontLineMarker(p1, p2) {
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    this.ctx.strokeStyle = '#E74C3C'; // Red dashed front line marker[cite: 2]
    this.ctx.lineWidth = 3;
    this.ctx.setLineDash([4, 4]);
    this.ctx.beginPath();
    this.ctx.arc(midX, midY, 8, 0, 2 * Math.PI);
    this.ctx.stroke();
    this.ctx.setLineDash([]); // Reset dash pattern
  }
}