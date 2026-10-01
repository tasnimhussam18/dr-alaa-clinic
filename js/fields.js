/* Form controls that open a panel: the dropdown, the date picker and the time
 * picker.
 *
 * All three are built on one shell, so they are the same control wearing
 * different contents - identical trigger, identical panel, identical fold-open.
 * A native <select>, <input type="date"> or <input type="time"> opens something
 * the operating system draws, which CSS cannot reach; each is therefore kept in
 * the document for its value and the form wiring, and shadowed by markup we
 * own.
 *
 * Nothing here hard-codes language: month and weekday names, the first day of
 * the week and the clock format all come from Intl, keyed off the current
 * language, and everything re-renders when that changes.
 *
 * Keyboard: Enter / Space / Arrow opens, Escape closes and returns focus.
 */
(function () {
  'use strict';

  var seq = 0;

  function lang() {
    return window.i18n ? window.i18n.lang : document.documentElement.lang || 'en';
  }

  /* Latin digits in both languages - the rest of the site writes numbers that
     way, and a date that suddenly switched numeral systems would jar. */
  function locale() {
    return lang() === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB';
  }

  /* Arabic weeks start on Saturday, English ones on Sunday. */
  function weekStart() {
    return lang() === 'ar' ? 6 : 0;
  }

  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }

  /* ---------------------------------------------------------------
     The shell: trigger + panel, and the behaviour they share.
     --------------------------------------------------------------- */

  function shell(native, iconHref, options) {
    var id = 'field-' + ++seq;
    var wrap = document.createElement('div');
    wrap.className = 'select';

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'select-trigger';
    trigger.id = id + '-trigger';
    trigger.setAttribute('aria-haspopup', options.role || 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', id + '-menu');

    var value = document.createElement('span');
    value.className = 'select-value';

    var caret = document.createElement('span');
    caret.className = 'select-caret' + (options.staticIcon ? ' is-static' : '');
    caret.setAttribute('aria-hidden', 'true');
    caret.innerHTML =
      '<svg class="ui-icon" focusable="false"><use href="' + iconHref + '"></use></svg>';

    trigger.appendChild(value);
    trigger.appendChild(caret);

    var menu = document.createElement('div');
    menu.className = 'select-menu ' + (options.menuClass || '');
    menu.id = id + '-menu';
    if (options.role !== 'dialog') menu.setAttribute('role', 'listbox');
    menu.hidden = true;

    var label = native.id ? document.querySelector('label[for="' + native.id + '"]') : null;
    if (label) {
      label.setAttribute('for', trigger.id);
      if (!label.id) label.id = id + '-label';
      trigger.setAttribute('aria-labelledby', label.id + ' ' + id + '-trigger');
    }

    native.parentNode.insertBefore(wrap, native);
    wrap.appendChild(native);
    wrap.appendChild(trigger);
    wrap.appendChild(menu);

    native.classList.add('select-native');
    native.setAttribute('tabindex', '-1');
    native.setAttribute('aria-hidden', 'true');

    var open = false;

    function setOpen(next) {
      if (open === next) return;
      open = next;
      trigger.setAttribute('aria-expanded', String(open));
      if (open) {
        if (options.onOpen) options.onOpen();
        menu.hidden = false;
        /* Force layout while it is still folded, so the transition has a start
           to run from. A reflow, not a frame callback: this has to work even
           when frames are being throttled. */
        void menu.offsetHeight;
        wrap.classList.add('is-open');
      } else {
        wrap.classList.remove('is-open');
        var done = function (e) {
          if (e && e.target !== menu) return;
          if (!open) menu.hidden = true;
          menu.removeEventListener('transitionend', done);
        };
        menu.addEventListener('transitionend', done);
        setTimeout(done, 400);
      }
    }

    trigger.addEventListener('click', function () {
      setOpen(!open);
    });

    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setOpen(true);
        if (options.onArrow) options.onArrow(e.key === 'ArrowDown' ? 1 : -1);
        return;
      }
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        setOpen(!open);
        return;
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    });

    document.addEventListener('click', function (e) {
      if (!open || wrap.contains(e.target)) return;
      setOpen(false);
    });

    menu.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      setOpen(false);
      trigger.focus();
    });

    trigger.addEventListener('blur', function () {
      setTimeout(function () {
        if (!wrap.contains(document.activeElement)) setOpen(false);
      }, 0);
    });

    return {
      wrap: wrap,
      trigger: trigger,
      menu: menu,
      value: value,
      setOpen: function (v) {
        setOpen(v);
      },
    };
  }

  /* Anything listening for a real change still hears one. */
  function commit(native) {
    native.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /* ---------------------------------------------------------------
     Dropdown
     --------------------------------------------------------------- */

  function setupSelect(native) {
    if (!native.options.length || native.multiple) return;

    var ui = shell(native, '#icon-chevron-end', {});
    var options = [];

    function sync() {
      ui.menu.innerHTML = '';
      options = [];
      [].forEach.call(native.options, function (opt, i) {
        var item = document.createElement('div');
        item.className = 'select-option';
        item.setAttribute('role', 'option');
        item.setAttribute('data-value', opt.value);
        item.textContent = opt.textContent;
        item.setAttribute('aria-selected', String(i === native.selectedIndex));
        if (i === native.selectedIndex) item.classList.add('is-selected');
        ui.menu.appendChild(item);
        options.push(item);
      });
      ui.value.textContent = native.options[native.selectedIndex]
        ? native.options[native.selectedIndex].textContent
        : '';
    }

    function choose(index) {
      if (index < 0 || index >= native.options.length) return;
      native.selectedIndex = index;
      commit(native);
      sync();
    }

    ui.menu.addEventListener('click', function (e) {
      var item = e.target.closest('.select-option');
      if (!item) return;
      choose(options.indexOf(item));
      ui.setOpen(false);
      ui.trigger.focus();
    });

    /* The value can also change from outside - a form reset, for one - so the
       trigger follows the native field rather than only its own clicks. */
    native.addEventListener('change', sync);
    document.addEventListener('i18n:change', sync);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', sync);
    }
    sync();
  }

  /* ---------------------------------------------------------------
     Date - a month calendar in the same panel
     --------------------------------------------------------------- */

  function setupDate(input) {
    var ui = shell(input, '#icon-calendar', {
      role: 'dialog',
      menuClass: 'select-menu-cal',
      staticIcon: true,
      onOpen: function () {
        view = selected() || startOfToday();
        draw();
      },
    });

    var view = startOfToday();

    function startOfToday() {
      var d = new Date();
      d.setHours(0, 0, 0, 0);
      return d;
    }

    function selected() {
      if (!input.value) return null;
      var parts = input.value.split('-');
      if (parts.length !== 3) return null;
      return new Date(+parts[0], +parts[1] - 1, +parts[2]);
    }

    function iso(d) {
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }

    function same(a, b) {
      return (
        a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
      );
    }

    function label() {
      var chosen = selected();
      ui.value.textContent = chosen
        ? new Intl.DateTimeFormat(locale(), {
            day: 'numeric', month: 'long', year: 'numeric',
          }).format(chosen)
        : input.getAttribute('placeholder') || '';
      ui.value.classList.toggle('is-empty', !chosen);
    }

    function draw() {
      var monthName = new Intl.DateTimeFormat(locale(), {
        month: 'long', year: 'numeric',
      }).format(view);

      var head =
        '<div class="cal-head">' +
        '<button type="button" class="cal-nav" data-step="-1" aria-label="' +
        (lang() === 'ar' ? 'الشهر السابق' : 'Previous month') + '">' +
        '<svg class="ui-icon" aria-hidden="true" focusable="false">' +
        '<use href="#icon-chevron-start"></use></svg></button>' +
        '<strong>' + monthName + '</strong>' +
        '<button type="button" class="cal-nav" data-step="1" aria-label="' +
        (lang() === 'ar' ? 'الشهر التالي' : 'Next month') + '">' +
        '<svg class="ui-icon" aria-hidden="true" focusable="false">' +
        '<use href="#icon-chevron-end"></use></svg></button>' +
        '</div>';

      var names = new Intl.DateTimeFormat(locale(), { weekday: 'narrow' });
      var week = '<div class="cal-week">';
      for (var w = 0; w < 7; w++) {
        /* 1970-01-04 was a Sunday, so this walks the week from its real start. */
        week += '<span>' + names.format(new Date(1970, 0, 4 + ((weekStart() + w) % 7))) + '</span>';
      }
      week += '</div>';

      var first = new Date(view.getFullYear(), view.getMonth(), 1);
      var lead = (first.getDay() - weekStart() + 7) % 7;
      var days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      var today = startOfToday();
      var chosen = selected();

      var grid = '<div class="cal-grid">';
      for (var b = 0; b < lead; b++) grid += '<span class="cal-pad"></span>';
      for (var day = 1; day <= days; day++) {
        var date = new Date(view.getFullYear(), view.getMonth(), day);
        var past = date < today;
        grid +=
          '<button type="button" class="cal-day' +
          (same(date, chosen) ? ' is-selected' : '') +
          (same(date, today) ? ' is-today' : '') +
          '" data-date="' + iso(date) + '"' + (past ? ' disabled' : '') +
          ' aria-pressed="' + String(same(date, chosen)) + '">' + day + '</button>';
      }
      grid += '</div>';

      ui.menu.innerHTML = head + week + grid;
    }

    ui.menu.addEventListener('click', function (e) {
      var step = e.target.closest('.cal-nav');
      if (step) {
        view = new Date(view.getFullYear(), view.getMonth() + Number(step.getAttribute('data-step')), 1);
        draw();
        return;
      }
      var pick = e.target.closest('.cal-day');
      if (!pick || pick.disabled) return;
      input.value = pick.getAttribute('data-date');
      commit(input);
      label();
      ui.setOpen(false);
      ui.trigger.focus();
    });

    /* Also follows the native field, so a form reset clears the trigger. */
    input.addEventListener('change', label);
    document.addEventListener('i18n:change', function () {
      label();
      draw();
    });
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', label);
    }
    label();
  }

  /* ---------------------------------------------------------------
     Time - the clinic's hours as a list, in the same panel
     --------------------------------------------------------------- */

  function setupTime(input) {
    var FROM = 9; /* the list runs across the hours the clinic actually opens */
    var TO = 20;
    var STEP = 30;

    var ui = shell(input, '#icon-clock', {
      menuClass: 'select-menu-times',
      staticIcon: true,
      onOpen: function () {
        draw();
        var current = ui.menu.querySelector('.is-selected');
        if (current) current.scrollIntoView({ block: 'center' });
      },
    });

    function pretty(value) {
      var parts = value.split(':');
      var d = new Date(2000, 0, 1, +parts[0], +parts[1]);
      return new Intl.DateTimeFormat(locale(), { hour: 'numeric', minute: '2-digit' }).format(d);
    }

    function label() {
      ui.value.textContent = input.value
        ? pretty(input.value)
        : input.getAttribute('placeholder') || '';
      ui.value.classList.toggle('is-empty', !input.value);
    }

    function draw() {
      var html = '';
      for (var m = FROM * 60; m <= TO * 60; m += STEP) {
        var value = pad(Math.floor(m / 60)) + ':' + pad(m % 60);
        html +=
          '<div class="select-option' + (value === input.value ? ' is-selected' : '') +
          '" role="option" data-value="' + value + '" aria-selected="' +
          String(value === input.value) + '">' + pretty(value) + '</div>';
      }
      ui.menu.innerHTML = html;
    }

    ui.menu.addEventListener('click', function (e) {
      var item = e.target.closest('.select-option');
      if (!item) return;
      input.value = item.getAttribute('data-value');
      commit(input);
      label();
      ui.setOpen(false);
      ui.trigger.focus();
    });

    /* Also follows the native field, so a form reset clears the trigger. */
    input.addEventListener('change', label);
    document.addEventListener('i18n:change', function () {
      label();
      draw();
    });
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', label);
    }
    label();
  }

  [].forEach.call(document.querySelectorAll('.field select'), setupSelect);
  [].forEach.call(document.querySelectorAll('.field input[type=date]'), setupDate);
  [].forEach.call(document.querySelectorAll('.field input[type=time]'), setupTime);
})();
