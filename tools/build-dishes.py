"""Regenerate app/data/dishes.json: the best-known dishes, sweets and drinks of every country, from Wikidata.
Tripster shows these as "Must-try" in Explore. Building it ahead of time keeps the app instant and
offline-friendly; Wikidata's live query for one country can take 10-40 seconds.

Usage: python3 tools/build-dishes.py            (all countries, about 30-60 minutes; no packages needed)
       python3 tools/build-dishes.py Q45 Q17    (just these countries, merged into the existing file)
Data: Wikidata, CC0."""
import json, re, sys, time, pathlib, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = pathlib.Path(__file__).resolve().parent.parent
DEST = ROOT / "app" / "data" / "dishes.json"
UA = {"User-Agent": "Tripster/1.0 (github.com/sage-of-the-hills/tripster)", "Accept": "application/sparql-results+json"}
DISH, FOOD, DRINK = "Q746549", "Q2095", "Q40050"
KEEP = 30
# things Wikidata files under food that a traveller wouldn't order
SKIP = re.compile(r"\b(diet|flour|breed|cultivar|species|genus|brand|company|restaurant|chain|ingredient|additive|food additive|e number|cuisine|preserve|condiment|variety|varieties|carp|dried grape|plant|fruit of|form of|ornamental)\b", re.I)


def sparql(q, tries=4):
    body = urllib.parse.urlencode({"query": q, "format": "json"}).encode()
    for i in range(tries):
        try:
            req = urllib.request.Request("https://query.wikidata.org/sparql", data=body, headers=UA)
            return json.load(urllib.request.urlopen(req, timeout=90))["results"]["bindings"]
        except Exception as e:  # timeouts and 429s: wait and try again
            if i == tries - 1:
                raise
            time.sleep(10 * (i + 1))


def qid(uri):
    return uri.rsplit("/", 1)[1]


def country_dishes(q):
    top = sparql(f"""SELECT ?item ?links (GROUP_CONCAT(DISTINCT ?root;separator=" ") AS ?roots) WHERE {{
      VALUES ?root {{ wd:{DISH} wd:{FOOD} wd:{DRINK} }} ?k wdt:P279* ?root. ?item wdt:P31|wdt:P279 ?k.
      ?item wdt:P495 wd:{q}; wikibase:sitelinks ?links. FILTER(?links >= 4)
    }} GROUP BY ?item ?links ORDER BY DESC(?links) LIMIT 90""")
    if not top:
        return []
    base = {qid(b["item"]["value"]): {"links": int(b["links"]["value"]), "roots": b["roots"]["value"]} for b in top}
    vals = " ".join("wd:" + x for x in base)
    rows = sparql(f"""SELECT ?item ?l ?d ?img (GROUP_CONCAT(DISTINCT ?il;separator=", ") AS ?ings) (COUNT(DISTINCT ?oc) AS ?n)
      (SAMPLE(?rl) AS ?reg) (SAMPLE(?rc) AS ?regc) (SAMPLE(?tx) AS ?taxon) WHERE {{
      VALUES ?item {{ {vals} }} ?item rdfs:label ?l FILTER(lang(?l)="en")
      OPTIONAL{{ ?item wdt:P495 ?oc }} OPTIONAL{{ ?item schema:description ?d FILTER(lang(?d)="en") }} OPTIONAL{{ ?item wdt:P18 ?img }}
      OPTIONAL{{ ?item wdt:P527|wdt:P186 ?ing. ?ing rdfs:label ?il FILTER(lang(?il)="en") }}
      OPTIONAL{{ ?item wdt:P2341 ?r. ?r rdfs:label ?rl FILTER(lang(?rl)="en") OPTIONAL{{ ?r wdt:P625 ?rc }} }}
      OPTIONAL{{ ?item wdt:P31 ?tx FILTER(?tx = wd:Q16521) }}
    }} GROUP BY ?item ?l ?d ?img""")
    out, seen = [], set()
    for b in rows:
        i = qid(b["item"]["value"])
        if i in seen or "taxon" in b:
            continue
        seen.add(i)
        name, desc = b["l"]["value"], b.get("d", {}).get("value", "")
        if re.match(r"^Q\d+$", name) or SKIP.search(desc) or SKIP.search(name):
            continue
        roots, n = base[i]["roots"], max(1, int(b["n"]["value"]))
        drink = DRINK in roots and DISH not in roots
        kind = "drink" if drink else "sweet" if re.search(r"dessert|sweet|cake|pastry|confection|pudding|biscuit|cookie|candy|tart", desc, re.I) \
            else "cheese" if re.search(r"cheese", name + " " + desc, re.I) else "dish"
        x = {"id": i, "n": name, "d": desc[:140], "k": kind,
             # a dish claimed by many countries says less about this one
             "s": round(base[i]["links"] / (1 + 0.6 * (n - 1)), 1)}
        if b.get("img"):
            x["img"] = urllib.parse.unquote(b["img"]["value"].rsplit("/", 1)[1])
        if b.get("ings", {}).get("value"):
            x["ing"] = b["ings"]["value"][:160]
        if b.get("reg"):
            x["reg"] = b["reg"]["value"]
            m = re.match(r"Point\(([-\d.e]+) ([-\d.e]+)\)", b.get("regc", {}).get("value", ""))
            if m:
                x["ll"] = [round(float(m.group(2)), 3), round(float(m.group(1)), 3)]
        out.append(x)
    out.sort(key=lambda x: -x["s"])
    # keep a mix: drinks and cheeses shouldn't crowd out the dishes
    picked, cap = [], {"drink": 6, "cheese": 4, "sweet": 8, "dish": KEEP}
    for x in out:
        if cap[x["k"]] > 0 and len(picked) < KEEP:
            picked.append(x)
            cap[x["k"]] -= 1
    return picked


def main():
    countries = json.loads((ROOT / "app" / "data" / "countries.json").read_text(encoding="utf-8"))
    want = sys.argv[1:] or [c["q"] for c in countries]
    data = json.loads(DEST.read_text(encoding="utf-8")) if DEST.exists() else {}

    def one(q):
        try:
            v = country_dishes(q)
            print(q, len(v), flush=True)
            return q, v
        except Exception as e:
            print(q, "failed:", e, flush=True)
            return q, None

    with ThreadPoolExecutor(3) as pool:  # Wikidata allows a few parallel queries per client
        for i, (q, v) in enumerate(pool.map(one, want)):
            if v:
                data[q] = v
            if i % 10 == 9:  # save as we go, so a long run can be stopped and resumed
                DEST.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    DEST.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("wrote", len(data), "countries to", DEST)


if __name__ == "__main__":
    main()
