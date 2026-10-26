/* Brennock Haulage — home page: the sector band's trailing glide and the one-scroll-one-beat page rhythm.
   Carried over from the approved board; behaviour and timings are unchanged. */
/* Pictures below the hero (the seven sector cards, the closing truck) wait for the page to finish and settle before
   they are fetched, so the first screen gets the whole connection. They are long since in by the time anyone scrolls. */
function loadDeferred() {
  document.querySelectorAll('img[data-src]').forEach(function (img) {
    var pic = img.parentNode;
    if (pic.tagName === 'PICTURE') pic.querySelectorAll('source[data-srcset]').forEach(function (s) { s.srcset = s.getAttribute('data-srcset'); s.removeAttribute('data-srcset'); });
    img.src = img.getAttribute('data-src'); img.removeAttribute('data-src');
  });
}
window.addEventListener('load', function () { setTimeout(loadDeferred, 400); });

/* sectors: mouse-driven horizontal glide. The card at the front of the motion leads,
   each card behind follows its neighbour a touch late, so the gaps breathe open a little
   while moving and close again as the followers catch up. */
(function () {
  var vp = document.getElementById('viewport');
  var track = document.getElementById('track');
  var band = document.getElementById('sectors');
  var cards = Array.prototype.slice.call(track.children);
  var imgs = cards.map(function (c) { return c.querySelector('img'); });
  var bars = document.querySelectorAll('#rail i');
  var finePointer = window.matchMedia('(hover: hover) and (min-width: 761px)');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var n = cards.length, xs = cards.map(function () { return 0; });
  var target = 0, sm = 0, dirS = 1, raf = 0, dir = 1, last = 0;
  /* Everything is eased by time, not by frame, and in two stages: the pointer's own position is smoothed first (a fast
     flick left and right is absorbed instead of being followed), then every card eases toward that. The cards at the front
     of the motion ease quickest, those behind a touch slower, so the gaps breathe open a little and close again as the
     followers settle. The direction is smoothed too, so turning round never swaps leader and followers abruptly. */
  var POINTER_MS = 170, CARD_MS = 260, SPREAD = 0.28;

  // how far the track can slide: measured from layout (offsetLeft ignores the cards' own transforms), so the
  // answer is the same whether the cards are at rest or already shifted
  function maxShift() { var last = cards[n - 1]; return Math.max(0, last.offsetLeft + last.offsetWidth - vp.clientWidth); }

  function render(now) {
    var dt = Math.min(50, last ? now - last : 16); last = now;
    var moving = false;
    if (reduce) { sm = target; xs = xs.map(function () { return target; }); }
    else {
      sm += (target - sm) * (1 - Math.exp(-dt / POINTER_MS));
      dirS += (dir - dirS) * (1 - Math.exp(-dt / 260));
      if (Math.abs(target - sm) < 0.2) sm = target;
      for (var i = 0; i < n; i++) {
        var u = n > 1 ? (i / (n - 1)) * 2 - 1 : 0;                         // -1 first card … +1 last card
        var tau = CARD_MS * (1 + SPREAD * dirS * u);                       // moving right: the first card is quickest; left: the last
        xs[i] += (sm - xs[i]) * (1 - Math.exp(-dt / tau));
      }
      if (sm !== target) moving = true;
    }
    var vw = vp.clientWidth;
    cards.forEach(function (c, i) {
      if (Math.abs(sm - xs[i]) < 0.25) xs[i] = sm; else moving = true;
      c.style.transform = 'translate3d(' + (-xs[i]).toFixed(2) + 'px,0,0)';
      var center = c.offsetLeft - xs[i] + c.offsetWidth / 2;
      imgs[i].style.transform = 'translate3d(' + (((center - vw / 2) / vw) * -7).toFixed(3) + '%,0,0)';
    });
    var cardW = cards[0].offsetWidth + 36, first = Math.round(xs[0] / cardW);
    bars.forEach(function (b, i) { b.classList.toggle('on', i >= first && i < first + 4); });
    if (moving) raf = requestAnimationFrame(render); else { raf = 0; last = 0; }
  }
  function kick() { if (!raf) raf = requestAnimationFrame(render); }

  band.addEventListener('pointermove', function (e) {
    if (!finePointer.matches) return;
    var r = vp.getBoundingClientRect();
    var t = (e.clientX - r.left) / r.width;
    t = Math.min(1, Math.max(0, (t - 0.12) / 0.76));                    // dead zones at both edges
    var nt = t * maxShift();
    if (Math.abs(nt - target) > 4) dir = nt > target ? 1 : -1;         // a few pixels of pointer wobble never turns the direction
    target = nt;
    kick();
  });
  window.addEventListener('resize', function () { target = Math.min(target, maxShift()); kick(); });
  kick();
})();

