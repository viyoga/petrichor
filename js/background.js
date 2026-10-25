// viyoga newtab — background script
// Mirrors the startpage into private windows, where Firefox otherwise shows
// about:privatebrowsing instead of the overridden new tab.
(() => {
  'use strict';

  const api = globalThis.browser || globalThis.chrome;
  if (!api || !api.tabs) return;

  const NEWTAB = api.runtime.getURL('newtab.html');

  function redirect(tabId) {
    try {
      const p = api.tabs.update(tabId, { url: NEWTAB });
      if (p && p.catch) p.catch(() => {});
    } catch (_) {}
  }

  if (api.tabs.onCreated) {
    api.tabs.onCreated.addListener((tab) => {
      if (tab && tab.incognito && tab.url === 'about:privatebrowsing') redirect(tab.id);
    });
  }

  if (api.tabs.onUpdated) {
    api.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      const url = (changeInfo && changeInfo.url) || (tab && tab.url);
      if (tab && tab.incognito && url === 'about:privatebrowsing') redirect(tabId);
    });
  }
})();
