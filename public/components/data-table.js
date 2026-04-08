/**
 * @component DataTable
 * @spec: data-table-with-pagination
 * 
 * Paginated table component with sorting and row actions.
 */

export class DataTable {
  constructor(element, columns, options = {}) {
    this.element = element;
    this.columns = columns; // Array of { key, label, width?, format? }
    this.rows = [];
    this.pageSize = options.pageSize || 20;
    this.currentPage = 1;
    this.total = 0;
    this.onRowClick = options.onRowClick || (() => {});
    this.onPageChange = options.onPageChange || (() => {});
    this.loading = false;

    this.render();
  }

  render() {
    const headerRow = this.columns
      .map((col) => `<th style="width: ${col.width || 'auto'}">${col.label}</th>`)
      .join('');

    const bodyRows = this.rows
      .map(
        (row, idx) => `
      <tr data-index="${idx}">
        ${this.columns
          .map((col) => {
            const value = row[col.key];
            const formatted = col.format ? col.format(value, row) : value;
            return `<td>${formatted}</td>`;
          })
          .join('')}
      </tr>
    `
      )
      .join('');

    const pageCount = Math.ceil(this.total / this.pageSize) || 1;
    const paginationHtml = `
      <div class="data-table-pagination">
        <button class="prev-btn" ${this.currentPage === 1 ? 'disabled' : ''}>← Previous</button>
        <span class="page-info">Page ${this.currentPage} of ${pageCount}</span>
        <button class="next-btn" ${this.currentPage === pageCount ? 'disabled' : ''}>Next →</button>
      </div>
    `;

    this.element.innerHTML = `
      <div class="data-table-container">
        ${this.loading ? '<div class="loading">Loading...</div>' : ''}
        <table class="data-table">
          <thead><tr>${headerRow}</tr></thead>
          <tbody>${bodyRows || '<tr><td colspan="' + this.columns.length + '">No data</td></tr>'}</tbody>
        </table>
        ${paginationHtml}
      </div>
    `;

    this.setupEventListeners();
  }

  setupEventListeners() {
    const rows = this.element.querySelectorAll('tbody tr');
    rows.forEach((row) => {
      row.addEventListener('click', () => {
        const idx = parseInt(row.dataset.index);
        this.onRowClick(this.rows[idx], idx);
      });
    });

    const prevBtn = this.element.querySelector('.prev-btn');
    const nextBtn = this.element.querySelector('.next-btn');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => this.prevPage());
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this.nextPage());
    }
  }

  setData(rows, total) {
    this.rows = rows;
    this.total = total;
    this.render();
  }

  addRows(rows) {
    this.rows.push(...rows);
    this.render();
  }

  clearRows() {
    this.rows = [];
    this.currentPage = 1;
    this.render();
  }

  setLoading(loading) {
    this.loading = loading;
    this.render();
  }

  nextPage() {
    const pageCount = Math.ceil(this.total / this.pageSize);
    if (this.currentPage < pageCount) {
      this.currentPage++;
      this.onPageChange(this.currentPage, this.pageSize);
      this.render();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.onPageChange(this.currentPage, this.pageSize);
      this.render();
    }
  }

  goToPage(pageNum) {
    const pageCount = Math.ceil(this.total / this.pageSize);
    if (pageNum >= 1 && pageNum <= pageCount) {
      this.currentPage = pageNum;
      this.onPageChange(this.currentPage, this.pageSize);
      this.render();
    }
  }
}

export default DataTable;
