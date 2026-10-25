// viyoga newtab — palette switch
// Default: follow the Noctalia-generated css/noctalia.css. The remaining
// steps disable that sheet and fall back to the site's own themes, so the
// nav's theme button keeps doing something real.
(() => {
  'use strict';

  const btn = document.getElementById('theme-btn');
  if (!btn) return;

  const link = document.getElementById('noctalia-css');
  const root = document.documentElement;
  const KEY = 'viyoga_palette';
  const STEPS = ['noctalia', 'amber', 'mallow', 'safelight', 'tungsten', 'nyctophobia'];

  let cur = null;
  try { cur = localStorage.getItem(KEY); } catch (_) {}
  if (STEPS.indexOf(cur) < 0) cur = 'noctalia';

  function apply() {
    const synced = cur === 'noctalia';
    if (link) link.disabled = !synced;
    if (!synced) root.setAttribute('data-theme', cur);
    root.dataset.palette = synced ? 'noctalia' : 'site';

    const label = synced ? 'noctalia' : cur;
    btn.setAttribute('aria-label', 'Palette: ' + label + ' (click to switch)');
    btn.setAttribute('title', 'Palette: ' + label + ' (click to switch)');
    document.dispatchEvent(new Event('themechange'));
  }

  btn.addEventListener('click', () => {
    cur = STEPS[(STEPS.indexOf(cur) + 1) % STEPS.length];
    try { localStorage.setItem(KEY, cur); } catch (_) {}
    apply();
  });

  apply();
})();
