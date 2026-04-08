/**
 * @component HealthGauge
 * @spec: system-health-display
 * 
 * Circular gauge for displaying system health status.
 */

export class HealthGauge {
  constructor(element, options = {}) {
    this.element = element;
    this.value = options.value || 0; // 0-100
    this.label = options.label || 'Health';
    this.size = options.size || 200;

    this.init();
  }

  init() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.element.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this.draw();
  }

  draw() {
    const centerX = this.size / 2;
    const centerY = this.size / 2;
    const radius = this.size / 2 - 20;

    // Background circle
    this.ctx.clearRect(0, 0, this.size, this.size);
    this.ctx.fillStyle = '#ecf0f1';
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    this.ctx.fill();

    // Status arc
    const endAngle = (Math.PI / 180) * (360 * (this.value / 100));
    const color = this.getColor(this.value);

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 15;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius - 8, 0, endAngle);
    this.ctx.stroke();

    // Text
    this.ctx.fillStyle = '#2c3e50';
    this.ctx.font = `bold ${this.size / 4}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`${this.value}%`, centerX, centerY);

    this.ctx.font = `${this.size / 8}px Arial`;
    this.ctx.fillText(this.label, centerX, centerY + this.size / 6);
  }

  getColor(value) {
    if (value >= 80) return '#2ecc71'; // green
    if (value >= 60) return '#f39c12'; // orange
    if (value >= 40) return '#e67e22'; // darker orange
    return '#e74c3c'; // red
  }

  setValue(value) {
    this.value = Math.max(0, Math.min(100, value));
    this.draw();
  }

  setLabel(label) {
    this.label = label;
    this.draw();
  }

  getStatus() {
    if (this.value >= 80) return 'healthy';
    if (this.value >= 60) return 'warning';
    if (this.value >= 40) return 'degraded';
    return 'critical';
  }
}

export default HealthGauge;
