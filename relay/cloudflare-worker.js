/*
  Tripster data relay (Cloudflare Worker, free plan).

  Some official sources don't let apps on other websites read their data directly.
  This tiny relay fetches ONLY these two sources and passes them on to Tripster:
    ?src=warnings&country=iceland   official weather warnings (MeteoAlarm; ~38 European countries)
    ?src=roads-is                   Icelandic road conditions (Vegagerdin open data)
  It stores nothing, needs no keys, and refuses every other address.
  Setup: docs/data-relay.md
*/
const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET, OPTIONS" };

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    const url = new URL(request.url);
    const src = url.searchParams.get("src");
    let target;
    if (src === "warnings") {
      const country = (url.searchParams.get("country") || "").toLowerCase();
      if (!/^[a-z-]{4,30}$/.test(country)) return reply(400, { error: "bad country" });
      target = "https://feeds.meteoalarm.org/api/v1/warnings/feeds-" + country;
    } else if (src === "roads-is") {
      target = "https://gagnaveita.vegagerdin.is/api/faerd2017_1";
    } else {
      return reply(400, { error: "unknown source" });
    }
    try {
      const r = await fetch(target, { headers: { accept: "application/json" }, cf: { cacheTtl: 300, cacheEverything: true } });
      return new Response(r.body, { status: r.status, headers: { ...CORS, "content-type": r.headers.get("content-type") || "application/json", "cache-control": "public, max-age=300" } });
    } catch (e) {
      return reply(502, { error: "source unavailable" });
    }
  }
};
function reply(status, obj) { return new Response(JSON.stringify(obj), { status, headers: { ...CORS, "content-type": "application/json" } }); }
