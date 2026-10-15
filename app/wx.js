/* Tripster weather helpers. Shared by the app page and the service worker.
   Forecasts come from Open-Meteo (free, no key). Units: °C, m/s, mm, cm of snow. */
(function (g) {
  "use strict";
  const HOURLY = "temperature_2m,apparent_temperature,precipitation,snowfall,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m,wind_speed_120m,visibility,is_day,cloud_cover";
  const DAILY = "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,sunrise,sunset";

  function url(pts) {
    return "https://api.open-meteo.com/v1/forecast?latitude=" + pts.map(p => (+p.lat).toFixed(4)).join(",") +
      "&longitude=" + pts.map(p => (+p.lon).toFixed(4)).join(",") +
      "&hourly=" + HOURLY + "&daily=" + DAILY + "&timezone=auto&forecast_days=16&wind_speed_unit=ms";
  }
  const r1 = a => (a || []).map(v => v == null ? null : Math.round(v * 10) / 10);
  function compact(x) {
    const h = x.hourly, d = x.daily;
    return {
      tz: x.timezone,
      h: { t0: h.time[0], n: h.time.length, t: r1(h.temperature_2m), ta: r1(h.apparent_temperature), p: r1(h.precipitation), sn: r1(h.snowfall),
        c: h.weather_code, ws: r1(h.wind_speed_10m), wg: r1(h.wind_gusts_10m), wd: h.wind_direction_10m, w120: r1(h.wind_speed_120m),
        vis: (h.visibility || []).map(v => v == null ? null : Math.round(v)), day: h.is_day, cc: h.cloud_cover || [] },
      d: { time: d.time, c: d.weather_code, tmax: r1(d.temperature_2m_max), tmin: r1(d.temperature_2m_min), p: r1(d.precipitation_sum),
        sn: r1(d.snowfall_sum), ws: r1(d.wind_speed_10m_max), wg: r1(d.wind_gusts_10m_max), wd: d.wind_direction_10m_dominant,
        rise: (d.sunrise || []).map(s => s ? s.slice(11, 16) : ""), set: (d.sunset || []).map(s => s ? s.slice(11, 16) : "") }
    };
  }
  // pts: [{key, lat, lon}] -> {fetchedAt, places:{key: compact}}
  async function fetchWx(pts) {
    const out = {};
    for (let i = 0; i < pts.length; i += 40) {
      const chunk = pts.slice(i, i + 40);
      const r = await fetch(url(chunk));
      let j = null; try { j = await r.json(); } catch (e) {}
      if (!r.ok || !j || j.error) { const err = new Error((j && j.reason) || ("Weather service answered " + r.status)); err.limit = r.status === 429 || /limit/i.test((j && j.reason) || ""); throw err; }
      if (!Array.isArray(j)) j = [j];
      j.forEach((x, k) => { if (x && x.hourly) out[chunk[k].key] = compact(x); });
    }
    return { fetchedAt: new Date().toISOString(), places: out };
  }

  const utc = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10), +(s.slice(11, 13) || 0));
  function hourIndex(px, date, hhmm) {
    const h = hhmm && /^\d{1,2}:\d{2}/.test(hhmm) ? +hhmm.split(":")[0] + (+hhmm.split(":")[1] >= 30 ? 1 : 0) : 12;
    const i = Math.round((utc(date + "T00") - utc(px.h.t0)) / 36e5) + Math.min(h, 23);
    return i >= 0 && i < px.h.n ? i : -1;
  }
  function day(px, date) {
    const i = px.d.time.indexOf(date); if (i < 0) return null; const d = px.d;
    return { i, c: d.c[i], tmax: d.tmax[i], tmin: d.tmin[i], p: d.p[i], sn: d.sn[i], ws: d.ws[i], wg: d.wg[i], wd: d.wd[i], rise: d.rise[i], set: d.set[i] };
  }

  // Places on the itinerary for each date: [{key, date}]
  function itinerary(trip) {
    const out = [], seen = new Set(), P = trip.places || {};
    const fallback = Object.keys(P).find(k => P[k] && !P[k].waypoint);
    (trip.days || []).forEach(d => {
      const keys = (d.steps || []).map(s => s.place);
      const st = (trip.stays || []).find(s => s.id === d.stay); if (st && st.place) keys.push(st.place);
      let n = 0;
      keys.forEach(k => { const p = P[k]; if (!p || p.waypoint) return; n++; const id = k + "|" + d.date; if (!seen.has(id)) { seen.add(id); out.push({ key: k, date: d.date }); } });
      if (!n && fallback) out.push({ key: fallback, date: d.date }); // a day with no places yet: use the trip's first place
    });
    return out;
  }

  const LABEL = { gust: "Strong gusts", wind: "Strong wind", snow: "Snow", rain: "Heavy rain", cold: "Severe cold", ice: "Freezing rain, icy roads", storm: "Thunderstorms" };
  // Extreme-weather alerts on trip days, grouped by date and kind.
  function alerts(trip, wx) {
    const groups = {};
    itinerary(trip).forEach(({ key, date }) => {
      const px = wx && wx.places[key]; if (!px) return; const d = day(px, date); if (!d) return;
      const name = trip.places[key].name;
      const add = (kind, level, val) => {
        const id = date + "|" + kind; const g0 = groups[id] || (groups[id] = { id, date, kind, level, title: LABEL[kind], places: [], max: null });
        if (level === "severe") g0.level = "severe";
        g0.places.push(name); if (val != null && (g0.max == null || val > g0.max)) g0.max = val;
      };
      if (d.wg >= 25) add("gust", "severe", d.wg); else if (d.wg >= 20) add("gust", "warn", d.wg);
      if (d.ws >= 17) add("wind", "severe", d.ws); else if (d.ws >= 13) add("wind", "warn", d.ws);
      if (d.sn >= 10) add("snow", "severe", d.sn); else if (d.sn >= 4) add("snow", "warn", d.sn);
      if (d.p >= 25 && !(d.sn >= 4)) add("rain", d.p >= 50 ? "severe" : "warn", d.p);
      if (d.tmin <= -15) add("cold", d.tmin <= -25 ? "severe" : "warn", -d.tmin);
      if ([56, 57, 66, 67].includes(d.c)) add("ice", "severe", null);
      if (d.c >= 95) add("storm", "warn", null);
    });
    const unit = { gust: " m/s", wind: " m/s", snow: " cm", rain: " mm", cold: "" };
    const list = Object.values(groups).map(a => {
      a.detail = a.max == null ? "" : a.kind === "cold" ? "down to −" + a.max + "°C" : "up to " + a.max + unit[a.kind];
      return a;
    });
    // One wind line per day: fold "strong wind" into "strong gusts" when both fire.
    list.filter(a => a.kind === "wind").forEach(w => {
      const gst = list.find(a => a.kind === "gust" && a.date === w.date); if (!gst) return;
      gst.detail += ", wind " + w.max + " m/s"; if (w.level === "severe") gst.level = "severe";
      w.places.forEach(n => { if (!gst.places.includes(n)) gst.places.push(n); }); w.drop = true;
    });
    return list.filter(a => !a.drop).sort((a, b) => a.date.localeCompare(b.date) || (a.level === "severe" ? -1 : 1));
  }

  // Compact per place-and-date snapshot used to spot changes between refreshes.
  function snapshot(trip, wx) {
    const s = {};
    itinerary(trip).forEach(({ key, date }) => { const px = wx && wx.places[key]; if (!px) return; const d = day(px, date); if (d) s[key + "|" + date] = { g: d.wg, w: d.ws, sn: d.sn, p: d.p, lo: d.tmin, hi: d.tmax }; });
    return s;
  }
  function changes(trip, prev, next) {
    const out = []; if (!prev) return out;
    Object.keys(next).forEach(k => {
      const a = prev[k], b = next[k]; if (!a) return;
      const [key, date] = k.split("|"); const name = (trip.places[key] || {}).name || key; const bits = [];
      if (Math.abs(b.g - a.g) >= 5) bits.push(`gusts ${b.g} m/s (was ${a.g})`);
      if (Math.abs(b.sn - a.sn) >= 3) bits.push(`snow ${b.sn} cm (was ${a.sn})`);
      if (Math.abs(b.p - a.p) >= 10) bits.push(`rain ${b.p} mm (was ${a.p})`);
      if (Math.abs(b.lo - a.lo) >= 5 || Math.abs(b.hi - a.hi) >= 5) bits.push(`${b.lo}° to ${b.hi}° (was ${a.lo}° to ${a.hi}°)`);
      if (bits.length) out.push({ id: "chg|" + k + "|" + bits.join(","), key, date, name, text: bits.join(", ") });
    });
    return out;
  }

  // Drone flying conditions for one hour. limit = the drone's wind resistance in m/s.
  function drone(px, i, limit) {
    const h = px.h, w = h.w120[i], gst = h.wg[i], p = h.p[i], sn = h.sn[i], vis = h.vis[i], t = h.t[i], light = h.day[i];
    let lvl = 0; const why = []; const up = v => { if (v > lvl) lvl = v; };
    if (sn > 0) { up(2); why.push("snow"); } else if (p > 0.2) { up(2); why.push("rain"); }
    if (gst >= limit) { up(2); why.push("gusts " + gst + " m/s"); } else if (gst >= limit * 0.8) { up(1); why.push("gusty " + gst + " m/s"); }
    if (w >= limit) { up(2); why.push("wind aloft " + w + " m/s"); } else if (w >= limit * 0.7) { up(1); why.push("breezy aloft " + w + " m/s"); }
    if (vis != null && vis < 1000) { up(2); why.push("poor visibility"); } else if (vis != null && vis < 3000) { up(1); why.push("hazy"); }
    if (t <= -10) { up(1); why.push("very cold for batteries"); } else if (t < 0) why.push("cold: keep batteries warm");
    if (!light) { up(1); why.push("dark"); }
    return { lvl, why };
  }

  const WMO = { 0: "Clear", 1: "Mostly clear", 2: "Partly cloudy", 3: "Cloudy", 45: "Fog", 48: "Freezing fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
    56: "Freezing drizzle", 57: "Freezing drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain", 71: "Light snow", 73: "Snow",
    75: "Heavy snow", 77: "Snow grains", 80: "Showers", 81: "Showers", 82: "Heavy showers", 85: "Snow showers", 86: "Heavy snow showers", 95: "Thunderstorm", 96: "Thunder and hail", 99: "Thunder and hail" };
  function kind(c) { if (c == null) return "cloud"; if (c <= 1) return "sun"; if (c === 2) return "part"; if (c === 3) return "cloud"; if (c === 45 || c === 48) return "fog";
    if ([71, 73, 75, 77, 85, 86].includes(c)) return "snow"; if (c >= 95) return "storm"; return "rain"; }

  g.TSWX = { fetchWx, hourIndex, day, itinerary, alerts, snapshot, changes, drone, WMO, kind };
})(typeof self !== "undefined" ? self : this);
