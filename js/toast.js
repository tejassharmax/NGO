import { icon } from './utils.js';

export function toast(title, message = 'Your changes have been saved.') {
  const root = document.querySelector('#toast-root');
  if (!root) return;
  const element = document.createElement('div');
  element.className = 'toast';
  element.innerHTML = `<span class="toast__icon">${icon('check')}</span><div><div class="toast__title">${title}</div><div class="toast__message">${message}</div></div><button class="icon-button icon-button--small" type="button" aria-label="Dismiss notification">${icon('x')}</button>`;
  root.append(element);
  const remove = () => element.remove();
  element.querySelector('button').addEventListener('click', remove);
  window.setTimeout(remove, 4200);
}
