/* Scroll-triggered reveals with a randomised effect per element.
 *
 * Markup opts an element in with a bare `data-anim` attribute. This script
 * fills that attribute with one of the effects defined in animations.css,
 * picked at random on every page load, so the page never slides in the same
 * way twice. An element that ships with an explicit value - data-anim="end" -
 * keeps it; that is how the contact form and map get their fixed, matched
 * pair of directions.
 *
 * Siblings that share a parent stagger, so a row of cards fans in rather than
 * arriving as a block.
 *
 * The hidden starting state lives behind html.has-js (set by i18n.js in <head>),
 * so with JavaScript unavailable every section simply renders - content is never
 * left invisible waiting for an observer that will not run.
 */
(function () {
  'use strict';

  var EFFECTS = ['up', 'down', 'start', 'end', 'zoom', 'settle', 'rise', 'flip', 'swing', 'blur'];
  var STAGGER = 90; /* ms between siblings */
  var MAX_STAGGER = 5; /* cap, so a long list never waits half a second */

  var items = [].slice.call(document.querySelectorAll('[data-anim]'));
  if (!items.length) return;

  /* Position within the run of animated siblings under the same parent. */
  var seen = [];
  var counts = [];

  function indexUnder(parent) {
    var at = seen.indexOf(parent);
    if (at === -1) {
      seen.push(parent);
      counts.push(1);
      return 0;
    }
    return counts[at]++;
  }

  items.forEach(function (el) {
    if (!el.getAttribute('data-anim')) {
      el.setAttribute('data-anim', EFFECTS[Math.floor(Math.random() * EFFECTS.length)]);
    }
    var step = Math.min(indexUnder(el.parentNode), MAX_STAGGER);
    if (step) el.style.setProperty('--anim-delay', step * STAGGER + 'ms');
  });

  function revealAll() {
    items.forEach(function (el) {
      el.classList.add('is-in');
    });
  }

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (reduced.matches || !('IntersectionObserver' in window)) {
    revealAll();
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: '0px 0px -6% 0px', threshold: 0.04 }
  );

  items.forEach(function (el) {
    observer.observe(el);
  });

  /* If the user turns reduced-motion on mid-session, stop animating. */
  if (reduced.addEventListener) {
    reduced.addEventListener('change', function (e) {
      if (e.matches) {
        observer.disconnect();
        revealAll();
      }
    });
  }
})();
