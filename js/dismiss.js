// Alert dismissal with localStorage persistence.
// Adapted from tgstation/website-v2 dismiss.js, simplified for the alert-only case.
(function () {
  "use strict";

  const storage = window.localStorage;

  // Hide alerts the user has dismissed in past sessions.
  document.querySelectorAll(".alert[id]").forEach((alert) => {
    if (storage.getItem(alert.id) === "hidden") {
      alert.classList.add("hidden");
    }
  });

  // Wire dismiss buttons.
  document.querySelectorAll(".alert .dismiss").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const parent = e.target.closest(".alert");
      if (!parent) return;
      parent.classList.add("hidden");
      if (parent.id) storage.setItem(parent.id, "hidden");
    });
  });
})();
