/* Navigation behaviour: mobile menu and the language switch.
 * The switch re-renders in place - no navigation, no reload.
 */
(function () {
  'use strict';

  var nav = document.querySelector('.main-nav');
  var toggle = document.querySelector('.menu-toggle');

  function closeMenu() {
    if (!nav || !nav.classList.contains('open')) return;
    nav.classList.remove('open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });

    /* Following a link inside the mobile menu should close it. */
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeMenu();
    });
  }

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.nav-shell')) closeMenu();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (nav && nav.classList.contains('open')) {
      closeMenu();
      if (toggle) toggle.focus();
    }
  });

  /* Language switch. Delegated from document so it survives the header being
     re-rendered, and works no matter when layout.js mounted. */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-lang-toggle]');
    if (!btn) return;
    e.preventDefault();
    window.i18n.toggle();
  });
})();
