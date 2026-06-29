// NIYYAH GitHub Pages data loader.
// The full Qur'an data file lives at the repository root as /quran-data.js.
// app/index.html reads these arrays immediately, so this loader creates stable arrays first,
// then fills those same arrays once the full file loads and asks the app to render again.
(function loadNiyyahQuranData() {
  var stableAyahs = window.NIYYAH_AYAHS = window.NIYYAH_AYAHS || [];
  var stableSurahs = window.NIYYAH_SURAHS = window.NIYYAH_SURAHS || [];
  window.NIYYAH_DATA = window.NIYYAH_DATA || { ayahs: stableAyahs, surahs: stableSurahs };

  function finishWith(fullAyahs, fullSurahs) {
    stableAyahs.splice(0, stableAyahs.length);
    stableSurahs.splice(0, stableSurahs.length);
    Array.prototype.push.apply(stableAyahs, fullAyahs || []);
    Array.prototype.push.apply(stableSurahs, fullSurahs || []);
    window.NIYYAH_AYAHS = stableAyahs;
    window.NIYYAH_SURAHS = stableSurahs;
    window.NIYYAH_DATA = { ayahs: stableAyahs, surahs: stableSurahs };
    window.dispatchEvent(new CustomEvent('niyyah:data-ready'));
    setTimeout(function () {
      if (typeof window.render === 'function') window.render();
    }, 0);
  }

  try {
    var request = new XMLHttpRequest();
    request.open('GET', '../quran-data.js?v=2026-06-28-quran-root-2', false);
    request.send(null);
    if (request.status >= 200 && request.status < 300) {
      (0, eval)(request.responseText);
      finishWith(window.NIYYAH_AYAHS, window.NIYYAH_SURAHS);
      return;
    }
  } catch (error) {
    console.warn('NIYYAH synchronous Qur\'an data load fell back to async loader.', error);
  }

  var script = document.createElement('script');
  script.src = '../quran-data.js?v=2026-06-28-quran-root-2';
  script.onload = function () {
    finishWith(window.NIYYAH_AYAHS, window.NIYYAH_SURAHS);
  };
  script.onerror = function () {
    console.error('NIYYAH Qur\'an data failed to load from ../quran-data.js');
  };
  document.head.appendChild(script);
})();
