/**
 * combobox.js
 * Custom accessible combobox component logic.
 */

export function initCombobox() {
  document.addEventListener('click', (e) => {
    const combobox = e.target.closest('[data-combobox]');
    if (combobox && (e.target.closest('[data-combobox-input]') || e.target.closest('.combobox__chevron'))) {
      const isOpen = combobox.classList.contains('combobox--open');
      closeAllComboboxes();
      if (!isOpen) {
        combobox.classList.add('combobox--open');
        const input = combobox.querySelector('[data-combobox-input]');
        input?.focus();
        syncComboboxSelected(combobox);
      }
      return;
    }
    const option = e.target.closest('[data-combobox-option]');
    if (option) {
      const cb = option.closest('[data-combobox]');
      const value = option.getAttribute('data-combobox-option');
      const input = cb.querySelector('[data-combobox-input]');
      const hidden = cb.querySelector('input[type="hidden"]');
      if (input) input.value = value;
      if (hidden) hidden.value = value;
      closeAllComboboxes();
      return;
    }
    if (!e.target.closest('[data-combobox]')) {
      closeAllComboboxes();
    }
  });

  document.addEventListener('input', (e) => {
    if (!e.target.matches('[data-combobox-input]')) return;
    const cb = e.target.closest('[data-combobox]');
    if (!cb) return;
    if (!cb.classList.contains('combobox--open')) cb.classList.add('combobox--open');
    const query = e.target.value.toLowerCase().trim();
    const hidden = cb.querySelector('input[type="hidden"]');
    if (hidden) hidden.value = e.target.value;
    const options = cb.querySelectorAll('[data-combobox-option]');
    let visibleCount = 0;
    options.forEach(opt => {
      const label = opt.getAttribute('data-combobox-option').toLowerCase();
      const match = !query || label.includes(query);
      opt.style.display = match ? '' : 'none';
      if (match) visibleCount++;
    });
    const empty = cb.querySelector('[data-combobox-empty]');
    if (empty) empty.style.display = visibleCount === 0 && query ? '' : 'none';
    const hint = cb.querySelector('.combobox__hint');
    if (hint) hint.style.display = query ? 'none' : '';
    const divider = cb.querySelector('.combobox__divider');
    if (divider) divider.style.display = query ? 'none' : '';
    syncComboboxSelected(cb);
  });

  document.addEventListener('keydown', (e) => {
    if (!e.target.matches('[data-combobox-input]')) return;
    const cb = e.target.closest('[data-combobox]');
    if (!cb) return;
    const options = [...cb.querySelectorAll('[data-combobox-option]')].filter(o => o.style.display !== 'none');
    if (e.key === 'Escape') {
      closeAllComboboxes();
      e.target.blur();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const focused = cb.querySelector('.combobox__option--focused');
      if (focused) {
        focused.click();
      } else {
        const hidden = cb.querySelector('input[type="hidden"]');
        if (hidden) hidden.value = e.target.value;
        closeAllComboboxes();
      }
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!cb.classList.contains('combobox--open')) cb.classList.add('combobox--open');
      const focused = cb.querySelector('.combobox__option--focused');
      let idx = focused ? options.indexOf(focused) : -1;
      if (focused) focused.classList.remove('combobox__option--focused');
      idx = e.key === 'ArrowDown' ? Math.min(idx + 1, options.length - 1) : Math.max(idx - 1, 0);
      if (options[idx]) {
        options[idx].classList.add('combobox__option--focused');
        options[idx].scrollIntoView({ block: 'nearest' });
      }
    }
  });

  function closeAllComboboxes() {
    document.querySelectorAll('[data-combobox].combobox--open').forEach(cb => {
      cb.classList.remove('combobox--open');
      cb.querySelectorAll('.combobox__option--focused').forEach(o => o.classList.remove('combobox__option--focused'));
    });
  }

  function syncComboboxSelected(cb) {
    const hidden = cb.querySelector('input[type="hidden"]');
    const val = hidden ? hidden.value : '';
    cb.querySelectorAll('[data-combobox-option]').forEach(opt => {
      opt.classList.toggle('combobox__option--selected', opt.getAttribute('data-combobox-option') === val);
    });
  }
}
