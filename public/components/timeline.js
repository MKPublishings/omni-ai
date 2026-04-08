/**
 * @component Timeline
 * @spec: event-timeline-display
 * 
 * Vertical timeline for displaying chronological events.
 */

import { formatDate, truncate } from '../utils.js';

export class Timeline {
  constructor(element, events = [], options = {}) {
    this.element = element;
    this.events = events;
    this.maxItems = options.maxItems || 50;
    this.compact = options.compact || false;

    this.render();
  }

  render() {
    const timelineHtml = this.events
      .slice(0, this.maxItems)
      .map(
        (event, idx) => `
      <div class="timeline-item" data-index="${idx}">
        <div class="timeline-marker"></div>
        <div class="timeline-content">
          <div class="timeline-time">${formatDate(event.createdAt || event.timestamp, 'long')}</div>
          <div class="timeline-title">${event.type || 'Event'}</div>
          ${!this.compact ? `<div class="timeline-desc">${truncate(event.description || JSON.stringify(event.data), 100)}</div>` : ''}
        </div>
      </div>
    `
      )
      .join('');

    this.element.innerHTML = `
      <div class="timeline">
        ${timelineHtml || '<div class="empty">No events</div>'}
      </div>
    `;

    this.setupEventListeners();
  }

  setupEventListeners() {
    const items = this.element.querySelectorAll('.timeline-item');
    items.forEach((item) => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.dataset.index);
        this.onItemClick?.call(this, this.events[idx], idx);
      });
    });
  }

  addEvent(event) {
    this.events.unshift(event);
    if (this.events.length > this.maxItems) {
      this.events.pop();
    }
    this.render();
  }

  addEvents(events) {
    this.events.unshift(...events);
    this.events = this.events.slice(0, this.maxItems);
    this.render();
  }

  clearEvents() {
    this.events = [];
    this.render();
  }

  setEvents(events) {
    this.events = events;
    this.render();
  }

  onItemClick(event, index) {
    // Override in usage
  }
}

export default Timeline;
