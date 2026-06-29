// NIYYAH GitHub Pages data loader and public-entry repair.
// The full Qur'an data file lives at the repository root as /quran-data.js.
// GitHub's web uploader placed the 11MB data file there, while app/index.html expects app/quran-data.js.
(function loadNiyyahQuranData() {
  var stableAyahs = window.NIYYAH_AYAHS = window.NIYYAH_AYAHS || [];
  var stableSurahs = window.NIYYAH_SURAHS = window.NIYYAH_SURAHS || [];
  window.NIYYAH_DATA = window.NIYYAH_DATA || { ayahs: stableAyahs, surahs: stableSurahs };

  function repairPublicEntry() {
    var gate = document.getElementById('entry-choice');
    if (gate && /Temporary preview gate/i.test(gate.innerText || '')) {
      gate.innerHTML = '<div class="onboarding-stage"><div class="onboarding-content"><div class="entry-logo">ن</div><p class="eyebrow">NIYYAH</p><h1 class="title">Preparing your reflection space</h1><p class="subtitle" style="text-align:center;max-width:330px">A calm space to read, understand, and reflect.</p></div></div>';
    }
    setTimeout(function () {
      try {
        var active = document.querySelector('.screen.active');
        if (active && active.id === 'entry-choice' && typeof window.startEntryFlow === 'function') {
          var mode = typeof window.initialEntryFlow === 'function' ? window.initialEntryFlow() : 'first';
          window.startEntryFlow(mode);
        } else if (typeof window.render === 'function') {
          window.render();
        }
      } catch (error) {
        console.warn('NIYYAH entry repair skipped.', error);
      }
    }, 0);
  }

  function finishWith(fullAyahs, fullSurahs) {
    var nextAyahs = Array.isArray(fullAyahs) ? fullAyahs.slice() : [];
    var nextSurahs = Array.isArray(fullSurahs) ? fullSurahs.slice() : [];

    stableAyahs.splice(0, stableAyahs.length);
    stableSurahs.splice(0, stableSurahs.length);
    Array.prototype.push.apply(stableAyahs, nextAyahs);
    Array.prototype.push.apply(stableSurahs, nextSurahs);

    window.NIYYAH_AYAHS = stableAyahs;
    window.NIYYAH_SURAHS = stableSurahs;
    window.NIYYAH_DATA = { ayahs: stableAyahs, surahs: stableSurahs };
    window.dispatchEvent(new CustomEvent('niyyah:data-ready'));
    repairPublicEntry();
  }

  try {
    var request = new XMLHttpRequest();
    request.open('GET', '../quran-data.js?v=2026-06-29-root-data', false);
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
  script.src = '../quran-data.js?v=2026-06-29-root-data';
  script.onload = function () {
    finishWith(window.NIYYAH_AYAHS, window.NIYYAH_SURAHS);
  };
  script.onerror = function () {
    console.error('NIYYAH Qur\'an data failed to load from ../quran-data.js');
  };
  document.head.appendChild(script);
})();
