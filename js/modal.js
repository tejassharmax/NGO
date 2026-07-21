import { icon } from './utils.js';

export function closeModal() { document.querySelector('#modal-root').replaceChildren(); }

export function modal({ title, body, confirmText = 'Confirm', confirmClass = 'button--primary', onConfirm }) {
  const root = document.querySelector('#modal-root');
  root.innerHTML = `<div class="modal-backdrop" role="presentation"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header class="modal__header"><div><h2 id="modal-title" class="modal__title">${title}</h2></div><button class="icon-button icon-button--small" type="button" aria-label="Close dialog" data-modal-close>${icon('x')}</button></header><div class="modal__body">${body}</div><footer class="modal__footer"><button class="button" type="button" data-modal-close>Cancel</button><button class="button ${confirmClass}" type="button" data-modal-confirm>${confirmText}</button></footer></section></div>`;
  root.querySelectorAll('[data-modal-close]').forEach((button) => button.addEventListener('click', closeModal));
  root.querySelector('.modal-backdrop').addEventListener('click', (event) => { if (event.target === event.currentTarget) closeModal(); });
  root.querySelector('[data-modal-confirm]').addEventListener('click', () => { onConfirm?.(); closeModal(); });
  root.querySelector('[data-modal-close]')?.focus();
}
