// Parallax background driver.
// Adapted from ResurgenceStation/webmap (which hooks Leaflet pan events) to
// run off mouse-move + scroll on a static page. Reads target offsets and
// commits them on each animation frame so paints stay aligned with the GPU.
(function () {
  "use strict";

  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const LAYERS = [
    // [scrollSpeed, mouseSpeed] — back-to-front. Mirrors the parallax depth
    // mapping in webmap/main.js so layer indices stay consistent.
    { scroll: 0.05, mouse: 6 },   // 0 layer1 (deepest stars)
    { scroll: 0.00, mouse: 0 },   // 1 galaxy3 (static)
    { scroll: 0.00, mouse: 0 },   // 2 galaxy (static)
    { scroll: 0.12, mouse: 14 },  // 3 layer2 (mid stars)
    { scroll: 0.20, mouse: 22 },  // 4 layer3 (close stars)
    { scroll: 0.08, mouse: 10 },  // 5 space_gas (nebula)
    { scroll: 0.04, mouse: 4 },   // 6 planet (slight drift)
    { scroll: 0.30, mouse: 30 },  // 7 asteroids (in front)
  ];

  const nodes = Array.from(document.querySelectorAll(".parallax-layer"));
  if (nodes.length === 0) return;

  // Target values (where we want to be) and current values (smoothed toward target)
  let mouseTargetX = 0;
  let mouseTargetY = 0;
  let mouseX = 0;
  let mouseY = 0;
  let scrollY = window.scrollY || 0;

  const MOUSE_LERP = 0.08; // 0..1; higher = snappier, lower = laggier

  function onPointer(event) {
    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;
    // -1..1 across the viewport
    mouseTargetX = (event.clientX / w) * 2 - 1;
    mouseTargetY = (event.clientY / h) * 2 - 1;
  }

  function onScroll() {
    scrollY = window.scrollY || window.pageYOffset || 0;
  }

  function tick() {
    if (!reduced) {
      mouseX += (mouseTargetX - mouseX) * MOUSE_LERP;
      mouseY += (mouseTargetY - mouseY) * MOUSE_LERP;
    }
    for (let i = 0; i < nodes.length && i < LAYERS.length; i++) {
      const layer = LAYERS[i];
      const dx = (reduced ? 0 : mouseX * layer.mouse);
      const dy = (reduced ? 0 : mouseY * layer.mouse) - scrollY * layer.scroll;
      // Use transform instead of background-position so we get GPU compositing.
      nodes[i].style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
    }
    requestAnimationFrame(tick);
  }

  if (!reduced) {
    window.addEventListener("pointermove", onPointer, { passive: true });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  requestAnimationFrame(tick);
})();
