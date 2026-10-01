/* Expandable service cards - home page.
 *
 * One card at a time, opened by hovering it. Moving the pointer out of the row
 * closes it again. The widths are animated by CSS transitions on flex-grow, so
 * nothing is measured or set in pixels from here; this module only decides
 * WHICH card is open and reflects that in a class and in ARIA.
 *
 * Hover is not the only way in:
 *   - focus opens a card too, so the panel is reachable from the keyboard;
 *     that is what the chevron button is for - it is the focusable thing
 *     inside each card and it carries aria-expanded / aria-controls
 *   - a tap opens one on touch screens, where there is no hover at all, and
 *     tapping outside the row (or Escape) closes it
 *
 * Opening is idempotent rather than a toggle: clicking a card that hover has
 * already opened should leave it open, not shut it in the visitor's face.
 */
(function () {
  'use strict';

  var row = document.querySelector('[data-services]');
  if (!row) return;

  var cards = [].slice.call(row.querySelectorAll('[data-service]'));
  if (!cards.length) return;

  var open = -1; /* index of the one expanded card, -1 for none */

  function paint() {
    cards.forEach(function (card, i) {
      var isOpen = i === open;
      card.classList.toggle('is-open', isOpen);

      var toggle = card.querySelector('[data-service-toggle]');
      if (toggle) toggle.setAttribute('aria-expanded', String(isOpen));

      var detail = card.querySelector('[data-service-detail]');
      if (detail) detail.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    });
    /* Lets the row fade back the cards that are not the one being read. */
    row.classList.toggle('has-open', open !== -1);
  }

  function show(index) {
    if (open === index) return;
    open = index;
    paint();
  }

  function hide() {
    if (open === -1) return;
    open = -1;
    paint();
  }

  cards.forEach(function (card, i) {
    /* mouseenter rather than mouseover: it does not fire again as the pointer
       crosses the card's own children. */
    card.addEventListener('mouseenter', function () {
      show(i);
    });
    /* Focus follows the same path, so tabbing through opens each card in turn. */
    card.addEventListener('focusin', function () {
      show(i);
    });
  });

  /* Leaving the row - not just one card - is what closes it, so sweeping the
     pointer sideways across the row never flickers shut between cards. */
  row.addEventListener('mouseleave', hide);

  row.addEventListener('focusout', function () {
    if (!row.contains(document.activeElement)) hide();
  });

  /* Touch: no hover, so a tap opens. */
  row.addEventListener('click', function (e) {
    if (e.target.closest('a')) return; /* a link keeps its own behaviour */
    var card = e.target.closest('[data-service]');
    if (!card) return;
    show(cards.indexOf(card));
  });

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-services]')) return;
    hide();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') hide();
  });

  paint();
})();
