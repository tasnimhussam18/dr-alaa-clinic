/* i18n runtime.
 *
 * Loaded in <head> without defer so document.documentElement gets its lang/dir
 * set before the body paints - otherwise a returning English visitor would see
 * a frame of RTL layout before the switch landed.
 *
 * Markup contract:
 *   data-i18n="key"                        -> element.textContent
 *   data-i18n-html="key"                   -> element.innerHTML (only where a
 *                                             string carries inline markup)
 *   data-i18n-attr="alt:key;title:key2"    -> one or more attributes
 *
 * Public API on window.i18n:
 *   .lang            current language code
 *   .t(key, vars)    look a string up, with optional {placeholder} substitution
 *   .apply(root)     (re)translate a subtree - call after injecting markup
 *   .setLang(code)   switch language, persist, re-render, fire 'i18n:change'
 *   .toggle()        flip between the two languages
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'dah-lang';
  var DEFAULT_LANG = 'ar';
  var SUPPORTED = ['ar', 'en'];
  var RTL = ['ar'];

  var strings = window.I18N_STRINGS || {};
  var warned = {};
  var current = readStored();

  function readStored() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (SUPPORTED.indexOf(saved) !== -1) return saved;
    } catch (e) {
      /* localStorage can throw in private mode or under file:// - fall through */
    }
    return DEFAULT_LANG;
  }

  function persist(lang) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      /* non-fatal: the choice just will not survive a reload */
    }
  }

  function warnMissing(key) {
    if (warned[current + '|' + key]) return;
    warned[current + '|' + key] = true;
    if (window.console && console.warn) {
      console.warn('[i18n] missing "' + current + '" string for key: ' + key);
    }
  }

  function t(key, vars) {
    var table = strings[current] || {};
    var value = table[key];
    if (value === undefined) {
      warnMissing(key);
      return key;
    }
    if (vars) {
      value = value.replace(/\{(\w+)\}/g, function (whole, name) {
        return Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : whole;
      });
    }
    return value;
  }

  /* querySelectorAll that also matches the root node itself, so apply() works
     on a freshly-created element that has not been inserted yet. */
  function matches(root, selector) {
    var found = [].slice.call(root.querySelectorAll(selector));
    if (root.matches && root.matches(selector)) found.unshift(root);
    return found;
  }

  function apply(root) {
    root = root || document;

    matches(root, '[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var value = t(key);
      if (value !== key) el.textContent = value;
    });

    matches(root, '[data-i18n-html]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-html');
      var value = t(key);
      if (value !== key) el.innerHTML = value;
    });

    matches(root, '[data-i18n-attr]').forEach(function (el) {
      el.getAttribute('data-i18n-attr')
        .split(';')
        .forEach(function (pair) {
          if (!pair.trim()) return;
          var split = pair.indexOf(':');
          if (split === -1) return;
          var attr = pair.slice(0, split).trim();
          var key = pair.slice(split + 1).trim();
          var value = t(key);
          if (value !== key) el.setAttribute(attr, value);
        });
    });

    return root;
  }

  function setDocumentLang() {
    var html = document.documentElement;
    html.setAttribute('lang', current);
    html.setAttribute('dir', RTL.indexOf(current) !== -1 ? 'rtl' : 'ltr');
  }

  function setLang(lang) {
    if (SUPPORTED.indexOf(lang) === -1 || lang === current) return;
    current = lang;
    persist(lang);
    setDocumentLang();
    apply(document);
    document.dispatchEvent(
      new CustomEvent('i18n:change', { detail: { lang: current } })
    );
  }

  function toggle() {
    setLang(current === 'ar' ? 'en' : 'ar');
  }

  /* Run now, at parse time in <head>: the attributes must be correct before
     first paint. String replacement waits for a DOM to walk. */
  setDocumentLang();

  /* This is the only script that runs before paint, so it also flags that JS is
     available. CSS gates the pre-reveal hidden state on html.has-js, so a failed
     or blocked script leaves every section visible instead of blank. */
  document.documentElement.classList.add('has-js');

  window.i18n = {
    get lang() {
      return current;
    },
    get isRTL() {
      return RTL.indexOf(current) !== -1;
    },
    t: t,
    apply: apply,
    setLang: setLang,
    toggle: toggle,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      apply(document);
    });
  } else {
    apply(document);
  }
})();
