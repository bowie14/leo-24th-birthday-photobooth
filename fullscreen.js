// Shared fullscreen state across pages (each screen is its own document, so the
// browser drops fullscreen on navigation and only lets us re-enter on a user gesture).
(function () {
  var WANT_KEY = 'photobooth-fullscreen';
  var CHOICE_KEY = 'photobooth-fullscreen-choice';

  function root() { return document.documentElement; }
  function isFs() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }

  function want() {
    try { return localStorage.getItem(WANT_KEY) === '1'; } catch (e) { return false; }
  }
  function setWant(v) {
    try { localStorage.setItem(WANT_KEY, v ? '1' : '0'); } catch (e) {}
  }

  function hasChoice() {
    try { return !!localStorage.getItem(CHOICE_KEY); } catch (e) { return false; }
  }
  function setChoice(v) {
    try { localStorage.setItem(CHOICE_KEY, v); } catch (e) {}
  }

  function enter() {
    setWant(true);
    var el = root();
    var req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) return Promise.resolve();
    try { return Promise.resolve(req.call(el)).catch(function () {}); } catch (e) { return Promise.resolve(); }
  }

  function exit() {
    setWant(false);
    var ex = document.exitFullscreen || document.webkitExitFullscreen;
    if (!ex) return Promise.resolve();
    try { return Promise.resolve(ex.call(document)).catch(function () {}); } catch (e) { return Promise.resolve(); }
  }

  function toggle() { return isFs() ? exit() : enter(); }

  // Re-enter on the first gesture of a freshly loaded page if the user wanted fullscreen.
  function resumeOnGesture() {
    if (!want() || isFs()) return;
    var once = function () {
      document.removeEventListener('pointerdown', once, true);
      if (want() && !isFs()) enter();
    };
    document.addEventListener('pointerdown', once, true);
  }

  // Navigation force-exits fullscreen; that must NOT be read as the user opting out.
  var navigating = false;
  function markNavigating() { navigating = true; }
  window.addEventListener('beforeunload', markNavigating);
  window.addEventListener('pagehide', markNavigating);

  // Esc / browser UI exit counts as the user choosing non-fullscreen.
  document.addEventListener('fullscreenchange', function () {
    if (!isFs() && !navigating) setWant(false);
  });

  window.PBFullscreen = {
    isFs: isFs, want: want, enter: enter, exit: exit, toggle: toggle,
    hasChoice: hasChoice, setChoice: setChoice, resumeOnGesture: resumeOnGesture,
    markNavigating: markNavigating,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', resumeOnGesture);
  } else {
    resumeOnGesture();
  }
})();
