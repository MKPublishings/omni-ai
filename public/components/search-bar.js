/**
 * @component SearchBar
 * @spec: search-with-debounce
 * 
 * Reusable search input with debounce support.
 */

import { debounce } from '../utils.js';

export class SearchBar {
  constructor(element, options = {}) {
    this.element = element;
    this.placeholder = options.placeholder || 'Search...';
    this.debounceDelay = options.debounceDelay || 300;
    this.onSearch = options.onSearch || (() => {});
    this.minChars = options.minChars || 2;

    this.render();
    this.setupEventListeners();
  }

  render() {
    this.element.innerHTML = `
      <div class="search-bar">
        <input 
          type="text" 
          class="search-input" 
          placeholder="${this.placeholder}"
          autocomplete="off"
        />
        <button class="search-clear" style="display:none;">✕</button>
      </div>
    `;
    this.input = this.element.querySelector('.search-input');
    this.clearBtn = this.element.querySelector('.search-clear');
  }

  setupEventListeners() {
    this.debouncedSearch = debounce((query) => {
      if (query.length >= this.minChars) {
        this.onSearch(query);
      }
    }, this.debounceDelay);

    this.input.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      this.clearBtn.style.display = query ? 'block' : 'none';
      this.debouncedSearch(query);
    });

    this.clearBtn.addEventListener('click', () => {
      this.input.value = '';
      this.clearBtn.style.display = 'none';
      this.onSearch('');
      this.input.focus();
    });
  }

  getValue() {
    return this.input.value.trim();
  }

  setValue(value) {
    this.input.value = value;
    this.clearBtn.style.display = value ? 'block' : 'none';
  }

  clear() {
    this.setValue('');
  }

  focus() {
    this.input.focus();
  }
}

export default SearchBar;
