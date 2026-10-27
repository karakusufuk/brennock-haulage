/* Brennock Haulage — shared behaviour: header state, the amber line, soft reveals, the action-moment modal. */

// where "See how it works" leads; the one place to change it
var CASE_STUDY_URL = 'https://ufuk.ie/work/brennock';

// every page opens at its top, never where the last page was left
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);
window.addEventListener('pageshow', function () { window.scrollTo(0, 0); });

(function () {
  var header = document.querySelector('header');
  var sig = document.querySelector('.sig');
  var home = document.body.classList.contains('home');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  if (home) {
    // the home page runs its own header and line (home.js)
  } else if (!sig) {
    // plain pages: the amber line draws in under the header and stays there
    requestAnimationFrame(function () { requestAnimationFrame(function () { header.classList.add('ruled'); }); });
  } else {
    var frame = sig.querySelector('.frame');
    var slogan = sig.querySelector('.slogan');
    var rule = sig.querySelector('.rule');
    var at = parseFloat(slogan.getAttribute('data-at')) || 0.3;
    if (sig.hasAttribute('data-dark-header')) header.classList.add('dark-on-photo');

    function place() {
      var H = frame.offsetHeight;
      slogan.style.top = Math.round(H * at) + 'px';
      rule.style.top = Math.round(frame.offsetTop + H * at + slogan.offsetHeight + Math.max(12, slogan.offsetHeight * 0.16)) + 'px';
    }
    function onScroll() {
      var hb = header.getBoundingClientRect().bottom;
      header.classList.toggle('over', frame.getBoundingClientRect().bottom > hb + 4);
      var docked = rule.getBoundingClientRect().top <= hb;
      header.classList.toggle('ruled', docked);
      rule.classList.toggle('gone', docked);
      if (slogan.classList.contains('in')) {               // the slogan fades before it slides under the menu
        var lt = slogan.getBoundingClientRect().top;
        slogan.style.opacity = clamp((lt - hb - 10) / 110, 0, 1).toFixed(3);
      }
    }
    header.classList.add('over');
    place();
    window.addEventListener('resize', function () { place(); onScroll(); });
    window.addEventListener('scroll', onScroll, { passive: true });
    var img = frame.querySelector('img');
    function start() {
      place();
      slogan.classList.add('in'); rule.classList.add('in');
      setTimeout(function () { slogan.style.transition = 'none'; onScroll(); }, reduce ? 0 : 1100);
    }
    if (img.complete) setTimeout(start, 250); else img.addEventListener('load', function () { setTimeout(start, 250); });
    onScroll();
  }

  // soft reveals: each block rises and turns opaque once
  var els = document.querySelectorAll('.rise');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  } else els.forEach(function (el) { el.classList.add('in'); });

  // slight parallax inside every .plx frame: the image drifts up to ±4% as its frame crosses the screen
  var plx = Array.prototype.slice.call(document.querySelectorAll('.plx'));
  var pr = 0;
  function drift() {
    pr = 0;
    var vh = window.innerHeight;
    plx.forEach(function (f) {
      var r = f.getBoundingClientRect();
      if (r.bottom < -40 || r.top > vh + 40 || !r.height) return;
      var t = clamp((vh - r.top) / (vh + r.height), 0, 1);       // 0 entering below, 1 leaving above
      f.style.setProperty('--py', ((0.5 - t) * 8).toFixed(2) + '%');
    });
  }
  if (plx.length && !reduce) {
    window.addEventListener('scroll', function () { if (!pr) pr = requestAnimationFrame(drift); }, { passive: true });
    window.addEventListener('resize', drift);
    document.addEventListener('plx:refresh', drift);
    drift();
  }
})();

