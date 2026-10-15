/* =========================================================
   Halloween Costume & Film Night — page behaviour
   - fence + graveyard drawing
   - reveal-on-scroll
   - music, wind and sound effects (on by default)
   - registration form (talks to the Google Apps Script in Code.gs)
   ========================================================= */
(function () {
  'use strict';

  var CFG = window.HALLOWEEN_CONFIG || {};
  var SCRIPT_URL = (CFG.SCRIPT_URL || '').trim();
  var SEAT_LIMIT = CFG.SEAT_LIMIT || 100;
  var PREVIEW = !SCRIPT_URL;
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.documentElement.classList.add('js');

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------------------------------------------------------
     Fence, tombstones and ground (drawn as SVG)
     --------------------------------------------------------- */
  function rand(seed) {
    var s = seed;
    return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  }

  function drawFence(el) {
    var hero = el.getAttribute('data-fence') === 'hero';
    var H = hero ? 180 : 130;
    var r = rand(hero ? 7 : 13);
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 1440 ' + H);
    svg.setAttribute('preserveAspectRatio', 'xMidYMax slice');
    var out = '';
    var groundY = H - (hero ? 60 : 27);
    var railY = groundY - (hero ? 48 : 36);

    if (hero) {
      // tombstones (arched tops, leaning)
      [[86, 100, 135, 6], [576, 80, 108, -7], [1123, 110, 149, 6]].forEach(function (t) {
        var x = t[0], w = t[1], h = t[2], y = groundY - h + 30;
        out += '<path transform="rotate(' + t[3] + ' ' + (x + w / 2) + ' ' + (y + h) + ')" d="M' + x + ' ' + (y + h) +
          'V' + (y + w / 2) + 'A' + (w / 2) + ' ' + (w / 2) + ' 0 0 1 ' + (x + w) + ' ' + (y + w / 2) + 'V' + (y + h) + 'Z"/>';
      });
    }
    for (var x = 0; x < 1460; x += 57 + Math.round(r() * 16)) {
      var h = (hero ? 100 : 85) + Math.round(r() * (hero ? 75 : 45));
      var rot = (r() * 12 - 6).toFixed(1);
      out += '<rect x="' + x + '" y="' + (groundY + 20 - h) + '" width="' + (hero ? 11 : 10) + '" height="' + h +
        '" transform="rotate(' + rot + ' ' + (x + 5) + ' ' + (groundY + 20) + ')"/>';
    }
    out += '<rect x="-20" y="' + railY + '" width="1480" height="8" transform="rotate(' + (hero ? -1 : 1) + ' 720 ' + railY + ')"/>';
    out += '<rect x="0" y="' + groundY + '" width="1440" height="' + (H - groundY) + '"/>';
    svg.innerHTML = out;
    el.appendChild(svg);
  }
  $$('[data-fence]').forEach(drawFence);

  /* ---------------------------------------------------------
     Reveal on scroll
     --------------------------------------------------------- */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el, i) {
      el.style.transitionDelay = (i % 6) * 0.07 + 's';
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------------------------------------------------------
     Sound — ON by default.
     The page tries to start the music as soon as it loads.
     Most browsers block sound until the visitor taps, clicks
     or presses a key, so if the first try is blocked the music
     starts on the visitor's first tap/click/key anywhere.
     If a visitor turns sound off, the page remembers it
     (on that browser only).
     --------------------------------------------------------- */
  var SND = 'assets/sounds/';
  var music = new Audio(SND + 'spooky-music-loop.mp3');
  music.loop = true;
  music.preload = 'none';
  music.volume = 0;
  // Howling wind plays quietly under the music the whole time.
  var wind = new Audio(SND + 'ambience-wind-loop.mp3');
  wind.loop = true;
  wind.preload = 'none';
  wind.volume = 0;
  var MUSIC_VOL = 0.4, WIND_VOL = 0.6; // the wind file is quieter, so it needs a higher level
  var sfx = {
    creak: SND + 'sfx-door-creak.mp3',
    whoosh: SND + 'sfx-whoosh.mp3',
    success: SND + 'sfx-success.mp3',
    boo: SND + 'sfx-boo.mp3'
  };
  var sfxCache = {};
  var soundOn = true;
  var musicPlaying = false;
  var fadeTimer = null;
  var PREF_KEY = 'hw2026-sound';
  var toggle = $('#soundToggle');
  var toggleLabel = $('.sound-toggle__label', toggle);

  function fadeMusic(to, ms, done) {
    clearInterval(fadeTimer);
    // "to" is 0..1 of full level; music and wind keep their own balance.
    var from = music.volume / MUSIC_VOL, steps = 20, i = 0;
    fadeTimer = setInterval(function () {
      i++;
      var k = Math.max(0, Math.min(1, from + (to - from) * (i / steps)));
      music.volume = k * MUSIC_VOL;
      wind.volume = k * WIND_VOL;
      if (i >= steps) { clearInterval(fadeTimer); if (done) done(); }
    }, ms / steps);
  }

  // The button shows what is really happening:
  //   playing -> "Sound on"; blocked by the browser -> "Tap for sound"; off -> "Sound off".
  function showToggle() {
    var waiting = soundOn && !musicPlaying;
    toggle.setAttribute('aria-pressed', soundOn && musicPlaying ? 'true' : 'false');
    toggle.classList.toggle('is-waiting', waiting);
    toggleLabel.textContent = !soundOn ? 'Sound off' : (musicPlaying ? 'Sound on' : 'Tap for sound');
  }

  // Try to play. Resolves true if the browser allowed it.
  function startMusic() {
    if (musicPlaying) return Promise.resolve(true);
    var p;
    try { p = music.play(); } catch (e) { return Promise.resolve(false); }
    try { var pw = wind.play(); if (pw && pw.catch) pw.catch(function () {}); } catch (e) {}
    if (!p || !p.then) { musicPlaying = !music.paused; if (musicPlaying) fadeMusic(1, 2500); showToggle(); return Promise.resolve(musicPlaying); }
    return p.then(function () {
      musicPlaying = true;
      fadeMusic(1, 2500);
      showToggle();
      return true;
    }).catch(function () { showToggle(); return false; });
  }

  function setSound(on, remember) {
    soundOn = on;
    showToggle();
    if (remember) { try { localStorage.setItem(PREF_KEY, on ? 'on' : 'off'); } catch (e) {} }
    if (on) startMusic();
    else {
      musicPlaying = false;
      showToggle();
      fadeMusic(0, 500, function () { music.pause(); wind.pause(); });
    }
  }

  // Visitor turned it off on an earlier visit? Respect that.
  try { if (localStorage.getItem(PREF_KEY) === 'off') soundOn = false; } catch (e) {}
  showToggle();

  // First try right away; if blocked, start on the first tap / click / key.
  function unlock(e) {
    if (e && toggle.contains(e.target)) return; // the toggle handles itself
    if (!soundOn) return;
    startMusic().then(function (ok) { if (ok) removeUnlock(); });
  }
  var unlockEvents = ['pointerdown', 'touchend', 'keydown', 'click'];
  function removeUnlock() { unlockEvents.forEach(function (t) { document.removeEventListener(t, unlock, true); }); }
  unlockEvents.forEach(function (t) { document.addEventListener(t, unlock, true); });
  if (soundOn) {
    music.preload = 'auto';
    wind.preload = 'auto';
    startMusic().then(function (ok) { if (ok) removeUnlock(); });
  }

  function play(name, volume) {
    if (!soundOn || !sfx[name]) return;
    var a = sfxCache[name] || (sfxCache[name] = new Audio(sfx[name]));
    try { a.currentTime = 0; } catch (e) {}
    a.muted = false;
    a.volume = volume == null ? 0.7 : volume;
    var p = a.play();
    if (p && p.catch) p.catch(function () {});
  }

  // Some browsers (Safari, iPhone) only let a sound play later if it was
  // started once during a tap. The registration answer arrives a few
  // seconds after the tap, so we start these sounds silently on the tap.
  function primeSfx(names) {
    if (!soundOn) return;
    names.forEach(function (name) {
      var a = sfxCache[name] || (sfxCache[name] = new Audio(sfx[name]));
      if (a.primed) return;
      a.primed = true;
      a.muted = true;
      var p;
      try { p = a.play(); } catch (e) { a.muted = false; a.primed = false; return; }
      var stop = function () { if (a.muted) { a.pause(); try { a.currentTime = 0; } catch (e) {} a.muted = false; } };
      if (p && p.then) p.then(stop).catch(function () { a.muted = false; a.primed = false; });
      else stop();
    });
  }

  toggle.addEventListener('click', function () {
    // Sound is on but the browser held it back: this tap starts it.
    if (soundOn && !musicPlaying) { startMusic().then(function (ok) { if (ok) removeUnlock(); }); return; }
    setSound(!soundOn, true);
  });

  $('#enterBtn').addEventListener('click', function () {
    if (!soundOn) setSound(true, true);
    else startMusic();
    play('creak', 0.8);
    var next = $('#announcements');
    if (next) next.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  $$('[data-sfx]').forEach(function (el) {
    el.addEventListener('click', function () { play(el.getAttribute('data-sfx'), 0.6); });
  });

  // Pause music when the tab is hidden, resume when back.
  document.addEventListener('visibilitychange', function () {
    if (!soundOn) return;
    if (document.hidden) { music.pause(); wind.pause(); musicPlaying = false; showToggle(); }
    else startMusic();
  });

  /* ---------------------------------------------------------
     Preview mode (no SCRIPT_URL yet)
     --------------------------------------------------------- */
  var demo = { seatsLeft: SEAT_LIMIT, open: true, emails: {} };
  if (PREVIEW) {
    $('#previewBar').hidden = false;
    document.body.classList.add('has-preview');
    var q = new URLSearchParams(location.search).get('demo');
    if (q === 'closed') demo.open = false;
    if (q === 'full') demo.seatsLeft = 0;
    if (q === 'few') demo.seatsLeft = 2;
  }

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function apiGet() {
    if (PREVIEW) return wait(300).then(function () { return { ok: true, open: demo.open, seatLimit: SEAT_LIMIT, seatsLeft: demo.seatsLeft }; });
    return fetch(SCRIPT_URL, { method: 'GET', cache: 'no-store' }).then(function (r) { return r.json(); });
  }

  function apiPost(data) {
    if (PREVIEW) {
      return wait(900).then(function () {
        if (!demo.open) return { ok: false, code: 'closed', title: 'The crypt is closed.', message: 'Registration for this event has ended. See you at the next one!' };
        if (demo.emails[data.email.toLowerCase()]) return { ok: false, code: 'duplicate', title: 'Déjà boo!', message: 'This email is already on our list. Need to change something? Email Valentina at vabanina@langara.ca.' };
        var size = 1 + data.guests.length;
        if (size > demo.seatsLeft) return fullError(demo.seatsLeft);
        demo.emails[data.email.toLowerCase()] = true;
        demo.seatsLeft -= size;
        return { ok: true, registrationId: 'PREVIEW', groupSize: size, seatsLeft: demo.seatsLeft };
      });
    }
    // text/plain keeps the request "simple", so the browser does not
    // need a CORS pre-check that Apps Script cannot answer.
    return fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data)
    }).then(function (r) { return r.json(); });
  }

  function fullError(left) {
    return {
      ok: false, code: 'full', seatsLeft: Math.max(0, left),
      title: left <= 0 ? 'Even the ghosts are standing!' : 'Not enough coffins for your crew!',
      message: left <= 0
        ? 'All ' + SEAT_LIMIT + ' seats are taken. Registration is full.'
        : 'Only ' + left + (left === 1 ? ' seat' : ' seats') + ' left. Please remove some guests and try again.'
    };
  }

  /* ---------------------------------------------------------
     Seats counter
     --------------------------------------------------------- */
  var seatsBox = $('#seats');
  var seatsLeftEl = $('#seatsLeft');
  var seatsText = $('#seatsText');
  var form = $('#regForm');
  var submitBtn = $('#submitBtn');
  var addBtn = $('#addGuest');
  var alertBox = $('#alert');

  function showSeats(left, limit) {
    seatsLeftEl.textContent = left;
    seatsText.textContent = 'of ' + (limit || SEAT_LIMIT) + ' seats left';
    seatsBox.classList.toggle('is-low', left > 0 && left <= 10);
  }

  function lockForm(info) {
    $$('input, select, button', form).forEach(function (el) { el.disabled = true; });
    submitBtn.textContent = 'Register';
    showAlert(info.title, info.message, 'info');
  }

  function refreshSeats() {
    return apiGet().then(function (res) {
      if (!res || !res.ok) return;
      showSeats(res.seatsLeft, res.seatLimit);
      if (res.open === false) lockForm({ title: 'The crypt is closed.', message: 'Registration for this event has ended. See you at the next one!' });
      else if (res.seatsLeft <= 0) lockForm(fullError(0));
    }).catch(function () {
      seatsLeftEl.textContent = '?';
    });
  }
  refreshSeats();

  /* ---------------------------------------------------------
     Guests
     --------------------------------------------------------- */
  var guestsBox = $('#guests');
  var tpl = $('#guestTpl');
  var uid = 0;

  function guestBlocks() { return $$('.guest:not(.is-leaving)', guestsBox); }

  function renumber() {
    guestBlocks().forEach(function (g, i) {
      $('.guest__name', g).textContent = 'Guest ' + (i + 1);
      $('.guest__remove', g).setAttribute('aria-label', 'Remove guest ' + (i + 1));
    });
    var n = guestBlocks().length;
    submitBtn.textContent = n === 0 ? 'Register' : 'Register (you + ' + n + (n === 1 ? ' guest)' : ' guests)');
  }

  function addGuest() {
    var node = tpl.content.firstElementChild.cloneNode(true);
    uid++;
    var inputs = $$('input', node), labels = $$('label', node);
    inputs.forEach(function (inp, i) {
      var id = 'g' + uid + (i ? 'last' : 'first');
      inp.id = id;
      labels[i].setAttribute('for', id);
    });
    node.classList.add('is-new');
    guestsBox.appendChild(node);
    $('.guest__remove', node).addEventListener('click', function () { removeGuest(node); });
    renumber();
    play('whoosh', 0.5);
    inputs[0].focus();
  }

  function removeGuest(node) {
    node.classList.add('is-leaving');
    renumber();
    var done = function () { if (node.parentNode) node.parentNode.removeChild(node); };
    if (reduceMotion) done(); else setTimeout(done, 300);
    addBtn.focus();
    clearErrors();
  }

  addBtn.addEventListener('click', addGuest);

  /* ---------------------------------------------------------
     Program dropdown (DF or DGMD), styled like the page
     --------------------------------------------------------- */
  var pick = $('#pick');
  var pickBtn = $('#programBtn');
  var pickList = $('#programList');
  var pickVal = $('#programValue');
  var pickInput = $('#program');
  var opts = $$('.pick__opt', pickList);
  var activeIdx = 0;

  function setActive(i) {
    activeIdx = (i + opts.length) % opts.length;
    opts.forEach(function (o, k) { o.classList.toggle('is-active', k === activeIdx); });
    pickList.setAttribute('aria-activedescendant', opts[activeIdx].id);
  }
  function openPick() {
    if (pickBtn.disabled) return;
    pickList.hidden = false;
    pick.classList.add('is-open');
    pickBtn.setAttribute('aria-expanded', 'true');
    var sel = opts.findIndex(function (o) { return o.getAttribute('aria-selected') === 'true'; });
    setActive(sel < 0 ? 0 : sel);
    pickList.focus();
  }
  function closePick(focusBtn) {
    if (pickList.hidden) return;
    pickList.hidden = true;
    pick.classList.remove('is-open');
    pickBtn.setAttribute('aria-expanded', 'false');
    if (focusBtn) pickBtn.focus();
  }
  function choose(i) {
    var o = opts[i];
    opts.forEach(function (x) { x.setAttribute('aria-selected', x === o ? 'true' : 'false'); });
    pickInput.value = o.getAttribute('data-value');
    pickVal.innerHTML = o.innerHTML;
    pickVal.classList.remove('is-empty');
    var f = pick.closest('.field');
    if (f.classList.contains('is-bad')) { f.classList.remove('is-bad'); pickBtn.removeAttribute('aria-invalid'); }
    closePick(true);
  }

  pickBtn.addEventListener('click', function () { if (pickList.hidden) openPick(); else closePick(true); });
  pickBtn.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openPick(); }
  });
  pickList.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(activeIdx + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(activeIdx - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(activeIdx); }
    else if (e.key === 'Escape') { e.preventDefault(); closePick(true); }
    else if (e.key === 'Tab') { closePick(false); }
  });
  opts.forEach(function (o, i) {
    o.addEventListener('mousemove', function () { if (activeIdx !== i) setActive(i); });
    o.addEventListener('click', function () { choose(i); });
  });
  document.addEventListener('click', function (e) { if (!pick.contains(e.target)) closePick(false); });
  $('#programLabel').addEventListener('click', function (e) { e.preventDefault(); pickBtn.focus(); });

  /* ---------------------------------------------------------
     Errors
     --------------------------------------------------------- */
  function showAlert(title, msg, kind) {
    $('#alertTitle').textContent = title;
    $('#alertMsg').textContent = msg;
    alertBox.classList.toggle('alert--info', kind === 'info');
    alertBox.hidden = false;
    alertBox.classList.remove('is-shake');
    void alertBox.offsetWidth; // restart the shake
    if (kind !== 'info') alertBox.classList.add('is-shake');
  }

  function clearErrors() {
    alertBox.hidden = true;
    $$('.field.is-bad', form).forEach(function (f) { f.classList.remove('is-bad'); });
    $$('[aria-invalid]', form).forEach(function (el) { el.removeAttribute('aria-invalid'); });
  }

  function markBad(el) {
    if (!el) return;
    el.closest('.field').classList.add('is-bad');
    el.setAttribute('aria-invalid', 'true');
  }

  form.addEventListener('input', function (e) {
    var f = e.target.closest('.field');
    if (f && f.classList.contains('is-bad')) { f.classList.remove('is-bad'); e.target.removeAttribute('aria-invalid'); }
  });

  /* ---------------------------------------------------------
     Collect + check (same rules and words as Code.gs)
     --------------------------------------------------------- */
  function val(id) { return ($('#' + id).value || '').replace(/\s+/g, ' ').trim(); }

  function collect() {
    return {
      firstName: val('hwA'),
      lastName: val('hwB'),
      email: val('hwC').toLowerCase(),
      program: $('#program').value,
      guests: guestBlocks().map(function (g) {
        return { firstName: $('.g-first', g).value.replace(/\s+/g, ' ').trim(), lastName: $('.g-last', g).value.replace(/\s+/g, ' ').trim() };
      }),
      website: $('#website').value
    };
  }

  function check(d) {
    if (!d.firstName || !d.lastName) {
      return { code: 'missing_name', title: 'Who goes there?', message: 'Please enter your first and last name.' };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) {
      return { code: 'bad_email', title: 'That email looks a little haunted.', message: 'Please check your email address and try again.' };
    }
    if (!d.program) {
      return { code: 'bad_program', title: 'Which coven are you from?', message: 'Please choose your program.' };
    }
    for (var i = 0; i < d.guests.length; i++) {
      if (!d.guests[i].firstName || !d.guests[i].lastName) {
        return { code: 'missing_guest_name', guest: i, title: 'Who goes there?', message: 'Guest ' + (i + 1) + ' needs a first and last name. Add it, or remove that guest.' };
      }
    }
    return null;
  }

  function highlight(err, d) {
    switch (err.code) {
      case 'missing_name':
        if (!d.firstName) markBad($('#hwA'));
        if (!d.lastName) markBad($('#hwB'));
        break;
      case 'bad_email':
      case 'duplicate':
        markBad($('#hwC'));
        break;
      case 'bad_program':
        markBad($('#program'));
        $('#programBtn').setAttribute('aria-invalid', 'true');
        break;
      case 'missing_guest_name':
        var gi = err.guest;
        if (gi == null) { var m = /Guest (\d+)/.exec(err.message || ''); gi = m ? +m[1] - 1 : 0; }
        var g = guestBlocks()[gi];
        if (g) {
          if (!d.guests[gi] || !d.guests[gi].firstName) markBad($('.g-first', g));
          if (!d.guests[gi] || !d.guests[gi].lastName) markBad($('.g-last', g));
        }
        break;
    }
    var first = $('.is-bad input:not([type=hidden]), .is-bad .pick__btn', form);
    if (first) first.focus();
  }

  /* ---------------------------------------------------------
     Submit
     --------------------------------------------------------- */
  var busy = false;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    clearErrors();

    var data = collect();
    var err = check(data);
    if (err) {
      showAlert(err.title, err.message);
      highlight(err, data);
      play('boo', 0.6);
      return;
    }

    primeSfx(['success', 'boo']);
    busy = true;
    var label = submitBtn.textContent;
    submitBtn.textContent = 'Summoning the spirits…';
    submitBtn.classList.add('is-busy');
    submitBtn.setAttribute('aria-busy', 'true');

    apiPost(data).then(function (res) {
      if (res && res.ok) return showSuccess(res.groupSize || 1 + data.guests.length, res.seatsLeft);
      res = res || {};
      if (typeof res.seatsLeft === 'number') showSeats(res.seatsLeft);
      if (res.code === 'closed' || (res.code === 'full' && res.seatsLeft === 0)) {
        lockForm(res);
      } else {
        showAlert(res.title || 'Something went bump in the night.', res.message || 'Please try again.');
        highlight(res, data);
      }
      play('boo', 0.6);
    }).catch(function () {
      showAlert('The spirits lost the signal.', 'We could not reach the sign-up list. Check your internet connection and try again.');
      play('boo', 0.6);
    }).then(function () {
      busy = false;
      submitBtn.classList.remove('is-busy');
      submitBtn.removeAttribute('aria-busy');
      if (submitBtn.textContent === 'Summoning the spirits…') submitBtn.textContent = label;
    });
  });

  function showSuccess(groupSize, seatsLeft) {
    $('#admitN').textContent = groupSize;
    $('#admitSouls').textContent = groupSize === 1 ? 'brave soul' : 'brave souls';
    if (typeof seatsLeft === 'number') showSeats(seatsLeft);
    form.hidden = true;
    var s = $('#success');
    s.hidden = false;
    s.classList.add('is-in');
    s.focus({ preventScroll: true });
    $('#register').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    play('success', 0.8);
  }
})();
