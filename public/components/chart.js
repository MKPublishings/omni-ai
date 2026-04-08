/**
 * @component Chart
 * @spec: metrics-visualization
 * 
 * Simple chart component (using canvas or SVG).
 */

export class Chart {
  constructor(element, type = 'line', options = {}) {
    this.element = element;
    this.type = type; // 'line', 'bar', 'pie'
    this.data = { labels: [], datasets: [] };
    this.width = options.width || 500;
    this.height = options.height || 300;

    this.init();
  }

  init() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.element.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
  }

  setData(labels, datasets) {
    this.data = { labels, datasets };
    this.draw();
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    if (this.type === 'line') {
      this.drawLine();
    } else if (this.type === 'bar') {
      this.drawBar();
    } else if (this.type === 'pie') {
      this.drawPie();
    }
  }

  drawLine() {
    const { labels, datasets } = this.data;
    if (!datasets.length) return;

    const dataset = datasets[0];
    const values = dataset.data || [];
    if (!values.length) return;

    const padding = 40;
    const graphWidth = this.width - 2 * padding;
    const graphHeight = this.height - 2 * padding;

    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue || 1;

    this.ctx.strokeStyle = dataset.borderColor || '#3498db';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();

    values.forEach((value, i) => {
      const x = padding + (i / (values.length - 1)) * graphWidth;
      const y = this.height - padding - ((value - minValue) / range) * graphHeight;

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    });

    this.ctx.stroke();

    // Draw points
    this.ctx.fillStyle = dataset.pointColor || '#3498db';
    values.forEach((value, i) => {
      const x = padding + (i / (values.length - 1)) * graphWidth;
      const y = this.height - padding - ((value - minValue) / range) * graphHeight;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 4, 0, 2 * Math.PI);
      this.ctx.fill();
    });
  }

  drawBar() {
    const { labels, datasets } = this.data;
    if (!datasets.length) return;

    const dataset = datasets[0];
    const values = dataset.data || [];
    if (!values.length) return;

    const padding = 40;
    const graphWidth = this.width - 2 * padding;
    const graphHeight = this.height - 2 * padding;

    const maxValue = Math.max(...values);
    const barWidth = graphWidth / values.length * 0.8;
    const spacing = graphWidth / values.length;

    this.ctx.fillStyle = dataset.backgroundColor || '#3498db';
    values.forEach((value, i) => {
      const x = padding + i * spacing + spacing / 2 - barWidth / 2;
      const barHeight = (value / maxValue) * graphHeight;
      const y = this.height - padding - barHeight;

      this.ctx.fillRect(x, y, barWidth, barHeight);
    });
  }

  drawPie() {
    const { datasets } = this.data;
    if (!datasets.length) return;

    const dataset = datasets[0];
    const values = dataset.data || [];
    const total = values.reduce((a, b) => a + b, 0);

    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const radius = Math.min(this.width, this.height) / 2 - 20;

    const colors = dataset.backgroundColor || ['#3498db', '#e74c3c', '#2ecc71', '#f39c12'];

    let startAngle = 0;
    values.forEach((value, i) => {
      const sliceAngle = (value / total) * 2 * Math.PI;

      this.ctx.fillStyle = colors[i % colors.length];
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      this.ctx.lineTo(centerX, centerY);
      this.ctx.fill();

      startAngle += sliceAngle;
    });
  }
}

export default Chart;
