/* Cover-flow portfolio gallery.
 *
 * Slides are absolutely stacked on one spot and placed entirely with
 * transforms - each one is positioned by its signed distance from the active
 * slide around a ring, so the loop is genuinely infinite: nothing is cloned and
 * there is no index to reset, which is what usually causes a visible jump.
 *
 * The slide that wraps from one end of the ring to the other does travel the
 * full width, but it is fully transparent at both ends of that trip, so the
 * crossing is never seen.
 *
 * Tuning lives in CSS custom properties on the root element (--cf-gap,
 * --cf-angle, --cf-depth, --cf-scale, --cf-compress, --cf-visible, --cf-fade),
 * which means the responsive behaviour is written once, in media queries,
 * rather than duplicated as breakpoints in here.
 *
 * Markup contract:
 *   [data-coverflow]                root, optional data-interval in ms
 *     [data-coverflow-viewport]     clips; owns the pointer gestures
 *       [data-coverflow-track]      holds the perspective
 *         [data-coverflow-slide]    one per image
 *     [data-coverflow-prev/next]    controls, anywhere inside the root
 */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var DRAG_LIMIT = 1.6; /* cards - how far a single drag can travel */
  var DRAG_START = 4; /* px before a press counts as a drag */

  function now() {
    return Date.now ? Date.now() : new Date().getTime();
  }

  function setup(root) {
    var viewport = root.querySelector('[data-coverflow-viewport]');
    var track = root.querySelector('[data-coverflow-track]');
    var slides = [].slice.call(root.querySelectorAll('[data-coverflow-slide]'));
    var count = slides.length;
    if (!viewport || !track || count < 2) return;

    var interval = parseInt(root.getAttribute('data-interval'), 10) || 0;

    var index = 0;
    var frac = 0; /* live drag offset, measured in slides */
    var timer = null;
    var held = false; /* pointer or focus is inside */
    var cfg = null;
    var drag = null;
    var draggedAt = 0; /* when the last real drag ended - see the click guard */

    /* ---- configuration, read from CSS ---- */

    function readConfig() {
      var cs = getComputedStyle(root);
      function num(name, fallback) {
        var value = parseFloat(cs.getPropertyValue(name));
        return isNaN(value) ? fallback : value;
      }
      /* offsetWidth, not getBoundingClientRect: the slide is scaled, and the
         rect would report the scaled width. */
      var width = slides[0].offsetWidth || 240;
      cfg = {
        step: width + num('--cf-gap', 22),
        angle: num('--cf-angle', 7),
        tilt: num('--cf-tilt', 2.5),
        arc: num('--cf-arc', 34),
        depth: num('--cf-depth', 78),
        scale: num('--cf-scale', .025),
        compress: num('--cf-compress', .9),
        visible: Math.max(1, num('--cf-visible', 2)),
        fade: num('--cf-fade', 0),
        /* Arabic reads right to left, so the gallery flows that way too. */
        dir: cs.direction === 'rtl' ? -1 : 1,
      };
    }

    /* A seamless ring needs one spare card parked off each end on top of the
       ones on show. With fewer cards than that, the card leaving one side is
       the same one that has to arrive at the other, and it would visibly jump
       across. Repeating the whole set fixes it: the copies sit a full set away
       from their originals, so a card and its copy are never on screen
       together. The copies stay out of the accessibility tree - the originals
       already carry the alt text, and the portfolio grid below is the real
       content. */
    function padRing() {
      var needed = 2 * Math.ceil(cfg.visible) + 3;
      if (count >= needed) return;
      var originals = slides.slice();
      while (slides.length < needed) {
        for (var i = 0; i < originals.length; i++) {
          var copy = originals[i].cloneNode(true);
          copy.setAttribute('data-clone', '');
          track.appendChild(copy);
          slides.push(copy);
        }
      }
      count = slides.length;
    }

    /* ---- geometry ---- */

    /* Shortest signed distance from the active slide around the ring. */
    function ringDelta(i) {
      var d = i - index;
      return d - count * Math.round(d / count);
    }

    /* Distance from centre for a position, in px. Each step out is a little
       tighter than the last, which is what curves the row. Continuous, so it
       also works for the fractional positions a drag produces. */
    function offsetFor(position) {
      var sign = position < 0 ? -1 : 1;
      var distance = Math.abs(position);
      var whole = Math.floor(distance);
      var total = 0;
      for (var k = 0; k < whole; k++) {
        total += cfg.step * Math.pow(cfg.compress, k);
      }
      total += (distance - whole) * cfg.step * Math.pow(cfg.compress, whole);
      return sign * total;
    }

    function render() {
      var edge = cfg.visible + 1;

      for (var i = 0; i < count; i++) {
        var position = ringDelta(i) - frac;
        /* A drag can push a slide past the halfway point of the ring; bring it
           back round so it always takes the short way. */
        if (position > count / 2) position -= count;
        else if (position < -count / 2) position += count;

        var distance = Math.abs(position);
        var sign = position < 0 ? -1 : 1;
        /* Park anything past the last rendered slot on that slot, so the ones
           waiting off-stage do not fly off into the distance. */
        var reach = Math.min(distance, edge);

        var x = offsetFor(sign * reach) * cfg.dir;
        /* The row hangs from an arc: the middle sits lowest and the ends ride
           up, and each slide tips to stay tangent to that curve. */
        var y = cfg.arc * Math.cos((reach / edge) * (Math.PI / 2));
        var tilt = -cfg.tilt * sign * reach * cfg.dir;
        var rotation = -sign * cfg.dir * cfg.angle * reach;
        var z = -cfg.depth * reach;
        var scale = Math.max(.4, 1 - cfg.scale * reach);
        var opacity = distance > cfg.visible + .5 ? 0 : Math.max(0, 1 - cfg.fade * distance);

        var slide = slides[i];
        slide.style.transform =
          'translate3d(calc(-50% + ' + x.toFixed(1) + 'px), ' + y.toFixed(1) + 'px, ' +
          z.toFixed(1) + 'px)' +
          ' rotateY(' + rotation.toFixed(2) + 'deg)' +
          ' rotate(' + tilt.toFixed(2) + 'deg)' +
          ' scale(' + scale.toFixed(3) + ')';
        slide.style.opacity = String(opacity);
        slide.style.zIndex = String(100 - Math.round(distance * 10));
        /* visibility, not just opacity: the cards are links, and an off-stage
           one must be out of the tab order and out of the accessibility tree.
           It also settles the copies - exactly five cards are on stage at any
           moment and they are always five different pictures, so whichever of
           an original and its copy is showing is the one that is reachable. */
        var shown = opacity > 0;
        slide.style.visibility = shown ? 'visible' : 'hidden';
        slide.setAttribute('aria-hidden', shown ? 'false' : 'true');
      }
    }

    /* ---- moving ---- */

    function go(step) {
      index = ((index + step) % count + count) % count;
      render();
    }

    /* A manual move restarts the countdown rather than fighting it. */
    function drive(step) {
      go(step);
      start();
    }

    /* ---- autoplay ---- */

    function stop() {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    }

    function start() {
      stop();
      if (!interval || held || drag || document.hidden || reduced.matches) return;
      timer = setInterval(function () {
        go(1);
      }, interval);
    }

    function hold(on) {
      held = on;
      if (on) stop();
      else start();
    }

    /* ---- input ---- */

    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-coverflow-next]')) drive(1);
      else if (e.target.closest('[data-coverflow-prev]')) drive(-1);
    });

    root.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      var rtl = cfg.dir === -1;
      var forward = rtl ? e.key === 'ArrowLeft' : e.key === 'ArrowRight';
      e.preventDefault();
      drive(forward ? 1 : -1);
    });

    root.addEventListener('mouseenter', function () {
      hold(true);
    });
    root.addEventListener('mouseleave', function () {
      hold(false);
    });
    root.addEventListener('focusin', function () {
      hold(true);
    });
    root.addEventListener('focusout', function () {
      if (!root.contains(document.activeElement)) hold(false);
    });

    /* Drag on desktop, swipe on touch - the same pointer path for both.
       touch-action on the viewport keeps vertical page scrolling working. */
    viewport.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      drag = { id: e.pointerId, from: e.clientX, live: false };
      stop();
    });

    viewport.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var moved = e.clientX - drag.from;

      if (!drag.live) {
        if (Math.abs(moved) < DRAG_START) return;
        drag.live = true;
        root.classList.add('is-dragging');
        /* Capture only once the gesture is really a drag, so a plain tap does
           not swallow the pointer. */
        if (viewport.setPointerCapture) viewport.setPointerCapture(e.pointerId);
      }

      frac = Math.max(-DRAG_LIMIT, Math.min(DRAG_LIMIT, (-moved / cfg.step) * cfg.dir));
      render();
    });

    function endDrag(e) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      var wasLive = drag.live;
      if (wasLive && viewport.releasePointerCapture && viewport.hasPointerCapture(drag.id)) {
        viewport.releasePointerCapture(drag.id);
      }
      drag = null;
      root.classList.remove('is-dragging');

      if (wasLive) {
        /* Snap to whichever card the drag landed nearest. */
        var settled = Math.round(frac);
        frac = 0;
        go(settled);
        draggedAt = now();
      }
      start();
    }

    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);

    /* The click that follows a real drag has to be swallowed, or letting go
       over a card would also follow its link. The class cannot be the signal:
       it is taken off in endDrag, which runs before the click arrives. */
    root.addEventListener(
      'click',
      function (e) {
        if (now() - draggedAt > 400) return;
        e.stopPropagation();
        e.preventDefault();
      },
      true
    );

    /* ---- environment ---- */

    var queued = false;
    function refresh() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        readConfig();
        render();
      });
    }

    window.addEventListener('resize', refresh);
    /* The language switch flips the writing direction, which mirrors the row. */
    document.addEventListener('i18n:change', refresh);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else start();
    });

    if (reduced.addEventListener) {
      reduced.addEventListener('change', function () {
        if (reduced.matches) stop();
        else start();
      });
    }

    readConfig();
    padRing();
    render();
    start();
  }

  [].forEach.call(document.querySelectorAll('[data-coverflow]'), setup);
})();
