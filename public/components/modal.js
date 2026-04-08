/**
 * @component Modal
 * @spec: generic-modal-dialog
 * 
 * Generic modal dialog component with customizable content.
 */

export class Modal {
  constructor(element, options = {}) {
    this.element = element;
    this.title = options.title || 'Dialog';
    this.content = options.content || '';
    this.buttons = options.buttons || [
      { label: 'Cancel', action: 'cancel' },
      { label: 'OK', action: 'confirm', primary: true },
    ];
    this.onConfirm = options.onConfirm || (() => {});
    this.onCancel = options.onCancel || (() => {});
    this.closable = options.closable !== false;

    this.render();
  }

  render() {
    const buttonsHtml = this.buttons
      .map(
        (btn) => `
      <button class="modal-btn ${btn.primary ? 'primary' : ''}" data-action="${btn.action}">
        ${btn.label}
      </button>
    `
      )
      .join('');

    this.element.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-dialog">
        <div class="modal-header">
          <h2 class="modal-title">${this.title}</h2>
          ${this.closable ? '<button class="modal-close">✕</button>' : ''}
        </div>
        <div class="modal-body">${this.content}</div>
        <div class="modal-footer">
          ${buttonsHtml}
        </div>
      </div>
    `;

    this.setupEventListeners();
  }

  setupEventListeners() {
    const overlay = this.element.querySelector('.modal-overlay');
    const closeBtn = this.element.querySelector('.modal-close');
    const buttons = this.element.querySelectorAll('.modal-btn');

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        if (action === 'confirm') {
          this.onConfirm();
        } else if (action === 'cancel') {
          this.onCancel();
        }
        this.close();
      });
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.onCancel();
        this.close();
      });
    }

    if (this.closable && overlay) {
      overlay.addEventListener('click', () => {
        this.onCancel();
        this.close();
      });
    }
  }

  open() {
    this.element.style.display = 'flex';
  }

  close() {
    this.element.style.display = 'none';
  }

  setContent(content) {
    this.content = content;
    const body = this.element.querySelector('.modal-body');
    if (body) body.innerHTML = content;
  }

  setTitle(title) {
    this.title = title;
    const titleEl = this.element.querySelector('.modal-title');
    if (titleEl) titleEl.textContent = title;
  }
}

export default Modal;
