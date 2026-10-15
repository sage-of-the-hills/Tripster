"""Regenerate app/data/countries.json (country list for the trip builder) from Wikidata.
Usage: python3 tools/build-countries.py   (needs internet; no packages required)"""
import json, re, urllib.parse, urllib.request, pathlib

QUERY = """SELECT ?c ?cLabel ?iso ?coord ?wv WHERE {
  ?c wdt:P31 wd:Q3624078; wdt:P297 ?iso. FILTER NOT EXISTS { ?c wdt:P576 [] }
  OPTIONAL { ?c wdt:P625 ?coord }
  OPTIONAL { ?wv schema:about ?c; schema:isPartOf <https://en.wikivoyage.org/> }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}"""
url = "https://query.wikidata.org/sparql?" + urllib.parse.urlencode({"query": QUERY, "format": "json"})
req = urllib.request.Request(url, headers={"User-Agent": "Tripster/1.0 (github.com/sage-of-the-hills/tripster)"})
rows = json.load(urllib.request.urlopen(req, timeout=120))["results"]["bindings"]
out = {}
for b in rows:
    q = b["c"]["value"].rsplit("/", 1)[1]
    if q in out: continue
    m = re.match(r"Point\(([-\d.]+) ([-\d.]+)\)", b.get("coord", {}).get("value", ""))
    wv = urllib.parse.unquote(b["wv"]["value"].rsplit("/wiki/", 1)[1]).replace("_", " ") if "wv" in b else b["cLabel"]["value"]
    out[q] = {"q": q, "name": b["cLabel"]["value"], "iso": b["iso"]["value"], "wv": wv,
              "lat": round(float(m.group(2)), 3) if m else None, "lon": round(float(m.group(1)), 3) if m else None}
dest = pathlib.Path(__file__).resolve().parent.parent / "app" / "data" / "countries.json"
dest.write_text(json.dumps(sorted(out.values(), key=lambda x: x["name"]), ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print("wrote", len(out), "countries to", dest)
