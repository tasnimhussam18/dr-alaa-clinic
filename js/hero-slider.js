/* The home hero runs as a two-slide carousel: the smile, then the place.
 *
 * Slides are stacked in one grid cell rather than laid out in a row, so the
 * hero is always as tall as its tallest slide and nothing has to be measured.
 * Moving between them is a cross-fade with a small slide and scale, which is
 * why there is no track to translate.
 *
 * The inactive slide is taken out of the tab order and the accessibility tree
 * (visibility, aria-hidden, inert-by-tabindex on the video) - a link you
 * cannot see should not be reachable by keyboard.
 *
 * Autoplay pauses whenever the visitor is engaged with the hero: pointer over
 * it, focus inside it, the tab in the background, or the OS asking for reduced
 * motion. It resumes on its own after a manual move rather than stopping for
 * good.
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-hero-slider]');
  if (!root) return;

  var slides = [].slice.call(root.querySelectorAll('[data-hero-slide]'));
  if (slides.length < 2) return;

  var dotsBox = root.querySelector('[data-hero-dots]');
  var video = root.querySelector('[data-hero-video]');

  /* Long enough to read the headline before it moves on. */
  var INTERVAL = 8000;

  var index = 0;
  var timer = null;
  var paused = false;

  var reduced = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  function t(key) {
    return window.i18n ? window.i18n.t(key) : '';
  }

  /* ---- dots ---- */

  var dots = slides.map(function (slide, i) {
    var dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'hero-slider-dot';
    dot.setAttribute('role', 'tab');
    dot.addEventListener('click', function () {
      go(i, true);
    });
    if (dotsBox) dotsBox.appendChild(dot);
    return dot;
  });

  function labelDots() {
    dots.forEach(function (dot, i) {
      var name = t('hero.slider.slide' + (i + 1));
      dot.setAttribute('aria-label', name || 'Slide ' + (i + 1));
    });
  }

  /* ---- the move ---- */

  function go(next, manual) {
    var count = slides.length;
    index = ((next % count) + count) % count;

    /* The full-bleed backdrops live outside the slides and cross-fade off
       this attribute - see .hero-bg in experience.css. */
    root.setAttribute('data-active', String(index));

    slides.forEach(function (slide, i) {
      var on = i === index;
      slide.classList.toggle('is-active', on);
      slide.setAttribute('aria-hidden', on ? 'false' : 'true');
      /* Links and buttons on the hidden slide must not be tabbable. */
      [].forEach.call(slide.querySelectorAll('a, button'), function (el) {
        if (on) el.removeAttribute('tabindex');
        else el.setAttribute('tabindex', '-1');
      });
    });

    dots.forEach(function (dot, i) {
      var on = i === index;
      dot.classList.toggle('is-active', on);
      dot.setAttribute('aria-selected', on ? 'true' : 'false');
    });

    syncVideo();
    /* A manual move restarts the clock rather than ending it, so the carousel
       keeps going after someone has had a look around. */
    if (manual) restart();
  }

  /* The video only runs while its slide is up and the tab is in front - there
     is no reason to decode frames nobody is looking at. */
  function syncVideo() {
    if (!video) return;
    var slide = video.closest('[data-hero-slide]');
    var visible = slide && slide.classList.contains('is-active');

    if (visible && !document.hidden) {
      var playing = video.play();
      /* Autoplay can still be refused; muted+playsinline makes that unlikely,
         and a refusal just leaves the first frame showing. */
      if (playing && playing.catch) playing.catch(function () {});
    } else {
      video.pause();
    }
  }

  /* ---- autoplay ---- */

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function restart() {
    stop();
    if (paused) return;
    if (reduced && reduced.matches) return;
    timer = setInterval(function () {
      go(index + 1);
    }, INTERVAL);
  }

  function setPaused(value) {
    paused = value;
    if (value) stop();
    else restart();
  }

  root.addEventListener('mouseenter', function () { setPaused(true); });
  root.addEventListener('mouseleave', function () { setPaused(false); });
  root.addEventListener('focusin', function () { setPaused(true); });
  root.addEventListener('focusout', function (e) {
    if (!root.contains(e.relatedTarget)) setPaused(false);
  });

  document.addEventListener('visibilitychange', function () {
    syncVideo();
    if (document.hidden) stop();
    else restart();
  });

  /* Arrow keys work while the focus is anywhere in the hero. They follow the
     reading direction, so in Arabic the left arrow advances. */
  root.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    var rtl = document.documentElement.dir === 'rtl';
    var forward = rtl ? e.key === 'ArrowLeft' : e.key === 'ArrowRight';
    e.preventDefault();
    go(index + (forward ? 1 : -1), true);
  });

  /* ---- touch ---- */

  var startX = null;
  root.addEventListener('touchstart', function (e) {
    startX = e.touches[0].clientX;
    setPaused(true);
  }, { passive: true });

  root.addEventListener('touchend', function (e) {
    if (startX === null) return;
    var dx = e.changedTouches[0].clientX - startX;
    startX = null;
    setPaused(false);
    if (Math.abs(dx) < 45) return;
    var rtl = document.documentElement.dir === 'rtl';
    /* Dragging against the reading direction advances. */
    var forward = rtl ? dx > 0 : dx < 0;
    go(index + (forward ? 1 : -1), true);
  }, { passive: true });

  if (reduced && reduced.addEventListener) {
    reduced.addEventListener('change', restart);
  }

  document.addEventListener('i18n:change', labelDots);

  labelDots();
  go(0);
  restart();
})();
