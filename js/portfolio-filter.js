/* Portfolio category filter + client-side pagination.
 *
 * Entirely data-driven: the categories come from the data-category attribute on
 * each card and the data-filter attribute on each button. Adding a project or a
 * whole new category is a markup change - nothing here needs editing.
 *
 * Deep links: works.html#veneers (used by the footer specialty links) selects
 * that category on load and on hashchange.
 */
(function () {
  'use strict';

  var PER_PAGE = 6;

  var root = document.querySelector('[data-portfolio]');
  if (!root) return;

  var grid = root.querySelector('[data-portfolio-grid]');
  var pager = root.querySelector('[data-portfolio-pager]');
  var empty = root.querySelector('.works-empty');
  var buttons = [].slice.call(root.querySelectorAll('[data-filter]'));
  var cards = grid ? [].slice.call(grid.querySelectorAll('[data-category]')) : [];

  var filter = 'all';
  var page = 1;

  function known(name) {
    return buttons.some(function (b) {
      return b.getAttribute('data-filter') === name;
    });
  }

  function matching() {
    if (filter === 'all') return cards;
    return cards.filter(function (card) {
      return card.getAttribute('data-category') === filter;
    });
  }

  function renderPager(pageCount) {
    if (!pager) return;

    /* Controls only exist when the current filter overflows one page. */
    if (pageCount <= 1) {
      pager.hidden = true;
      pager.innerHTML = '';
      return;
    }

    var t = window.i18n.t;
    var html =
      '<button class="pager-btn pager-arrow" type="button" data-goto="prev"' +
      (page === 1 ? ' disabled' : '') +
      ' aria-label="' + t('works.prevPage') + '">' +
      '<svg class="ui-icon" aria-hidden="true" focusable="false">' +
      '<use href="#icon-chevron-start"></use></svg></button>';

    for (var i = 1; i <= pageCount; i++) {
      html +=
        '<button class="pager-btn pager-num" type="button" data-goto="' + i + '"' +
        (i === page ? ' aria-current="page"' : '') +
        ' aria-label="' + t('works.pageN', { n: i }) + '">' + i + '</button>';
    }

    html +=
      '<button class="pager-btn pager-arrow" type="button" data-goto="next"' +
      (page === pageCount ? ' disabled' : '') +
      ' aria-label="' + t('works.nextPage') + '">' +
      '<svg class="ui-icon" aria-hidden="true" focusable="false">' +
      '<use href="#icon-chevron-end"></use></svg></button>';

    pager.innerHTML = html;
    pager.hidden = false;
  }

  function render() {
    var visible = matching();
    var pageCount = Math.max(1, Math.ceil(visible.length / PER_PAGE));
    if (page > pageCount) page = pageCount;

    var from = (page - 1) * PER_PAGE;
    var onPage = visible.slice(from, from + PER_PAGE);

    cards.forEach(function (card) {
      card.hidden = onPage.indexOf(card) === -1;
    });

    buttons.forEach(function (button) {
      var active = button.getAttribute('data-filter') === filter;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('active', active);
    });

    if (empty) empty.hidden = visible.length !== 0;
    renderPager(pageCount);
  }

  function setFilter(name) {
    if (!known(name) || name === filter) return;
    filter = name;
    page = 1; /* a new category always starts at page 1 */
    render();
  }

  root.addEventListener('click', function (e) {
    var filterBtn = e.target.closest('[data-filter]');
    if (filterBtn) {
      setFilter(filterBtn.getAttribute('data-filter'));
      return;
    }

    var pageBtn = e.target.closest('[data-goto]');
    if (!pageBtn || pageBtn.disabled) return;

    var target = pageBtn.getAttribute('data-goto');
    var pageCount = Math.max(1, Math.ceil(matching().length / PER_PAGE));

    if (target === 'prev') page = Math.max(1, page - 1);
    else if (target === 'next') page = Math.min(pageCount, page + 1);
    else page = Math.min(pageCount, Math.max(1, parseInt(target, 10) || 1));

    render();
    grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  function applyHash(scroll) {
    var name = decodeURIComponent((location.hash || '').replace('#', ''));
    if (!name || !known(name)) return;
    setFilter(name);
    if (scroll) root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* Any in-page link to a category - the gallery cards at the top of this page,
     the footer specialties - selects it and comes down to the grid. Handled
     here rather than left to the hash, because clicking a card for the category
     that is already showing changes no hash, fires no hashchange, and would
     otherwise do nothing at all. */
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href^="#"]');
    if (!link) return;
    var name = decodeURIComponent(link.getAttribute('href').slice(1));
    if (!name || !known(name)) return;
    e.preventDefault();
    setFilter(name);
    if (location.hash !== '#' + name) {
      history.replaceState(null, '', '#' + name);
    }
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  window.addEventListener('hashchange', function () {
    applyHash(true);
  });

  /* Pager labels are translated, so rebuild them when the language flips. */
  document.addEventListener('i18n:change', render);

  render();
  applyHash(false);
})();
