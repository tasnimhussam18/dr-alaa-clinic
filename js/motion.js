/* Page-level motion: the ambient aura, the hero's pointer parallax, and the
 * header state that makes the navigation bar materialise once the hero ends.
 *
 * Everything here writes CSS custom properties or toggles a class - the actual
 * motion is described in css/animations.css and css/experience.css, so the
 * timing vocabulary stays in the stylesheets.
 *
 * All three parts are optional: a page without a [data-hero] simply keeps a
 * solid header, and a coarse pointer (touch) skips the parallax entirely.
 */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  /* ---- ambient aura: three slow gold orbs behind every page ---- */

  function mountAura() {
    if (reduced.matches) return;
    var aura = document.createElement('div');
    aura.className = 'page-aura';
    aura.setAttribute('aria-hidden', 'true');

    for (var i = 0; i < 3; i++) {
      var orb = document.createElement('span');
      /* Randomised placement and phase, so the drift never looks tiled. */
      orb.style.cssText =
        'top:' + (5 + Math.random() * 70) + '%;' +
        'inset-inline-start:' + (Math.random() * 80) + '%;' +
        '--orb-size:' + (240 + Math.random() * 260) + 'px;' +
        '--aura-dur:' + (26 + Math.random() * 18) + 's;' +
        '--aura-delay:-' + Math.random() * 20 + 's';
      aura.appendChild(orb);
    }
    document.body.appendChild(aura);
  }

  /* ---- header: transparent over the hero, solid once it ends ---- */

  function headerState() {
    var header = document.querySelector('.site-header');
    if (!header) return;

    var hero = document.querySelector('[data-hero]');
    if (!hero) {
      /* Every page except the home page starts with the bar already there. */
      header.classList.add('is-solid');
      return;
    }

    var ticking = false;

    function update() {
      ticking = false;
      /* There is no bar over the hero on the home page - it is hidden until
         the hero has gone by - so the trigger is the bottom of the hero
         itself, not a header-height before it. */
      var trigger = hero.offsetTop + hero.offsetHeight;
      header.classList.toggle('is-solid', window.pageYOffset > trigger);
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
    window.addEventListener('resize', update);
    update();
  }

  /* ---- hero: the photo drifts inside its frame as the pointer moves ---- */

  function heroParallax() {
    var hero = document.querySelector('[data-hero]');
    if (!hero || reduced.matches || !finePointer.matches) return;

    var x = 0;
    var y = 0;
    var queued = false;

    function paint() {
      queued = false;
      hero.style.setProperty('--mx', x.toFixed(3));
      hero.style.setProperty('--my', y.toFixed(3));
    }

    function queue() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(paint);
    }

    hero.addEventListener(
      'pointermove',
      function (e) {
        if (e.pointerType !== 'mouse') return;
        var rect = hero.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        /* -1 .. 1 from the centre of the hero. */
        x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
        queue();
      },
      { passive: true }
    );

    hero.addEventListener('pointerleave', function () {
      x = 0;
      y = 0;
      queue();
    });
  }

  mountAura();
  headerState();
  heroParallax();
})();
