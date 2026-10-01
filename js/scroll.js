/* Page scrolling: the back-to-top button, plus a smooth-scroll fallback.
 *
 * CSS handles smooth scrolling via scroll-behavior on <html>. Browsers without
 * it (older Safari) fall back to the rAF easing below, so anchor links and the
 * back-to-top button behave the same everywhere.
 */
(function () {
  'use strict';

  var SHOW_AFTER = 400; /* px scrolled before the button appears */
  var DURATION = 300; /* ms - matches the site-wide animation ceiling */

  var nativeSmooth = 'scrollBehavior' in document.documentElement.style;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function scrollToY(y) {
    if (reduced.matches) {
      window.scrollTo(0, y);
      return;
    }
    if (nativeSmooth) {
      window.scrollTo({ top: y, behavior: 'smooth' });
      return;
    }
    var from = window.pageYOffset;
    var distance = y - from;
    var started = null;
    requestAnimationFrame(function frame(now) {
      if (started === null) started = now;
      var progress = Math.min(1, (now - started) / DURATION);
      window.scrollTo(0, from + distance * easeOutCubic(progress));
      if (progress < 1) requestAnimationFrame(frame);
    });
  }

  /* ---- back-to-top button (injected, so it exists on every page) ---- */

  var button = document.createElement('button');
  button.type = 'button';
  button.className = 'back-to-top';
  button.setAttribute('data-i18n-attr', 'aria-label:backToTop');
  button.innerHTML =
    '<svg class="ui-icon" aria-hidden="true" focusable="false">' +
    '<use href="#icon-chevron-end"></use></svg>';
  document.body.appendChild(button);
  if (window.i18n) window.i18n.apply(button);

  button.addEventListener('click', function () {
    scrollToY(0);
    /* Move focus to the top of the document so keyboard users land where the
       page just scrolled to, rather than staying on a now off-screen button. */
    var target = document.getElementById('main') || document.body;
    target.focus({ preventScroll: true });
  });

  var ticking = false;
  function update() {
    button.classList.toggle('is-visible', window.pageYOffset > SHOW_AFTER);
    ticking = false;
  }

  window.addEventListener(
    'scroll',
    function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    },
    { passive: true }
  );
  update();

  /* ---- smooth-scroll fallback for in-page anchors ---- */

  if (!nativeSmooth) {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href^="#"]');
      if (!link) return;
      var id = link.getAttribute('href').slice(1);
      if (!id) return;
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      scrollToY(target.getBoundingClientRect().top + window.pageYOffset);
    });
  }
})();
