/* Case detail viewer.
 *
 * Every case card carries a "View details" control. Rather than sending the
 * visitor away to the case page, it opens the fuller view in place: the
 * before/after pair at a readable size, the title and description, the
 * treatment facts, and a way through to booking or to the full case page.
 *
 * The content is read off the card itself - there is no second copy of the
 * case data to keep in step, and a card added to the markup tomorrow works
 * with no change here. The translated strings come through window.i18n, so the
 * dialog re-renders when the language flips while it is open.
 *
 * Behaves like a dialog: focus moves in, Tab is kept inside, Escape closes,
 * and focus returns to whatever opened it.
 */
(function () {
  'use strict';

  var cards = [].slice.call(document.querySelectorAll('.work-card'));
  if (!cards.length) return;

  var t = function (key, vars) {
    return window.i18n ? window.i18n.t(key, vars) : key;
  };

  var opener = null;
  var current = null;
  var modal = null;

  /* ---- the dialog, built once ---- */

  function build() {
    modal = document.createElement('div');
    modal.className = 'modal case-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'case-modal-title');
    modal.innerHTML =
      '<div class="modal-card case-modal-card">' +
      '<button class="modal-close" type="button" data-case-close>' +
      '<span aria-hidden="true">&times;</span></button>' +
      '<div class="case-modal-media" data-case-media></div>' +
      '<div class="case-modal-body">' +
      '<span class="eyebrow" data-case-category></span>' +
      '<h2 class="heading" id="case-modal-title" data-case-title></h2>' +
      '<p data-case-desc></p>' +
      '<dl class="case-facts" data-case-facts></dl>' +
      '<div class="case-modal-actions">' +
      '<a class="btn btn-primary" href="booking.html" data-case-book></a>' +
      '<a class="btn btn-outline" href="details.html" data-case-full></a>' +
      '</div>' +
      '</div>' +
      '</div>';
    document.body.appendChild(modal);

    modal.addEventListener('click', function (e) {
      /* The backdrop is the element itself; the card is what sits on it. */
      if (e.target === modal || e.target.closest('[data-case-close]')) close();
    });
  }

  /* ---- rendering ---- */

  function fill(card) {
    current = card;

    var before = card.querySelector('.compare-before');
    var after = card.querySelector('.compare-after');
    var titleEl = card.querySelector('.work-card-content h3');
    var descEl = card.querySelector('.work-card-content p');
    var category = card.getAttribute('data-category') || '';
    var link = card.querySelector('.work-card-link');

    modal.querySelector('[data-case-media]').innerHTML =
      '<figure class="case-shot">' +
      '<img src="' + (before ? before.getAttribute('src') : '') + '" alt="' +
      (before ? before.getAttribute('alt') : '') + '">' +
      '<figcaption>' + t('compare.before') + '</figcaption></figure>' +
      '<figure class="case-shot">' +
      '<img src="' + (after ? after.getAttribute('src') : '') + '" alt="' +
      (after ? after.getAttribute('alt') : '') + '">' +
      '<figcaption class="is-after">' + t('compare.after') + '</figcaption></figure>';

    modal.querySelector('[data-case-category]').textContent = category ? t('cat.' + category) : '';
    modal.querySelector('[data-case-title]').textContent = titleEl ? titleEl.textContent : '';
    modal.querySelector('[data-case-desc]').textContent = descEl ? descEl.textContent : '';

    modal.querySelector('[data-case-facts]').innerHTML =
      '<div><dt>' + t('details.stat1Label') + '</dt><dd>' +
      (category ? t('cat.' + category) : t('details.stat1Value')) + '</dd></div>' +
      '<div><dt>' + t('details.stat2Label') + '</dt><dd>' + t('details.stat2Value') + '</dd></div>' +
      '<div><dt>' + t('details.stat3Label') + '</dt><dd>' + t('details.stat3Value') + '</dd></div>';

    modal.querySelector('[data-case-book]').textContent = t('details.ctaBtn');
    var full = modal.querySelector('[data-case-full]');
    full.textContent = t('case.viewFull');
    if (link) full.setAttribute('href', link.getAttribute('href'));
  }

  /* ---- open / close ---- */

  function focusable() {
    return [].slice
      .call(modal.querySelectorAll('a[href], button:not([disabled])'))
      .filter(function (el) {
        return el.offsetWidth || el.offsetHeight;
      });
  }

  function open(card, from) {
    if (!modal) build();
    opener = from || null;
    fill(card);
    modal.classList.add('open');
    document.body.classList.add('has-modal');
    /* Laid out first, then flipped to its shown state, so the fade and the
       rise have a start to run from instead of snapping straight on. */
    void modal.offsetHeight;
    modal.classList.add('is-shown');
    var first = focusable()[0];
    if (first) first.focus();
  }

  function close() {
    if (!modal || !modal.classList.contains('open')) return;
    modal.classList.remove('is-shown');
    document.body.classList.remove('has-modal');
    current = null;

    /* Held in the layout until it has finished fading, then taken down. */
    var done = function (e) {
      if (e && e.target !== modal) return;
      if (!modal.classList.contains('is-shown')) modal.classList.remove('open');
      modal.removeEventListener('transitionend', done);
    };
    modal.addEventListener('transitionend', done);
    setTimeout(done, 500);

    if (opener) opener.focus();
    opener = null;
  }

  document.addEventListener('keydown', function (e) {
    if (!modal || !modal.classList.contains('open')) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab') return;

    /* Keep Tab inside the dialog while it is up. */
    var items = focusable();
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  /* Re-render in the new language if it changes while the dialog is open. */
  document.addEventListener('i18n:change', function () {
    if (current && modal && modal.classList.contains('open')) fill(current);
  });

  /* ---- the control on each card ---- */

  cards.forEach(function (card) {
    var content = card.querySelector('.work-card-content');
    if (!content) return;

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'case-more';
    button.setAttribute('data-case-open', '');
    button.innerHTML =
      '<span data-i18n="case.viewDetails"></span>' +
      '<span class="btn-arrow" aria-hidden="true"></span>';
    content.appendChild(button);
    if (window.i18n) window.i18n.apply(button);

    /* The card is wrapped in a link to the case page; this control must open
       the dialog instead of following it. */
    button.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      open(card, button);
    });
  });
})();
