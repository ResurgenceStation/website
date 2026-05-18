// Server status widget.
// Polls a JSON endpoint matching the tgstation13.org/serverinfo.json shape.
// Endpoint and poll interval are read from data-attributes on the .gamebanners
// container, which Eleventy injects from _data/site.yaml. When the endpoint is
// blank or unreachable, banners show "server status unavailable" and the page
// keeps working with no console errors.
(function () {
  "use strict";

  const container = document.querySelector(".gamebanners");
  if (!container) return;

  const endpoint = (container.dataset.statusEndpoint || "").trim();
  const interval = Math.max(1000, parseInt(container.dataset.pollInterval || "4000", 10));
  const playercountEl = document.querySelector(".playercount");
  const statusDot = document.querySelector(".status-dot");

  function setUnavailable() {
    container.querySelectorAll(".gamebanner").forEach((banner) => {
      banner.classList.remove("loading", "lobby", "underway", "end");
      banner.classList.add("error");
      banner._statusData = null;
      const v = banner.querySelector(".version");
      if (v) v.textContent = "server status unavailable";
      const m = banner.querySelector(".map");
      if (m) m.textContent = "(endpoint not configured)";
      const s = banner.querySelector(".status");
      if (s) s.textContent = "";
      const r = banner.querySelector(".revision");
      if (r) r.textContent = "";
    });
    if (playercountEl) playercountEl.textContent = "offline";
    if (statusDot) {
      statusDot.classList.remove("online");
      statusDot.classList.add("offline");
    }
  }

  function setNetworkError() {
    container.querySelectorAll(".gamebanner").forEach((banner) => {
      banner.classList.remove("loading", "lobby", "underway", "end");
      banner.classList.add("error");
      banner._statusData = null;
      const v = banner.querySelector(".version");
      if (v) v.textContent = "connection error";
    });
    if (playercountEl) playercountEl.textContent = "offline";
    if (statusDot) {
      statusDot.classList.remove("online");
      statusDot.classList.add("offline");
    }
  }

  function pad(n, w) {
    const s = String(n);
    return s.length >= w ? s : "0".repeat(w - s.length) + s;
  }

  function secondsToTime(seconds) {
    let out = "";
    if (seconds >= 86400) out += Math.floor(seconds / 86400) + ":";
    if (seconds >= 3600) out += pad(Math.floor(seconds / 3600) % 24, 2) + ":";
    out += pad(Math.floor((seconds / 60) % 60), 2) + ":" + pad(Math.floor(seconds) % 60, 2);
    return out;
  }

  function popcapString(d) {
    const pop = Number(d.popcap);
    const hpop = Number(d.hard_popcap);
    const epop = Number(d.extreme_popcap);
    if (epop) {
      if (hpop && hpop < epop) return hpop + "(" + epop + ")";
      return String(epop);
    }
    if (hpop) return String(hpop);
    if (pop) return String(pop);
    return "∞"; // infinity
  }

  function shuttleTime(mode, t) {
    switch (mode) {
      case "igniting": return "IGN " + secondsToTime(t);
      case "recalled": return "RCL " + secondsToTime(t);
      case "called": return "ETA " + secondsToTime(t);
      case "docked": return "ETD " + secondsToTime(t);
      case "escape": return "ESC " + secondsToTime(t);
      case "stranded": return "ERR --:--";
      case "endgame: game over": return "FIN 00:00";
    }
    return "";
  }

  function applyState(banner, state) {
    banner.classList.remove("loading", "error", "lobby", "underway", "end");
    switch (Number(state)) {
      case 2:
      case 3: banner.classList.add("underway"); break;
      case 4: banner.classList.add("end"); break;
      default: banner.classList.add("lobby");
    }
  }

  // Build the contents of the .status line. extraSec is the number of
  // seconds elapsed since the data was fetched; the local 1Hz ticker
  // passes a growing value so round_duration reads as a live clock
  // instead of stepping every server poll. shuttle_timer is left at
  // the server value because we don't know whether it counts up or
  // down for the current mode — it just resyncs on the next fetch.
  function buildStatusString(d, extraSec) {
    let s = String(d.players);
    const cap = popcapString(d);
    if (cap) s += "/" + cap;
    if (Number(d.round_duration)) s += " " + secondsToTime(Number(d.round_duration) + extraSec);
    if (d.shuttle_mode && Number(d.shuttle_timer)) s += " " + shuttleTime(d.shuttle_mode, Number(d.shuttle_timer));
    return s;
  }

  function renderBanner(server) {
    const banner = document.getElementById(server.identifier);
    if (!banner) return 0;
    if (!server.data || server.data.ERROR || !server.data.players || !server.data.version) {
      banner.classList.remove("loading", "lobby", "underway", "end");
      banner.classList.add("error");
      banner._statusData = null;
      const v = banner.querySelector(".version");
      if (v) v.textContent = (server.data && server.data.errortext) || "connection error";
      return 0;
    }
    const d = server.data;
    banner._statusData = d;
    banner._fetchedAt = Date.now();
    applyState(banner, d.gamestate);
    const v = banner.querySelector(".version");
    if (v) {
      let txt = "Playing " + d.version;
      if (d.custom_event) txt = "Playing Event " + d.custom_event;
      else if (d.mode) txt += ' mode "' + d.mode + '"';
      v.textContent = txt;
    }
    const m = banner.querySelector(".map");
    if (m) m.textContent = "Map: " + (d.map_name || "?");
    const status = banner.querySelector(".status");
    if (status) status.textContent = buildStatusString(d, 0);
    const r = banner.querySelector(".revision");
    if (r && d.revision) r.textContent = "rev " + String(d.revision).substr(0, 7);
    return Number(d.players) || 0;
  }

  async function poll() {
    if (!endpoint) {
      setUnavailable();
      return;
    }
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      let total = 0;
      (data.servers || []).forEach((s) => { total += renderBanner(s); });
      if (playercountEl) playercountEl.textContent = total + " online";
      if (statusDot) {
        statusDot.classList.remove("offline");
        statusDot.classList.add("online");
      }
    } catch (err) {
      setNetworkError();
    }
  }

  // Local 1Hz ticker. Recomputes only the .status line so the round
  // timer increments smoothly between server polls. No-op on banners
  // whose last fetch errored (_statusData cleared) or hasn't returned
  // yet, so the page never shows phantom data.
  setInterval(() => {
    container.querySelectorAll(".gamebanner").forEach((banner) => {
      const d = banner._statusData;
      if (!d) return;
      const status = banner.querySelector(".status");
      if (!status) return;
      const extraSec = Math.floor((Date.now() - banner._fetchedAt) / 1000);
      status.textContent = buildStatusString(d, extraSec);
    });
  }, 1000);

  poll();
  setInterval(poll, interval);
})();
