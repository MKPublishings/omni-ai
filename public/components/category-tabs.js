/**
 * @component CategoryTabs
 * @spec: category-filtering
 * 
 * Tab-based category selector.
 */

export class CategoryTabs {
  constructor(element, categories = [], options = {}) {
    this.element = element;
    this.categories = categories;
    this.onSelect = options.onSelect || (() => {});
    this.selected = options.selected || categories[0];

    this.render();
    this.setupEventListeners();
  }

  render() {
    const tabsHtml = this.categories
      .map(
        (cat) => `
      <button 
        class="tab ${cat === this.selected ? 'active' : ''}"
        data-category="${cat}"
      >
        ${cat}
      </button>
    `
      )
      .join('');

    this.element.innerHTML = `<div class="category-tabs">${tabsHtml}</div>`;
    this.tabs = this.element.querySelectorAll('.tab');
  }

  setupEventListeners() {
    this.tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        this.select(tab.dataset.category);
      });
    });
  }

  select(category) {
    if (!this.categories.includes(category)) return;

    this.selected = category;
    this.tabs.forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.category === category);
    });
    this.onSelect(category);
  }

  getSelected() {
    return this.selected;
  }

  setCategories(categories) {
    this.categories = categories;
    if (!categories.includes(this.selected)) {
      this.selected = categories[0];
    }
    this.render();
    this.setupEventListeners();
  }
}

export default CategoryTabs;
