// viyoga newtab — first paint
// Must run before the stylesheets paint: sets data-theme/data-font so the
// page opens in the stored theme and the site's Iosevka default. (Kept
// external because MV3's CSP blocks inline scripts.)
(function () {
  var t;
  try { t = new URLSearchParams(location.search).get('theme') || localStorage.getItem('theme'); } catch (e) {}
  var v = ['amber', 'mallow', 'safelight', 'tungsten', 'nyctophobia'];
  window.__THEMES__ = v;
  if (v.indexOf(t) < 0) t = 'safelight';
  document.documentElement.setAttribute('data-theme', t);

  var f;
  try { f = new URLSearchParams(location.search).get('font') || localStorage.getItem('font'); } catch (e) {}
  if (['maple', 'iosevka', 'space'].indexOf(f) < 0) f = 'iosevka';
  document.documentElement.setAttribute('data-font', f);

  document.documentElement.classList.add('js');
})();
