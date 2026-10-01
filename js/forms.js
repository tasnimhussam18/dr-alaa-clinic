/* Form submission feedback.
 *
 * There is no backend: every form on the site is intercepted here and confirmed
 * with a dialog - booking says the session is booked, the contact form says the
 * message is away. This is the same submission flow every option in the
 * "How can we help you?" dropdown, Inquiry included, goes through.
 * Wiring a real endpoint means replacing the body of handleSubmit().
 *
 * The dialog behaves like the case viewer: it fades up rather than appearing
 * outright, Escape or the backdrop closes it, Tab stays inside while it is up,
 * and focus returns to the form afterwards.
 */
(function () {
  'use strict';

  var modal = null;
  var opener = null;

  function t(key) {
    return window.i18n ? window.i18n.t(key) : key;
  }

  /* Booking confirms a session; everything else confirms a message. */
  function isBooking() {
    return document.body.getAttribute('data-page') === 'booking';
  }

  function build() {
    modal = document.createElement('div');
    modal.className = 'modal done-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'done-modal-title');
    modal.innerHTML =
      '<div class="modal-card done-card">' +
      '<button class="modal-close" type="button" data-done-close>' +
      '<span aria-hidden="true">&times;</span></button>' +
      '<span class="done-mark" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" focusable="false">' +
      '<path d="M4 12.5l5.2 5.2L20 7" fill="none" stroke="currentColor" stroke-width="2.4" ' +
      'stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
      '<h2 class="heading" id="done-modal-title" data-done-title></h2>' +
      '<p data-done-body></p>' +
      '<button class="btn btn-primary done-ok" type="button" data-done-close></button>' +
      '</div>';
    document.body.appendChild(modal);

    modal.addEventListener('click', function (e) {
      if (e.target === modal || e.target.closest('[data-done-close]')) close();
    });
  }

  function focusable() {
    return [].slice.call(modal.querySelectorAll('button:not([disabled])')).filter(function (el) {
      return el.offsetWidth || el.offsetHeight;
    });
  }

  function open(from) {
    if (!modal) build();
    opener = from || null;

    var booking = isBooking();
    modal.querySelector('[data-done-title]').textContent =
      t(booking ? 'form.bookedTitle' : 'form.sentTitle');
    modal.querySelector('[data-done-body]').textContent =
      t(booking ? 'form.bookedBody' : 'form.sentBody');
    modal.querySelector('.done-ok').textContent = t('form.done');

    modal.classList.add('open');
    document.body.classList.add('has-modal');
    /* Laid out first, then flipped to shown, so the fade has a start state. */
    void modal.offsetHeight;
    modal.classList.add('is-shown');

    /* Focus lands on the action, not on the dismiss cross in the corner. */
    var landing = modal.querySelector('.done-ok') || focusable()[0];
    if (landing) landing.focus();
  }

  function close() {
    if (!modal || !modal.classList.contains('open')) return;
    modal.classList.remove('is-shown');
    document.body.classList.remove('has-modal');

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

  /* Re-label in the new language if it changes while the dialog is up. */
  document.addEventListener('i18n:change', function () {
    if (modal && modal.classList.contains('open')) {
      var booking = isBooking();
      modal.querySelector('[data-done-title]').textContent =
        t(booking ? 'form.bookedTitle' : 'form.sentTitle');
      modal.querySelector('[data-done-body]').textContent =
        t(booking ? 'form.bookedBody' : 'form.sentBody');
      modal.querySelector('.done-ok').textContent = t('form.done');
    }
  });

  function handleSubmit(e) {
    e.preventDefault();
    var submit = e.target.querySelector('[type=submit]');
    e.target.reset();
    /* The custom controls read their value from the native field, so they have
       to be told the reset happened. */
    [].forEach.call(e.target.querySelectorAll('select, input[type=date], input[type=time]'),
      function (field) {
        field.dispatchEvent(new Event('change', { bubbles: true }));
      });
    open(submit);
  }

  [].forEach.call(document.querySelectorAll('form'), function (form) {
    form.addEventListener('submit', handleSubmit);
  });
})();
