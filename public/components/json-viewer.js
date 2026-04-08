/**
 * @component JsonViewer
 * @spec: json-formatter-viewer
 * 
 * Format and display JSON with syntax highlighting.
 */

import { formatJson, copyToClipboard } from '../utils.js';

export class JsonViewer {
  constructor(element, options = {}) {
    this.element = element;
    this.data = null;
    this.expanded = options.expanded !== false;
    this.copyable = options.copyable !== false;

    this.render();
  }

  render() {
    this.element.innerHTML = `
      <div class="json-viewer">
        <div class="json-controls">
          ${this.copyable ? '<button class="copy-btn">Copy</button>' : ''}
          <button class="toggle-btn">${this.expanded ? 'Collapse' : 'Expand'}</button>
        </div>
        <pre class="json-content"><code>${this.formatJson(this.data)}</code></pre>
      </div>
    `;

    if (this.copyable) {
      this.element.querySelector('.copy-btn').addEventListener('click', () => {
        copyToClipboard(formatJson(this.data));
      });
    }

    this.element.querySelector('.toggle-btn').addEventListener('click', () => {
      this.expanded = !this.expanded;
      this.render();
    });
  }

  formatJson(data) {
    if (!data) return 'No data';
    try {
      const json = formatJson(data, 2);
      return this.syntaxHighlight(json);
    } catch (err) {
      return `Error: ${err.message}`;
    }
  }

  syntaxHighlight(json) {
    return json
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
        let cls = 'number';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'key';
          } else {
            cls = 'string';
          }
        } else if (/true|false/.test(match)) {
          cls = 'boolean';
        } else if (/null/.test(match)) {
          cls = 'null';
        }
        return `<span class="${cls}">${match}</span>`;
      });
  }

  setData(data) {
    this.data = data;
    this.expanded = true;
    this.render();
  }

  getData() {
    return this.data;
  }
}

export default JsonViewer;
