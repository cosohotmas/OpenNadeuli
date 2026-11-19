import { regionOptions } from './search-flow.js';

export function mountRegionPicker(host, onChange) {
  const details = document.createElement('details');
  details.className = 'region-picker';
  const trigger = document.createElement('summary');
  const current = document.createElement('span');
  const arrow = document.createElement('span');
  arrow.textContent = '⌄';
  arrow.setAttribute('aria-hidden', 'true');
  trigger.append(current, arrow);
  trigger.setAttribute('aria-label', '검색 지역 · 자동 · 현재 위치 사용');
  const group = document.createElement('fieldset');
  group.className = 'region-picker-options';
  group.setAttribute('aria-label', '검색 지역 옵션');
  const choices = ['자동 · 현재 위치 사용', ...regionOptions];
  current.textContent = choices[0];
  let value = '';
  let disabled = false;
  choices.forEach((label, index) => {
    const option = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'course-region';
    input.value = index ? label : '';
    input.checked = !index;
    const name = document.createElement('span');
    name.textContent = label;
    option.append(input, name);
    group.append(option);
    input.addEventListener('change', () => {
      value = input.value;
      current.textContent = label;
      trigger.setAttribute('aria-label', `검색 지역 · ${label}`);
      onChange?.(value);
    });
    // Pointer users can dismiss by choosing an option. Arrow keys keep radio focus.
    option.addEventListener('click', (event) => {
      if (!event.detail) return;
      requestAnimationFrame(() => { details.open = false; trigger.focus(); });
    });
  });
  details.append(trigger, group);
  details.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && details.open) {
      event.preventDefault();
      details.open = false;
      trigger.focus();
    }
  });
  trigger.addEventListener('click', (event) => { if (disabled) event.preventDefault(); });
  host.replaceChildren(details);
  return {
    get value() { return value; },
    setDisabled(next) {
      disabled = next;
      group.disabled = next;
      trigger.setAttribute('aria-disabled', String(next));
      if (next) details.open = false;
    },
  };
}