/* ---------------------------------------------------------------------------
   Page rhythm: every scroll gesture moves to exactly one next beat, with the same
   slow eased glide everywhere. Beats:
   0 far truck · 1 middle truck · 2 near truck (page settles at the road's edge)
   3 statement · 4 sectors · 5 closing truck rises in + headline
   6 night falls, lamps, details · 7 footer
--------------------------------------------------------------------------- */
(function () {
  var header = document.querySelector('header');
  var hero = document.getElementById('hero');
  var frame = document.getElementById('frame');
  var trucks = document.querySelectorAll('.truck');
  var textEls = document.querySelectorAll('.line');
  var rules = document.querySelectorAll('.rule');
  var statement = document.querySelector('.statement');
  var sectors = document.getElementById('sectors');
  var dusk = document.getElementById('dusk');
  var stage = document.getElementById('duskStage');
  var dLines = dusk.querySelectorAll('.ln');
  var lede = document.getElementById('duskLede');
  var cta = document.getElementById('duskCta');
  var rig = document.getElementById('rig');
  var ground = document.getElementById('duskGround');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var LAST = 7, STEP_MS = 1320;
  var stops = [0, 0, 0, 0, 0, 0, 0, 0];
  var pos = 0, target = 0, from = 0, t0 = 0, raf = 0;
  var lastInput = 0, spent = false;
  var nightSeen = false;                                                  // night has fallen once: it stays night when the scene is met again
  var introK = reduce ? 1 : 0;                                            // the first slogan writes itself in on load, like the others do on their beat

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function sm(a, b, t) { t = clamp((t - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function easeIO(t) { return -(Math.cos(Math.PI * t) - 1) / 2; }                  // sine: a gentler start and stop than a cubic
  function mix(a, b, t) { return 'rgb(' + a.map(function (v, i) { return Math.round(v + (b[i] - v) * t); }).join(',') + ')'; }
  function pageTop(el) { return el.getBoundingClientRect().top + window.scrollY; }
  function hdrH() { return header.offsetHeight; }

  /* ---------- layout: where every beat sits ---------- */
  function layout() {
    var vh = window.innerHeight, hh = hdrH();
    var H = frame.getBoundingClientRect().height, top = pageTop(hero);
    var end = Math.max(0, Math.round(top + 0.855 * H - vh));            // road's lower edge on the bottom of the screen
    var mid = Math.min(end, Math.max(Math.round(end / 2), Math.round(top + 0.67 * H - vh)));
    function centre(el) {                                                // centre a band in the space under the menu
      var t = pageTop(el), h = el.offsetHeight, room = vh - hh;
      return Math.round(h >= room ? t - hh : t + h / 2 - (hh + vh) / 2);
    }
    var maxY = Math.max(0, document.documentElement.scrollHeight - vh);
    var pin = Math.round(pageTop(dusk) + (parseFloat(getComputedStyle(dusk).paddingTop) || 0) - hh);
    stops = [0, mid, end, centre(statement), centre(sectors), pin, pin, maxY];
    for (var i = 1; i < stops.length; i++) stops[i] = clamp(stops[i], stops[i - 1], maxY);

    // hero slogans: centred in open sky inside what is on screen at their own stop
    var shifts = [0, mid - top, end - top], at = [0.30, 0.30, 0.36];
    textEls.forEach(function (el, i) {
      var lh = el.offsetHeight;
      var y = Math.max(0.04 * H, Math.max(0, shifts[i]) + vh * at[i] - lh / 2);
      el.style.top = y + 'px';
      rules[i].style.top = Math.round(frame.offsetTop + y + lh + Math.max(10, lh * 0.18)) + 'px';
    });
    ground.style.top = (rig.offsetTop + rig.offsetHeight * 0.955) + 'px';
  }

  function scrollAt(p) {
    var i = clamp(Math.floor(p), 0, LAST - 1), f = clamp(p - i, 0, 1);
    return stops[i] + (stops[i + 1] - stops[i]) * f;
  }

  /* ---------- draw everything for a beat position ---------- */
  var day = [241, 238, 230], night = [22, 30, 38], inkD = [42, 51, 46], inkN = [236, 239, 236];
  function draw(p, moveWindow) {
    // hero
    var h = clamp(p, 0, 2), a = sm(0.08, 0.92, h), b = sm(1.08, 1.92, h);
    var w = [1 - a, a * (1 - b), b];
    var wi = w.slice(); wi[0] = w[0] * sm(0, 1, introK);                    // opening: the slogan fades up while the amber rule draws across
    trucks.forEach(function (el, i) { el.style.opacity = w[i].toFixed(3); });
    textEls.forEach(function (el, i) {
      el.style.opacity = wi[i].toFixed(3);
      el.style.transform = 'translateY(' + ((1 - wi[i]) * 16).toFixed(1) + 'px)';
    });
    rules.forEach(function (el, i) { el.style.transform = 'scaleX(' + sm(0.15, 1, i === 0 ? w[0] * sm(0.25, 1, introK) : w[i]).toFixed(3) + ')'; });

    // closing scene: truck and headline arrive on white, then night falls with the details
    rig.classList.toggle('in', p > 4.45);
    dLines[0].classList.toggle('on', p > 4.75);
    dLines[1].classList.toggle('on', p > 4.88);
    var d = clamp(p - 5, 0, 1);
    if (nightSeen) d = Math.max(d, sm(4.1, 4.6, p));
    stage.style.setProperty('--dusk-bg', mix(day, night, sm(0, 0.75, d)));
    stage.style.setProperty('--dusk-fg', mix(inkD, inkN, sm(0.18, 0.5, d)));
    stage.style.setProperty('--night', sm(0, 0.75, d).toFixed(3));
    stage.style.setProperty('--lamps', sm(0.12, 0.7, d).toFixed(3));
    stage.style.setProperty('--ground', sm(0, 0.6, d).toFixed(3));
    lede.classList.toggle('on', d > 0.55);
    cta.classList.toggle('on', d > 0.72);

    if (moveWindow) window.scrollTo(0, scrollAt(p));
    headerState(p);
  }

  function headerState(p) {
    var hb = header.getBoundingClientRect().bottom;
    header.classList.toggle('over', frame.getBoundingClientRect().bottom >= hb + 4);
    var settled = p >= 2;
    var docked = settled && rules[2].getBoundingClientRect().top <= hb;
    header.classList.toggle('ruled', docked);
    rules[2].style.visibility = docked ? 'hidden' : '';
    if (settled) {                                                        // last slogan fades before it reaches the menu
      var lt = textEls[2].getBoundingClientRect().top;
      textEls[2].style.opacity = (clamp((lt - hb - 10) / 90, 0, 1) * (p >= 2 ? 1 : 0)).toFixed(3);
    }
  }

  /* ---------- motion ---------- */
  var dur = STEP_MS, autoTimer = 0;
  function tick(now) {
    if (!t0) t0 = now;
    var t = reduce ? 1 : clamp((now - t0) / dur, 0, 1);
    pos = from + (target - from) * easeIO(t);
    if (t >= 1) pos = target;
    draw(pos, true);
    if (pos !== target) raf = requestAnimationFrame(tick);
    else { raf = 0; t0 = 0; if (pos === 6) nightSeen = true; if (pos === 5 && from < 5 && !nightSeen) nightfall(); }
  }
  function go(n, ms) {
    introK = 1;
    n = clamp(n, 0, LAST);
    if (n >= 3) loadDeferred();
    clearTimeout(autoTimer); nightRaf = 0;
    if (n === target && !raf) return;
    from = pos; target = n; t0 = 0; dur = ms || STEP_MS;
    if (!raf) raf = requestAnimationFrame(tick);
  }

  /* closing scene: once the truck and headline have settled, nightRaf falls on its own.
     A scroll while it runs only hurries it along from wherever it has got to. */
  var nightRaf = 0, nT0 = 0, nFrom = 0, NIGHT_MS = 3200;
  function nightfall() {
    clearTimeout(autoTimer);
    autoTimer = setTimeout(function () { nFrom = pos; nT0 = 0; nightRaf = requestAnimationFrame(nightTick); }, reduce ? 0 : 450);
  }
  function nightTick(now) {
    if (!nightRaf) return;
    if (!nT0) nT0 = now;
    var t = reduce ? 1 : clamp((now - nT0) / (NIGHT_MS * (6 - nFrom)), 0, 1);
    pos = nFrom + (6 - nFrom) * (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    if (t >= 1) { pos = target = 6; nightRaf = 0; nightSeen = true; }
    draw(pos, false);
    if (nightRaf) nightRaf = requestAnimationFrame(nightTick);
  }
  function hurry() {                                                        // scroll during nightfall: finish it, quickly
    cancelAnimationFrame(nightRaf); nightRaf = 0;
    go(6, Math.max(420, (6 - pos) * 900));
  }
  function nearestStop() {                                                // after a scrollbar drag, pick up from where the page is
    var y = window.scrollY, best = 0;
    for (var i = 0; i <= LAST; i++) if (stops[i] <= y + 4) best = i;
    // beats that share one scroll position (a tall screen where the whole hero fits, or the pinned closing scene):
    // stay on the one we are already on, never jump to the last of them
    var lo = best;
    while (lo > 0 && Math.abs(stops[lo - 1] - stops[best]) <= 4) lo--;
    if (lo < best) best = clamp(Math.round(pos), lo, best);
    return best;
  }
  function step(dir) {
    if (nightRaf && dir > 0) { hurry(); return; }
    if (nightRaf) { cancelAnimationFrame(nightRaf); nightRaf = 0; go(4); return; }
    if (raf) return;
    if (Math.abs(window.scrollY - scrollAt(pos)) > 6) { pos = target = nearestStop(); }
    var n = Math.round(pos) + dir;
    if (nightSeen && n === 5) n = dir > 0 ? 6 : 4;                        // beats 5 and 6 are one pinned scene once night has fallen
    go(n);
  }

  /* ---------- input: one gesture, one beat ---------- */
  window.addEventListener('wheel', function (e) {
    if (e.ctrlKey) return;                                                // pinch-zoom
    if (document.body.classList.contains('modal-open')) return;           // the action dialog is up: the page waits
    var dir = Math.sign(e.deltaY); if (!dir) return;
    e.preventDefault();
    var now = e.timeStamp || performance.now();                         // when the wheel turned, not when a busy frame got to it
    if (now - lastInput > 240) spent = false;                             // a pause starts a new gesture
    lastInput = now;
    if (spent || raf) return;                                             // momentum of a gesture already used
    spent = true;
    step(dir);
  }, { passive: false });

  // touch: a swipe along the page is one beat; a swipe sideways belongs to the sector band
  var ty = null, tx = 0;
  window.addEventListener('touchstart', function (e) { ty = e.touches[0].clientY; tx = e.touches[0].clientX; spent = false; }, { passive: true });
  window.addEventListener('touchmove', function (e) {
    if (ty === null || document.body.classList.contains('modal-open')) return;
    var dy = ty - e.touches[0].clientY, dx = tx - e.touches[0].clientX;
    if (Math.abs(dx) > Math.abs(dy)) return;
    e.preventDefault();
    if (!spent && Math.abs(dy) > 30) { spent = true; step(Math.sign(dy)); }
  }, { passive: false });
  window.addEventListener('touchend', function () { ty = null; }, { passive: true });

  window.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey || document.body.classList.contains('modal-open')) return;
    var dir = ['ArrowDown', 'PageDown', ' '].indexOf(e.key) > -1 ? 1 : ['ArrowUp', 'PageUp'].indexOf(e.key) > -1 ? -1 : 0;
    if (e.key === 'Home') { e.preventDefault(); go(0); return; }
    if (e.key === 'End') { e.preventDefault(); go(LAST); return; }
    if (dir) { e.preventDefault(); step(dir); }
  });

  // menu links travel through the same glide
  document.querySelectorAll('a[href="/"]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); go(0); }); });

  window.addEventListener('scroll', function () {
    if (raf) return;
    headerState(pos);
  }, { passive: true });
  window.addEventListener('resize', function () { layout(); if (!raf) draw(pos, true); });
  window.addEventListener('load', function () { layout(); draw(pos, false); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { layout(); if (!raf) draw(pos, true); });


  /* opening: once everything is laid out, the first slogan fades up and the amber rule draws across, as on every other beat */
  var introRaf = 0;
  function runIntro() {
    if (introK >= 1) return;
    var t0i = 0, DUR = 1500;
    function f(now) {
      if (introK >= 1) { introRaf = 0; return; }
      if (!t0i) t0i = now;
      introK = clamp((now - t0i) / DUR, 0, 1);
      if (!raf) draw(pos, false);
      if (introK < 1) introRaf = requestAnimationFrame(f); else introRaf = 0;
    }
    introRaf = requestAnimationFrame(f);
  }
  var loadedOnce = false;
  function startIntro() { if (loadedOnce) return; loadedOnce = true; setTimeout(runIntro, 350); }
  window.addEventListener('load', startIntro);
  if (document.readyState === 'complete') startIntro();

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  layout();
  pos = target = nearestStop();
  draw(pos, false);
})();