/* ---------------------------------------------------------------------------
   Action moment. Calls, mail, the map and the two "send" buttons never do the real thing:
   they open one small dialog saying what a live build would do. Nothing is sent anywhere.
--------------------------------------------------------------------------- */
(function () {
  var MESSAGES = {
    tel: 'In a live build, this would ring our dispatch desk straight away.',
    mail: 'In a live build, this would open a new message to our team.',
    maps: 'In a live build, this would open the yard on Google Maps.',
    quote: 'In a live build, your request would go to a planner, who would reply with a price the same working day.',
    cv: 'In a live build, your CV would go to our recruiter at careers@brennock.ufuk.ie, and you would hear back within a week.'
  };
  var root = null, openKind = null, onDone = null, lastFocus = null;

  function build() {
    root = document.createElement('div');
    root.className = 'concept';
    root.innerHTML =
      '<div class="box" role="dialog" aria-modal="true" aria-labelledby="concept-title" aria-describedby="concept-body">' +
        '<h2 id="concept-title">Concept site by Ufuk Karakuş</h2>' +
        '<p id="concept-body"></p>' +
        '<div class="acts"><a class="btn" id="concept-more" target="_blank" rel="noopener">See how it works →</a>' +
        '<button type="button" class="text-link" id="concept-close">Close</button></div>' +
      '</div>';
    document.body.appendChild(root);
    root.querySelector('#concept-more').href = CASE_STUDY_URL;
    root.addEventListener('mousedown', function (e) { if (e.target === root) close(); });
    root.querySelector('#concept-close').addEventListener('click', close);
    root.querySelector('#concept-more').addEventListener('click', function () { setTimeout(close, 0); });
    root.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = [root.querySelector('#concept-more'), root.querySelector('#concept-close')];
      var i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[1].focus(); }
      else if (!e.shiftKey && i === 1) { e.preventDefault(); f[0].focus(); }
    });
  }

  function open(kind, done) {
    if (!root) build();
    openKind = kind; onDone = done || null;
    lastFocus = document.activeElement;
    root.querySelector('#concept-body').textContent = MESSAGES[kind] || MESSAGES.mail;
    document.body.classList.add('modal-open');
    root.getBoundingClientRect();                       // commit the hidden state so the fade runs
    root.classList.add('on');
    root.querySelector('#concept-close').focus();
  }
  function close() {
    if (!root || !root.classList.contains('on')) return;
    root.classList.remove('on');
    document.body.classList.remove('modal-open');
    var done = onDone; onDone = null; openKind = null;
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
    if (done) done();
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && root && root.classList.contains('on')) { e.preventDefault(); e.stopPropagation(); close(); }
  }, true);

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="tel:"], a[href^="mailto:"], [data-concept]');
    if (!a) return;
    e.preventDefault();
    var kind = a.getAttribute('data-concept') || (a.getAttribute('href').indexOf('tel:') === 0 ? 'tel' : 'mail');
    open(kind);
  });

  window.BH = { concept: open, closeConcept: close };
})();

/* The menu button (tablet and phone): opens the folded menu, closes on a link, Esc, outside tap or a wider screen. */
(function () {
  var header = document.querySelector('header'), btn = document.querySelector('.menu-btn');
  if (!btn) return;
  function set(open) { header.classList.toggle('menu-open', open); btn.setAttribute('aria-expanded', open ? 'true' : 'false'); }
  btn.addEventListener('click', function () { set(!header.classList.contains('menu-open')); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && header.classList.contains('menu-open')) { set(false); btn.focus(); } });
  document.addEventListener('click', function (e) { if (header.classList.contains('menu-open') && !header.contains(e.target)) set(false); });
  header.querySelectorAll('nav a').forEach(function (a) { a.addEventListener('click', function () { set(false); }); });
  window.addEventListener('resize', function () { if (window.innerWidth > 860) set(false); });
})();

