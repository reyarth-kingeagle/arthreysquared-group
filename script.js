// Mobile navigation
const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");

if (menuToggle && mainNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = mainNav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  mainNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mainNav.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

// Automatic copyright year
const currentYear = document.getElementById("currentYear");
if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}

// Coursework tabs
function openTab(evt, tabName) {
  document.querySelectorAll(".tab-content").forEach((item) => {
    item.classList.remove("active");
  });

  document.querySelectorAll(".tab-btn").forEach((button) => {
    button.classList.remove("active");
  });

  const target = document.getElementById(tabName);
  if (target) target.classList.add("active");

  if (evt?.currentTarget) {
    evt.currentTarget.classList.add("active");
  }
}

// Institution filters
function filterSchool(evt, school) {
  document.querySelectorAll(".filter-btn").forEach((button) => {
    button.classList.remove("active");
  });

  if (evt?.currentTarget) {
    evt.currentTarget.classList.add("active");
  }

  const msuiit = document.getElementById("section-msuiit");
  const spc = document.getElementById("section-spc");

  if (!msuiit || !spc) return;

  msuiit.style.display = school === "all" || school === "msuiit" ? "block" : "none";
  spc.style.display = school === "all" || school === "spc" ? "block" : "none";
}
