// Fullscreen + navigation bridge.
// The app runs inside the index.html shell frame: the SHELL document owns fullscreen,
// so swapping pages never drops it. Each page just asks the shell.
(function () {
  var framed = false;
  try { framed = !!window.parent && window.parent !== window; } catch (e) { framed = false; }

  var shellFs = false;

  function isFs() {
    if (framed) return shellFs;
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  function post(msg) { try { window.parent.postMessage(msg, '*'); } catch (e) {} }

  function enter() {
    if (framed) return post({ pb: 'fs-enter' });
    var el = document.documentElement;
    var req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) return;
    try { Promise.resolve(req.call(el)).catch(function () {}); } catch (e) {}
  }

  function exit() {
    if (framed) return post({ pb: 'fs-exit' });
    var ex = document.exitFullscreen || document.webkitExitFullscreen;
    if (!ex) return;
    try { Promise.resolve(ex.call(document)).catch(function () {}); } catch (e) {}
  }

  function toggle() {
    if (framed) return post({ pb: 'fs-toggle' });
    isFs() ? exit() : enter();
  }

  function navigate(url) {
    if (framed) return post({ pb: 'nav', url: url });
    window.location.href = url;
  }

  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.pb !== 'fs-state') return;
    shellFs = !!d.value;
    document.dispatchEvent(new CustomEvent('pbfullscreenchange'));
  });

  window.PBFullscreen = {
    framed: framed,
    isFs: isFs, want: isFs,
    enter: enter, exit: exit, toggle: toggle, navigate: navigate,
    hasChoice: function () { return framed; },
    setChoice: function () {},
    markNavigating: function () {},
    resumeOnGesture: function () {},
  };

  if (framed) post({ pb: 'fs-query' });

  // Opened/reloaded outside the shell (deep link to a page): always restart at the landing shell.
  if (!framed && /(Booth|Result)\.dc\.html$/.test(location.pathname)) {
    location.replace('index.html');
  }
})();