// every <select> becomes a custom combobox; the native one stays hidden underneath and keeps the value
(function () {
  function build(sel) {
    var wrap = document.createElement('div'); wrap.className = 'combo';
    var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'combo-btn';
    btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
    var lab = sel.closest('label'), id = 'combo' + Math.random().toString(36).slice(2, 8);
    btn.setAttribute('aria-label', (lab && lab.firstChild && lab.firstChild.nodeType === 3 ? lab.firstChild.textContent.trim() : sel.name) || 'Choose');
    var list = document.createElement('ul'); list.className = 'combo-list'; list.id = id; list.setAttribute('role', 'listbox'); list.hidden = true;
    btn.setAttribute('aria-controls', id);
    sel.parentNode.insertBefore(wrap, sel); wrap.appendChild(btn); wrap.appendChild(list); wrap.appendChild(sel);
    sel.classList.add('combo-native'); sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true');
    var active = -1;
    function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
    function label() { var o = sel.options[sel.selectedIndex]; btn.innerHTML = '<span>' + (o ? esc(o.textContent) : '') + '</span><i aria-hidden="true"></i>'; }
    function fill() {
      list.innerHTML = [].map.call(sel.options, function (o, i) {
        return '<li role="option" id="' + id + 'o' + i + '" data-i="' + i + '" aria-selected="' + (i === sel.selectedIndex) + '"' + (o.disabled ? ' aria-disabled="true"' : '') + '>' + esc(o.textContent) + '</li>';
      }).join('');
    }
    function mark(i) {
      active = i;
      [].forEach.call(list.children, function (li, k) { li.classList.toggle('act', k === i); });
      if (i < 0) { btn.removeAttribute('aria-activedescendant'); return; }
      btn.setAttribute('aria-activedescendant', id + 'o' + i);
      var li = list.children[i], top = li.offsetTop - 4, bot = li.offsetTop + li.offsetHeight + 4;
      if (top < list.scrollTop) list.scrollTop = top; else if (bot > list.scrollTop + list.clientHeight) list.scrollTop = bot - list.clientHeight;
    }
    function open(v) {
      if (v === !list.hidden) return;
      list.hidden = !v; btn.setAttribute('aria-expanded', String(v)); wrap.classList.toggle('open', v);
      if (v) {
        fill(); wrap.classList.remove('up');
        var r = btn.getBoundingClientRect();
        if (r.bottom + list.offsetHeight + 12 > innerHeight && r.top > innerHeight - r.bottom) wrap.classList.add('up');
        mark(sel.selectedIndex);
      } else mark(-1);
    }
    function pick(i) { if (sel.options[i].disabled) return; var changed = sel.selectedIndex !== i; sel.selectedIndex = i; label(); open(false); if (changed) sel.dispatchEvent(new Event('change', { bubbles: true })); }
    function step(from, d) { for (var k = from + d; k >= 0 && k < sel.options.length; k += d) if (!sel.options[k].disabled) return k; return from; }
    btn.addEventListener('click', function () { btn.focus(); open(list.hidden); });
    list.addEventListener('mousedown', function (e) { e.preventDefault(); });
    list.addEventListener('click', function (e) { e.preventDefault(); var li = e.target.closest('li'); if (li) pick(+li.getAttribute('data-i')); });   // preventDefault: the wrapping <label> must not re-click the button
    list.addEventListener('mousemove', function (e) { var li = e.target.closest('li'); if (li && li.getAttribute('aria-disabled') !== 'true') mark(+li.getAttribute('data-i')); });
    document.addEventListener('mousedown', function (e) { if (!wrap.contains(e.target)) open(false); });
    wrap.addEventListener('focusout', function (e) { if (e.relatedTarget && !wrap.contains(e.relatedTarget)) open(false); });
    sel.addEventListener('change', label);
    btn.addEventListener('keydown', function (e) {
      var k = e.key;
      if (list.hidden) { if (k === 'ArrowDown' || k === 'ArrowUp') { e.preventDefault(); open(true); } return; }
      if (k === 'Escape') { e.preventDefault(); open(false); }
      else if (k === 'ArrowDown') { e.preventDefault(); mark(step(active, 1)); }
      else if (k === 'ArrowUp') { e.preventDefault(); mark(step(active, -1)); }
      else if (k === 'Home') { e.preventDefault(); mark(step(-1, 1)); }
      else if (k === 'End') { e.preventDefault(); mark(step(sel.options.length, -1)); }
      else if (k === 'Enter' || k === ' ') { e.preventDefault(); if (active > -1) pick(active); else open(false); }
      else if (k === 'Tab') open(false);
    });
    label();
  }
  document.querySelectorAll('select').forEach(build);
})();
