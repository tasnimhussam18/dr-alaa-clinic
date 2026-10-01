/* Shared page chrome: injects the header and footer into every page so the
 * markup exists in exactly one place. Emits data-i18n hooks rather than baked
 * strings, so the language switch re-renders it like any other content.
 *
 * Replaces the old components.js, which built two hardcoded string variants
 * behind an isAr ternary.
 */
(function () {
  'use strict';

  /* Footer specialties link into the portfolio filter by category id.
     Ids must match the data-category values in works.html. */
  var SPECIALTIES = ['smile-design', 'veneers', 'whitening', 'orthodontics'];

  var SOCIALS = [
    { key: 'social.instagram', icon: 'instagram', href: '#' },
    { key: 'social.facebook', icon: 'facebook', href: '#' },
    { key: 'social.linkedin', icon: 'linkedin', href: '#' },
  ];

  function brand(logoClass) {
    return (
      '<img class="' + logoClass + '" src="assets/logo.svg" alt="" data-i18n-attr="alt:brand.logoAlt">' +
      '<span class="brand-name">' +
      '<span data-i18n="brand.name"></span>' +
      '<small data-i18n="brand.tagline"></small>' +
      '</span>'
    );
  }

  function navLink(page, href, key) {
    return '<a href="' + href + '" data-nav="' + page + '" data-i18n="' + key + '"></a>';
  }

  function header() {
    return (
      '<header class="site-header">' +
      '<div class="container nav-shell">' +
      '<a class="brand" href="index.html">' + brand('brand-logo') + '</a>' +
      '<nav class="main-nav" data-i18n-attr="aria-label:nav.aria">' +
      navLink('home', 'index.html', 'nav.home') +
      navLink('about', 'about.html', 'nav.about') +
      navLink('works', 'works.html', 'nav.works') +
      navLink('contact', 'contact.html', 'nav.contact') +
      '</nav>' +
      '<div class="nav-actions">' +
      '<a class="btn btn-primary nav-booking" href="booking.html" data-i18n="nav.book"></a>' +
      '<button class="lang-link" type="button" data-lang-toggle ' +
      'data-i18n-attr="aria-label:nav.langSwitch">' +
      '<span data-i18n="nav.langLabel"></span></button>' +
      '<button class="menu-toggle" type="button" aria-expanded="false" ' +
      'aria-controls="main-nav" data-i18n-attr="aria-label:nav.menu">' +
      '<svg class="ui-icon" aria-hidden="true" focusable="false">' +
      '<use href="#icon-menu"></use></svg></button>' +
      '</div>' +
      '</div>' +
      '</header>'
    );
  }

  function footer() {
    var quick =
      '<li>' + navLink('home', 'index.html', 'nav.home') + '</li>' +
      '<li>' + navLink('about', 'about.html', 'nav.about') + '</li>' +
      '<li>' + navLink('works', 'works.html', 'nav.works') + '</li>' +
      '<li>' + navLink('contact', 'contact.html', 'nav.contact') + '</li>';

    var specialties = SPECIALTIES.map(function (id) {
      return (
        '<li><a class="footer-specialty" href="works.html#' + id + '" ' +
        'data-i18n="cat.' + id + '"></a></li>'
      );
    }).join('');

    var socials = SOCIALS.map(function (s) {
      return (
        '<a href="' + s.href + '" data-i18n-attr="aria-label:' + s.key + '">' +
        '<img src="assets/' + s.icon + '.svg" alt=""></a>'
      );
    }).join('');

    return (
      '<footer class="footer">' +
      '<div class="container">' +
      '<div class="footer-grid">' +
      /* data-anim opts each column into the reveal engine in reveal.js, which
         gives it a randomly chosen effect and a stagger delay. */
      '<div data-anim>' +
      '<div class="brand">' + brand('brand-logo') + '</div>' +
      '<p data-i18n="footer.desc"></p>' +
      '<div class="socials">' + socials + '</div>' +
      '</div>' +
      '<div data-anim><h3 data-i18n="footer.quick"></h3><ul>' + quick + '</ul></div>' +
      '<div data-anim><h3 data-i18n="footer.specialties"></h3><ul>' + specialties + '</ul></div>' +
      '<div data-anim><h3 data-i18n="footer.details"></h3>' +
      '<ul class="footer-contact">' +
      '<li><img class="footer-contact-icon footer-call-icon" src="assets/call.svg" alt="" aria-hidden="true">' +
      '<a href="tel:+20123456789" dir="ltr">+20 123 456 789</a></li>' +
      '<li><img class="footer-contact-icon footer-whatsapp-icon" src="assets/whatsapp.svg" alt="" aria-hidden="true">' +
      '<a href="https://wa.me/20223456789" target="_blank" rel="noopener noreferrer" dir="ltr">+20 2 2345 6789</a></li>' +
      '<li><img class="footer-contact-icon footer-location-icon" src="assets/location.svg" alt="" aria-hidden="true">' +
      '<span data-i18n="footer.address"></span></li>' +
      '</ul></div>' +
      '</div>' +
      '<div class="footer-bottom">' +
      '<span data-i18n="footer.rights"></span>' +
      '<div><a href="#" data-i18n="footer.privacy"></a>' +
      '<a href="#" data-i18n="footer.terms"></a></div>' +
      '</div>' +
      '</div>' +
      '</footer>'
    );
  }

  /* Mark the nav entry matching <body data-page> - in both the header and the
     footer quick links. Re-run is safe. */
  function markActive() {
    var page = document.body.getAttribute('data-page') || 'home';
    if (page === 'details') page = 'works';
    [].forEach.call(document.querySelectorAll('[data-nav]'), function (link) {
      var isActive = link.getAttribute('data-nav') === page;
      link.classList.toggle('active', isActive);
      if (isActive && link.closest('.main-nav')) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function mount(id, html) {
    var slot = document.getElementById(id);
    if (!slot) return;
    slot.innerHTML = html;
    if (window.i18n) window.i18n.apply(slot);
  }

  mount('site-header', header());
  mount('site-footer', footer());
  markActive();

  /* The nav element needs an id for the toggle's aria-controls. */
  var nav = document.querySelector('.main-nav');
  if (nav) nav.id = 'main-nav';
})();
