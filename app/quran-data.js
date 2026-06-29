// NIYYAH GitHub Pages data loader.
// The full Qur'an data file lives at the repository root as /quran-data.js.
// This file must load it synchronously because app/index.html reads window.NIYYAH_AYAHS immediately after this script tag.
(function loadNiyyahQuranData() {
  if (window.NIYYAH_DATA && window.NIYYAH_AYAHS && window.NIYYAH_SURAHS) return;

  var request = new XMLHttpRequest();
  request.open('GET', '../quran-data.js?v=2026-06-28-quran-root', false);
  request.send(null);

  if (request.status >= 200 && request.status < 300) {
    (0, eval)(request.responseText);
    return;
  }

  console.error('NIYYAH Qur\'an data failed to load from ../quran-data.js', request.status);
  window.NIYYAH_AYAHS = window.NIYYAH_AYAHS || [];
  window.NIYYAH_SURAHS = window.NIYYAH_SURAHS || [];
  window.NIYYAH_DATA = window.NIYYAH_DATA || { ayahs: window.NIYYAH_AYAHS, surahs: window.NIYYAH_SURAHS };
})();
