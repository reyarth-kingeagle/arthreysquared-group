// Progressive navigation: links remain available if JavaScript is disabled.
const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");

if (menuToggle && mainNav) {
  const mobile = window.matchMedia("(max-width: 1000px)");
  const setMenu = (open, returnFocus = false) => {
    const focusWouldBeHidden = !open && mobile.matches && mainNav.contains(document.activeElement);
    if (mobile.matches && (returnFocus || focusWouldBeHidden)) {
      menuToggle.focus({ preventScroll: true });
    }
    mainNav.classList.toggle("open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  };
  menuToggle.addEventListener("click", () => {
    setMenu(menuToggle.getAttribute("aria-expanded") !== "true");
  });
  mainNav.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || !mobile.matches) return;

    // Leave new-tab, download, and modified clicks to the browser.
    if (
      event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey ||
      event.shiftKey || event.altKey || link.hasAttribute("download") ||
      (link.target && link.target !== "_self")
    ) return;

    setMenu(false);
    const url = new URL(link.href, location.href);
    const isSamePage = url.origin === location.origin &&
      url.pathname === location.pathname && url.search === location.search;
    if (!isSamePage || !url.hash) return;

    let id;
    try {
      id = decodeURIComponent(url.hash.slice(1));
    } catch {
      return;
    }
    const target = document.getElementById(id);
    if (!target) return;

    // Wait for native fragment navigation and the portal's panel selection.
    requestAnimationFrame(() => {
      if (event.defaultPrevented) return;
      if (!target.hasAttribute("tabindex")) {
        target.setAttribute("tabindex", "-1");
        target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
      }
      target.focus({ preventScroll: true });
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && mainNav.classList.contains("open")) setMenu(false, true);
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".nav-wrap")) setMenu(false);
  });
  document.addEventListener("focusin", (event) => {
    if (!event.target.closest(".nav-wrap")) setMenu(false);
  });
  mobile.addEventListener("change", () => {
    const toggleHadFocus = document.activeElement === menuToggle;
    setMenu(false);
    if (!mobile.matches && toggleHadFocus) {
      mainNav.querySelector("a[href]")?.focus({ preventScroll: true });
    }
  });
  document.body.classList.add("nav-ready");
}

// Keep anchor offsets and the mobile menu within the available viewport.
const siteHeader = document.querySelector(".site-header");
if (siteHeader) {
  const updateHeaderHeight = () => {
    document.documentElement.style.setProperty(
      "--header-height", `${Math.ceil(siteHeader.getBoundingClientRect().height)}px`
    );
  };
  updateHeaderHeight();
  if ("ResizeObserver" in window) {
    new ResizeObserver(updateHeaderHeight).observe(siteHeader);
  } else {
    window.addEventListener("resize", updateHeaderHeight);
  }
}

const currentYear = document.getElementById("currentYear");
if (currentYear) currentYear.textContent = new Date().getFullYear();

// Portal panels use native buttons; links and browser history select the same panel.
const panelButtons = [...document.querySelectorAll("[data-panel]")];
if (panelButtons.length) {
  const showPanel = (id) => {
    if (!panelButtons.some((button) => button.dataset.panel === id)) return;
    document.querySelectorAll(".tab-content").forEach((panel) => {
      panel.classList.toggle("active", panel.id === id);
    });
    panelButtons.forEach((button) => {
      const active = button.dataset.panel === id;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  };
  const syncHash = () => {
    const id = location.hash.slice(1);
    showPanel(id === "instructor" ? "instructor" : "courses");
  };
  panelButtons.forEach((button) => {
    button.addEventListener("click", () => {
      showPanel(button.dataset.panel);
      history.pushState(null, "", "#" + button.dataset.panel);
    });
  });
  document.querySelectorAll('a[href="#courses"], a[href="#instructor"]').forEach((link) => {
    link.addEventListener("click", () => showPanel(link.hash.slice(1)));
  });
  window.addEventListener("hashchange", syncHash);
  window.addEventListener("popstate", syncHash);
  syncHash();
  document.body.classList.add("portal-ready");
  if (location.hash === "#instructor" || location.hash === "#courses") {
    requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView());
  }
}

const filterButtons = [...document.querySelectorAll("[data-school]")];
filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((filter) => {
      const active = filter === button;
      filter.classList.toggle("active", active);
      filter.setAttribute("aria-pressed", String(active));
    });
    ["msuiit", "spc"].forEach((school) => {
      const section = document.getElementById("section-" + school);
      if (section) section.hidden = button.dataset.school !== "all" && button.dataset.school !== school;
    });
  });
});
