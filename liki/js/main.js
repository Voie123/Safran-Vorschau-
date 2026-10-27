/* SAFRAN – Persian Cuisine · kleine, abhängigkeitsfreie Interaktionen */
(function () {
  "use strict";

  /* ---------- Mobile Navigation ---------- */
  var toggle = document.querySelector("[data-nav-toggle]");
  var nav = document.querySelector("[data-nav]");

  function setNav(open) {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.querySelector(".visually-hidden").textContent = open ? "Menü schließen" : "Menü öffnen";
    nav.classList.toggle("is-open", open);
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setNav(toggle.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setNav(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        setNav(false);
        toggle.focus();
      }
    });
    window.matchMedia("(min-width: 900px)").addEventListener("change", function () { setNav(false); });
  }

  /* ---------- Speisekarte: Tabs (ohne JS sind alle Kategorien sichtbar) ---------- */
  var tabsRoot = document.querySelector("[data-tabs]");
  if (tabsRoot && tabsRoot.querySelector("[data-tablist]")) {
    var tablist = tabsRoot.querySelector("[data-tablist]");
    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));
    var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute("aria-controls")); });

    function select(index, focus) {
      tabs.forEach(function (tab, i) {
        var active = i === index;
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
        panels[i].hidden = !active;
      });
      if (focus) tabs[index].focus();
      // Aktiven Tab in der (mobil horizontal scrollbaren) Leiste sichtbar halten – ohne die Seite zu scrollen
      var tab = tabs[index];
      if (tab.offsetLeft < tablist.scrollLeft || tab.offsetLeft + tab.offsetWidth > tablist.scrollLeft + tablist.clientWidth) {
        tablist.scrollTo({ left: tab.offsetLeft - 16, behavior: "smooth" });
      }
    }

    tablist.hidden = false;
    tabsRoot.classList.add("has-tabs");
    select(0, false);

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { select(i, false); });
      tab.addEventListener("keydown", function (e) {
        var next = null;
        if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
        if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
        if (e.key === "Home") next = 0;
        if (e.key === "End") next = tabs.length - 1;
        if (next !== null) { e.preventDefault(); select(next, true); }
      });
    });
  }

  /* ---------- Galerie-Lightbox ---------- */
  var lightbox = document.querySelector("[data-lightbox]");
  if (lightbox && typeof lightbox.showModal === "function") {
    var lbImg = lightbox.querySelector("[data-lightbox-img]");
    var lastTrigger = null;

    document.querySelectorAll("[data-gallery] [data-full]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var thumb = btn.querySelector("img");
        lbImg.src = btn.getAttribute("data-full");
        lbImg.alt = thumb ? thumb.alt : "";
        lastTrigger = btn;
        lightbox.showModal();
      });
    });

    lightbox.querySelector("[data-lightbox-close]").addEventListener("click", function () { lightbox.close(); });
    lightbox.addEventListener("click", function (e) { if (e.target === lightbox) lightbox.close(); });
    lightbox.addEventListener("close", function () {
      lbImg.removeAttribute("src");
      if (lastTrigger) lastTrigger.focus();
    });
  } else {
    // Fallback: Bild in neuem Tab öffnen
    document.querySelectorAll("[data-gallery] [data-full]").forEach(function (btn) {
      btn.addEventListener("click", function () { window.open(btn.getAttribute("data-full"), "_blank", "noopener"); });
    });
  }

  /* ---------- Aktiver Navigationspunkt ---------- */
  var links = Array.prototype.slice.call(document.querySelectorAll('.site-nav ul a[href^="#"]'));
  if ("IntersectionObserver" in window && links.length) {
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) { a.removeAttribute("aria-current"); });
        var link = byId[entry.target.id];
        if (link) link.setAttribute("aria-current", "true");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(byId).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) spy.observe(el);
    });
  }

  /* ---------- Sanftes Einblenden ---------- */
  var revealEls = document.querySelectorAll(".section-head, .about-text, .about-media, .card, .menu-tabs, .gallery-grid, .contact-info");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add("is-visible");
        io.unobserve(el);
        // Danach aufräumen, damit Hover-Effekte wieder normal greifen
        setTimeout(function () {
          el.classList.remove("reveal", "is-visible");
          el.style.transitionDelay = "";
        }, 1300);
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el, i) {
      el.classList.add("reveal");
      if (el.classList.contains("card")) el.style.transitionDelay = (i % 4) * 90 + "ms";
      io.observe(el);
    });
  }

  /* ---------- Öffnungszeiten: heutigen Tag markieren, Status "Jetzt geöffnet" ---------- */
  var hours = document.querySelector("[data-hours]");
  var status = document.querySelector("[data-open-status]");
  if (hours) {
    // Uhrzeit in Stuttgart, unabhängig von der Zeitzone des Besuchers
    var parts = {};
    try {
      new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
        .formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
    } catch (e) { parts = null; }

    if (parts && parts.weekday) {
      var day = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(parts.weekday) + 1;
      var now = parseInt(parts.hour, 10) * 60 + parseInt(parts.minute, 10);
      var toMin = function (t) { var x = t.split(":"); return +x[0] * 60 + +x[1]; };
      var rowFor = function (d) { return hours.querySelector('[data-day="' + d + '"]'); };
      var today = rowFor(day);

      if (today) {
        today.classList.add("is-today");
        today.setAttribute("aria-current", "date");
      }

      if (status && today) {
        var range = today.getAttribute("data-time");
        var text, open = false;
        if (range) {
          var r = range.split("-"), from = toMin(r[0]), to = toMin(r[1]);
          if (now >= from && now < to) { open = true; text = "Jetzt geöffnet · bis " + r[1] + " Uhr"; }
          else if (now < from) { text = "Heute ab " + r[0] + " Uhr geöffnet"; }
        }
        if (!text) {
          // nächsten Öffnungstag suchen
          for (var i = 1; i <= 7; i++) {
            var d = ((day - 1 + i) % 7) + 1, row = rowFor(d), t = row && row.getAttribute("data-time");
            if (t) {
              text = "Geschlossen · öffnet " + (i === 1 ? "morgen" : row.querySelector("th").textContent) + " um " + t.split("-")[0] + " Uhr";
              break;
            }
          }
        }
        if (text) {
          status.textContent = text;
          status.classList.toggle("is-closed", !open);
          status.hidden = false;
        }
      }
    }
  }

  /* ---------- Jahr im Footer ---------- */
  var year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());
})();
