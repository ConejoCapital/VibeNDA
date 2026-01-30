/**
 * VibeNDA — Slide-to-reveal NDA gate with fingerprint + consent logging.
 * Use: include script, then hide protected content until vibenda:agreed fires.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'vibenda_consent';
  var CONSENT_TOKEN_LENGTH = 12;
  var SLIDE_THRESHOLD = 0.85; // 85% of track width to complete
  var ACCESS_LOGGED_DURATION_MS = 2200;

  function getConfig() {
    var script = document.currentScript;
    var dataset = script && script.dataset ? script.dataset : {};
    return {
      termsUrl: dataset.vibendaTermsUrl || (script && script.src ? script.src.replace(/vibe-nda\.js.*$/, 'TERMS.md') : 'TERMS.md'),
      endpoint: dataset.vibendaEndpoint || '/api/consent',
      projectId: dataset.vibendaProjectId || ''
    };
  }

  function consentKey(origin, projectId) {
    return STORAGE_KEY + '_' + (origin || '').replace(/[^a-zA-Z0-9.-]/g, '_') + (projectId ? '_' + projectId : '');
  }

  function getStoredConsent() {
    try {
      var key = consentKey(location.origin, getConfig().projectId);
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function setStoredConsent(receipt) {
    try {
      var key = consentKey(location.origin, getConfig().projectId);
      localStorage.setItem(key, JSON.stringify(receipt));
    } catch (e) {}
  }

  function randomId(len) {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var out = '';
    var buf = new Uint8Array(len);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(buf);
      for (var i = 0; i < len; i++) out += chars[buf[i] % chars.length];
    } else {
      for (var i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  }

  function fingerprint() {
    var n = typeof navigator !== 'undefined' ? navigator : {};
    var s = typeof screen !== 'undefined' ? screen : {};
    var lang = (n.language || n.userLanguage || '').toLowerCase();
    var tz = typeof Intl !== 'undefined' && Intl.DateTimeFormat ? Intl.DateTimeFormat().resolvedOptions().timeZone : '';
    return {
      userAgent: n.userAgent || '',
      language: lang,
      languages: (n.languages && n.languages.length) ? [].slice.call(n.languages) : [lang],
      platform: n.platform || '',
      timezone: tz,
      screenWidth: s.width || 0,
      screenHeight: s.height || 0,
      colorDepth: s.colorDepth || 0,
      deviceMemory: n.deviceMemory,
      hardwareConcurrency: n.hardwareConcurrency,
      touchSupport: !!(n.maxTouchPoints && n.maxTouchPoints > 0),
      cookieEnabled: !!n.cookieEnabled
    };
  }

  function fetchClientIp() {
    return fetch('https://api.ipify.org?format=json', { method: 'GET' })
      .then(function (r) { return r.json(); })
      .then(function (o) { return o.ip || ''; })
      .catch(function () { return ''; });
  }

  function sendConsent(payload, config) {
    var endpoint = config.endpoint;
    var promise = fetchClientIp().then(function (ip) {
      payload.clientIp = ip;
      if (!endpoint || endpoint === 'none' || endpoint === 'skip') return Promise.resolve();
      return fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(function () {});
    });
    return promise;
  }

  function showAccessLogged(overlay, token) {
    var wrap = document.createElement('div');
    wrap.setAttribute('data-vibenda', 'access-logged');
    wrap.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.92);color:#0f0;font-family:monospace;font-size:14px;letter-spacing:0.2em;z-index:10002;animation:vibenda-fadein 0.2s ease;';
    wrap.innerHTML = '<div style="text-align:center;"><div style="margin-bottom:8px;opacity:0.9;">Access logged</div><div style="font-weight:bold;">ID ' + token + '</div></div>';
    overlay.appendChild(wrap);

    if (typeof document.head !== 'undefined') {
      var style = document.createElement('style');
      style.textContent = '@keyframes vibenda-fadein{from{opacity:0}to{opacity:1}}';
      document.head.appendChild(style);
    }

    setTimeout(function () {
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    }, ACCESS_LOGGED_DURATION_MS);
  }

  function revealContent(overlay, receipt) {
    showAccessLogged(overlay, receipt.consentToken);
    setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      try {
        document.dispatchEvent(new CustomEvent('vibenda:agreed', { detail: receipt }));
      } catch (e) {}
    }, ACCESS_LOGGED_DURATION_MS);
  }

  function injectGateStyles() {
    if (document.getElementById('vibenda-gate-styles')) return;
    var style = document.createElement('style');
    style.id = 'vibenda-gate-styles';
    style.textContent =
      '.vibenda-fill{position:absolute;left:0;top:0;height:100%;border-radius:26px;background:rgba(255,255,255,0.25);width:0;transition:width 0.2s ease-out;pointer-events:none;}' +
      '.vibenda-thumb{position:absolute;left:4px;top:4px;width:44px;height:44px;background:linear-gradient(180deg,#fff 0%,#e0e0e0 100%);border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.35),inset 0 1px 0 rgba(255,255,255,0.8);cursor:grab;display:flex;align-items:center;justify-content:center;font-size:20px;user-select:none;-webkit-user-select:none;z-index:2;transition:left 0.2s ease-out,transform 0.2s ease-out,opacity 0.2s ease-out;}' +
      '.vibenda-thumb:hover{filter:brightness(1.08);}' +
      '.vibenda-thumb:active{cursor:grabbing;}' +
      '.vibenda-track{position:relative;width:100%;height:52px;background:rgba(255,255,255,0.15);border-radius:26px;overflow:hidden;touch-action:none;-webkit-tap-highlight-color:transparent;}' +
      '.vibenda-track:focus{outline:none;}' +
      '.vibenda-track:focus-visible{outline:2px solid rgba(255,255,255,0.6);outline-offset:2px;}' +
      '.vibenda-track.vibenda-complete .vibenda-thumb{transform:scale(1.08);}' +
      '.vibenda-track.vibenda-complete .vibenda-fill{width:100% !important;}' +
      '@media (prefers-reduced-motion:reduce){.vibenda-thumb,.vibenda-fill{transition:none !important;animation:none !important;}.vibenda-track.vibenda-complete .vibenda-thumb{transform:none;}}';
    if (document.head) document.head.appendChild(style);
  }

  function buildSlideGate(config) {
    injectGateStyles();
    var overlay = document.createElement('div');
    overlay.setAttribute('data-vibenda', 'gate');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10001;background:linear-gradient(180deg,rgba(0,0,0,0.85) 0%,rgba(0,0,0,0.75) 100%);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;';

    var termsUrl = config.termsUrl;
    var termsLink = termsUrl ? '<a href="' + termsUrl + '" target="_blank" rel="noopener" style="color:rgba(255,255,255,0.9);text-decoration:underline;">\u201Cterms\u201D</a>' : '\u201Cterms\u201D';

    overlay.innerHTML =
      '<div style="max-width:360px;width:100%;text-align:center;">' +
      '<p style="color:rgba(255,255,255,0.95);font-size:15px;line-height:1.5;margin-bottom:24px;">By sliding to reveal, you execute the VibeNDA and bind yourself to the ' + termsLink + ' below.</p>' +
      '<div class="vibenda-track" role="button" tabindex="0" aria-label="Slide to agree to VibeNDA terms" style="position:relative;width:100%;height:52px;background:rgba(255,255,255,0.15);border-radius:26px;overflow:hidden;touch-action:none;">' +
      '<div class="vibenda-fill" aria-hidden="true"></div>' +
      '<div class="vibenda-thumb">→</div>' +
      '</div>' +
      '</div>';

    var track = overlay.querySelector('.vibenda-track');
    var thumb = overlay.querySelector('.vibenda-thumb');
    var fill = overlay.querySelector('.vibenda-fill');
    if (!track || !thumb || !fill) return overlay;

    var trackRect = function () { return track.getBoundingClientRect(); };
    var maxX = function () { return Math.max(0, trackRect().width - thumb.offsetWidth - 8); };
    var completed = false;
    var dragging = false;

    function setThumbX(x) {
      var mx = maxX();
      var val = Math.max(0, Math.min(x, mx));
      thumb.style.left = val + 'px';
      var fillWidth = val + (thumb.offsetWidth / 2);
      fill.style.width = fillWidth + 'px';
      if (!completed && mx > 0 && val >= mx * SLIDE_THRESHOLD) {
        completed = true;
        thumb.style.cursor = 'default';
        thumb.style.transition = 'none';
        fill.style.transition = 'none';
        track.classList.add('vibenda-complete');
        setTimeout(function () {
          onComplete();
        }, 280);
      }
    }

    function onComplete() {
      var consentToken = randomId(CONSENT_TOKEN_LENGTH);
      var ts = new Date().toISOString();
      var fp = fingerprint();
      var payload = {
        consentToken: consentToken,
        timestamp: ts,
        projectId: config.projectId,
        fingerprint: fp,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        sessionId: getStoredConsent() ? JSON.parse(getStoredConsent()).sessionId : randomId(16)
      };

      var sessionId = payload.sessionId;
      if (!getStoredConsent()) payload.sessionId = sessionId;

      sendConsent(payload, config).then(function () {
        var receipt = {
          consentToken: consentToken,
          timestamp: ts,
          sessionId: sessionId,
          fingerprint: fp,
          clientIp: payload.clientIp || ''
        };
        setStoredConsent(receipt);
        revealContent(overlay, receipt);
      });
    }

    function handleMove(clientX) {
      if (completed) return;
      var tr = trackRect();
      setThumbX(clientX - tr.left - thumb.offsetWidth / 2);
    }

    function pointerDown(e) {
      if (completed) return;
      e.preventDefault();
      dragging = true;
      thumb.style.transition = 'none';
      fill.style.transition = 'none';
      var clientX = e.clientX != null ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      handleMove(clientX);
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onPointerUp);
      document.addEventListener('touchmove', onTouchMove, { passive: false });
      document.addEventListener('touchend', onPointerUp);
    }

    function onMouseMove(e) {
      handleMove(e.clientX);
    }
    function onTouchMove(e) {
      if (e.touches.length) {
        e.preventDefault();
        handleMove(e.touches[0].clientX);
      }
    }
    function onPointerUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onPointerUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onPointerUp);
      dragging = false;
      thumb.style.transition = '';
      fill.style.transition = '';
      if (!completed) {
        setThumbX(0);
      }
    }

    track.addEventListener('mousedown', pointerDown);
    track.addEventListener('touchstart', function (e) {
      if (e.touches.length) {
        e.preventDefault();
        pointerDown(e);
      }
    }, { passive: false });
    track.addEventListener('keydown', function (e) {
      if (completed) return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        var mx = maxX();
        setThumbX(mx);
      }
    });

    return overlay;
  }

  function run() {
    var config = getConfig();
    var stored = getStoredConsent();
    if (stored) {
      try {
        var receipt = JSON.parse(stored);
        document.dispatchEvent(new CustomEvent('vibenda:agreed', { detail: receipt }));
      } catch (e) {
        var overlay = buildSlideGate(config);
        document.body.appendChild(overlay);
      }
      return;
    }
    var overlay = buildSlideGate(config);
    document.body.appendChild(overlay);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
