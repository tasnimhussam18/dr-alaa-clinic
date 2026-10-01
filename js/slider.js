/* Before/after comparison slider.
 *
 * --position is a LOGICAL value: the share of the frame, measured from the
 * inline-start edge, given over to the "before" image. That means it is
 * measured from the left in English and from the right in Arabic, so the
 * component mirrors correctly instead of reading backwards in RTL.
 *
 * Three ways to drive it, all writing through set():
 *   - drag anywhere on the frame
 *   - the two chevrons in the grip, which step by STEP
 *   - arrow / Home / End keys while the handle has focus
 *
 * Every instance closes over its own position, so multiple sliders on one page
 * never interfere.
 */
(function () {
  'use strict';

  var STEP = 10;
  var KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];

  function setup(compare) {
    var handle = compare.querySelector('.compare-handle');
    var start = parseFloat(compare.style.getPropertyValue('--position'));
    var position = isNaN(start) ? 50 : start;
    var dragging = false;

    function isRTL() {
      return getComputedStyle(compare).direction === 'rtl';
    }

    function set(value) {
      position = Math.max(0, Math.min(100, value));
      compare.style.setProperty('--position', position + '%');
      if (handle) handle.setAttribute('aria-valuenow', String(Math.round(position)));
    }

    function fromPointer(clientX) {
      var rect = compare.getBoundingClientRect();
      if (!rect.width) return;
      var ratio = isRTL()
        ? (rect.right - clientX) / rect.width
        : (clientX - rect.left) / rect.width;
      set(ratio * 100);
    }

    /* "before" reveals more of the untreated image, which means growing the
       inline-start share; "after" shrinks it. Independent of writing direction. */
    function step(which) {
      set(position + (which === 'before' ? STEP : -STEP));
    }

    compare.addEventListener('pointerdown', function (e) {
      var stepper = e.target.closest('.compare-step');
      if (stepper) {
        /* A chevron press steps; it must not also jump the divider to the
           pointer, which is what made the arrows look broken before. */
        e.preventDefault();
        step(stepper.getAttribute('data-step'));
        if (handle) handle.focus();
        return;
      }
      e.preventDefault();
      dragging = true;
      compare.setPointerCapture(e.pointerId);
      fromPointer(e.clientX);
    });

    compare.addEventListener('pointermove', function (e) {
      if (dragging) fromPointer(e.clientX);
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      if (compare.hasPointerCapture(e.pointerId)) {
        compare.releasePointerCapture(e.pointerId);
      }
    }
    compare.addEventListener('pointerup', endDrag);
    compare.addEventListener('pointercancel', endDrag);

    /* Keep the chevrons from submitting or double-firing after pointerdown. */
    compare.addEventListener('click', function (e) {
      if (e.target.closest('.compare-step')) e.preventDefault();
    });

    if (handle) {
      handle.addEventListener('keydown', function (e) {
        if (KEYS.indexOf(e.key) === -1) return;
        e.preventDefault();

        /* position is logical, so Home/End map straight onto the ARIA
           min/max in both directions. */
        if (e.key === 'Home') return set(0);
        if (e.key === 'End') return set(100);

        /* Physical arrow keys track visual movement: in RTL, pressing Right
           moves the divider right, which lowers the inline-start share. */
        var forward = e.key === 'ArrowRight' || e.key === 'ArrowUp';
        var direction = isRTL() ? -1 : 1;
        set(position + (forward ? STEP : -STEP) * direction);
      });
    }

    set(position);
  }

  [].forEach.call(document.querySelectorAll('[data-compare]'), setup);
})();
