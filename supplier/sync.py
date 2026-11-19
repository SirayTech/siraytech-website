#!/usr/bin/env python3
"""Siray Tech supplier sync.

Reads the supplier's public sitemap, visits each product page politely (robots.txt
crawl-delay), reads the schema.org Product data (name, SKU, GTIN, brand, price,
stock, images, breadcrumbs) and writes:

  data/supplier/catalog.json   every product with Siray Tech's selling price
  data/supplier/changes.json   what changed since the last run (new, price up/down, out of stock)
  data/supplier/feed.json      a lean feed for the AI sales assistant (MyChatBot product feed)

It runs in GitHub Actions every 3 hours, so no PC needs to be on.
Prices follow supplier/config.json (default: the supplier's exact price).

Usage:
  python supplier/sync.py                 full run
  python supplier/sync.py --limit 50      quick test on 50 products
  python supplier/sync.py --fixture DIR   parse saved HTML files instead of the web (tests)
"""
import argparse, json, math, os, re, sys, time, urllib.request, urllib.error
from datetime import datetime, timezone, timedelta
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = json.load(open(os.path.join(ROOT, "supplier", "config.json")))
OUT = os.path.join(ROOT, "data", "supplier")
SAST = timezone(timedelta(hours=2))

# Supplier breadcrumbs / names -> Siray Tech categories (same tree as catalog.js)
CATEGORY_RULES = [
    ("gaming-pcs", r"gaming pc|pre-?built|desktop pc|best-pc-deal"),
    ("workstations", r"workstation|ai-ready|creator pc"),
    ("handhelds", r"handheld|rog ally|legion go|steam deck"),
    ("laptops", r"laptop|notebook|macbook"),
    ("gpus", r"graphics card|geforce|radeon rx|\brtx\b|intel arc"),
    ("cpus", r"processor|\bcpu\b|ryzen \d|core i\d|core ultra"),
    ("motherboards", r"motherboard|\b[abxz]\d{3}[a-z]?\b"),
    ("ram", r"memory|\bram\b|ddr[45]"),
    ("psus", r"power suppl|\bpsu\b"),
    ("cases", r"\bcase\b|chassis|tower"),
    ("ssds", r"\bssd\b|nvme|m\.2"),
    ("hdds", r"hard drive|\bhdd\b"),
    ("external", r"external|portable drive|flash drive"),
    ("monitors", r"monitor|display"),
    ("keyboards-mice", r"keyboard|mouse|mice|mouse ?pad|mousepad"),
    ("audio", r"headset|headphone|speaker|microphone|earbud"),
    ("chairs", r"chair|desk"),
    ("liquid", r"liquid|\baio\b|water cool"),
    ("fans", r"fan|air cool|cpu cooler|cooler"),
    ("ups", r"\bups\b|inverter|battery|power station"),
    ("cables", r"cable|adapter|hub|dock"),
    ("routers", r"router|mesh|wi-?fi|access point"),
    ("switches", r"switch|network adapter|ethernet"),
    ("consoles", r"playstation|xbox|nintendo|console"),
    ("games", r"controller|gamepad|game\b"),
]
SUB_TOP = {
    "gaming-pcs": "systems", "workstations": "systems", "laptops": "systems", "handhelds": "systems",
    "gpus": "components", "cpus": "components", "ram": "components", "motherboards": "components", "psus": "components", "cases": "components",
    "ssds": "storage", "hdds": "storage", "external": "storage",
    "monitors": "peripherals", "keyboards-mice": "peripherals", "audio": "peripherals", "chairs": "peripherals",
    "liquid": "cooling", "fans": "cooling", "ups": "cooling", "cables": "cooling",
    "routers": "networking", "switches": "networking",
    "consoles": "mobile-gaming", "games": "mobile-gaming",
}


class LD(HTMLParser):
    """Collects every <script type="application/ld+json"> block."""
    def __init__(self):
        super().__init__(); self.blocks = []; self._on = False; self._buf = []
    def handle_starttag(self, tag, attrs):
        if tag == "script" and dict(attrs).get("type", "").lower() == "application/ld+json":
            self._on = True; self._buf = []
    def handle_endtag(self, tag):
        if tag == "script" and self._on:
            self._on = False; self.blocks.append("".join(self._buf))
    def handle_data(self, data):
        if self._on: self._buf.append(data)


def ld_objects(html):
    p = LD(); p.feed(html)
    out = []
    for b in p.blocks:
        try: j = json.loads(b)
        except Exception: continue
        for x in (j if isinstance(j, list) else [j]):
            out.extend(x.get("@graph", [x]) if isinstance(x, dict) else [])
    return out


def is_type(o, t):
    ty = o.get("@type")
    return ty == t or (isinstance(ty, list) and t in ty)


def classify(name, crumbs, url):
    hay = " ".join([name] + crumbs + [url]).lower()
    for sub, rx in CATEGORY_RULES:
        if re.search(rx, hay):
            return sub
    return "cables"


def sell_price(p):
    pr = CFG["pricing"]
    if pr["mode"] == "markup" and pr["markup_pct"]:
        v = p * (1 + pr["markup_pct"] / 100)
        step = max(1, pr.get("round_to", 1))
        return int(math.ceil(v / step) * step)
    return int(round(p))


def parse_product(html, url):
    objs = ld_objects(html)
    prod = next((o for o in objs if is_type(o, "Product")), None)
    if not prod: return None
    offers = prod.get("offers") or {}
    if isinstance(offers, list): offers = offers[0] if offers else {}
    try: price = float(offers.get("price") or offers.get("lowPrice"))
    except (TypeError, ValueError): return None
    crumbs = []
    bc = next((o for o in objs if is_type(o, "BreadcrumbList")), None)
    if bc:
        crumbs = [i.get("name", "") for i in bc.get("itemListElement", []) if isinstance(i, dict)][1:-1]
    imgs = prod.get("image") or []
    if isinstance(imgs, str): imgs = [imgs]
    brand = prod.get("brand")
    if isinstance(brand, dict): brand = brand.get("name")
    avail = (offers.get("availability") or "").rsplit("/", 1)[-1]
    name = re.sub(r"\s+", " ", prod.get("name", "")).strip()
    sub = classify(name, crumbs, url)
    m = re.search(r"/(\d+)(?:\.aspx)?/?$", url)
    return {
        "id": "ev-" + (m.group(1) if m else re.sub(r"\W+", "-", prod.get("sku", name))[:40]),
        "t": name,
        "brand": brand,
        "sku": prod.get("sku"),
        "gtin": prod.get("gtin13") or prod.get("gtin12") or prod.get("gtin"),
        "sup_p": price,
        "p": sell_price(price),
        "stock": avail in ("InStock", "LimitedAvailability", "PreOrder", "BackOrder"),
        "avail": avail,
        "top": SUB_TOP[sub], "sub": sub,
        "crumbs": crumbs,
        "img": imgs[:4],
        "desc": (prod.get("description") or "")[:600],
        "src": url,
    }


def fetch(url, tries=3):
    req = urllib.request.Request(url, headers={"User-Agent": CFG["user_agent"], "Accept": "text/html,application/xml"})
    for k in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            if e.code in (404, 410): return None
            time.sleep(5 * (k + 1))
        except Exception:
            time.sleep(5 * (k + 1))
    return None


def product_urls():
    xml = fetch(CFG["sitemap"]) or ""
    locs = re.findall(r"<loc>([^<]+)</loc>", xml)
    pats = CFG["product_url_patterns"]
    return [u for u in locs if any(p in u for p in pats)]


def load(path, default):
    try: return json.load(open(path))
    except Exception: return default


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--fixture")
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    prev = {i["id"]: i for i in load(os.path.join(OUT, "catalog.json"), {}).get("items", [])}

    items, errors = [], 0
    start = time.time()
    if a.fixture:
        for fn in sorted(os.listdir(a.fixture)):
            if fn.endswith(".html"):
                html = open(os.path.join(a.fixture, fn), encoding="utf-8").read()
                url = re.search(r'"url"\s*:\s*"([^"]+/best-deal/[^"]+)"', html)
                it = parse_product(html, url.group(1) if url else fn)
                if it: items.append(it)
    else:
        urls = product_urls()
        if a.limit: urls = urls[: a.limit]
        print(f"{len(urls)} product pages to check")
        for n, u in enumerate(urls, 1):
            if time.time() - start > CFG["max_runtime_minutes"] * 60:
                print("time budget reached, keeping the rest from the last run"); break
            html = fetch(u)
            it = parse_product(html, u) if html else None
            if it: items.append(it)
            else: errors += 1
            if n % 250 == 0: print(f"  {n}/{len(urls)} checked, {len(items)} parsed")
            time.sleep(CFG["crawl_delay_seconds"])
        # keep products we didn't reach this run (time budget) so the site never empties
        seen = {i["id"] for i in items}
        items += [p for k, p in prev.items() if k not in seen and p.get("stock")]

    now = datetime.now(SAST)
    for it in items:
        it["seen"] = prev.get(it["id"], {}).get("seen", now.isoformat(timespec="minutes"))
    new = [i for i in items if i["id"] not in prev and i["stock"]]
    up = [{"id": i["id"], "t": i["t"], "from": prev[i["id"]]["p"], "to": i["p"]} for i in items if i["id"] in prev and i["p"] > prev[i["id"]]["p"]]
    down = [{"id": i["id"], "t": i["t"], "from": prev[i["id"]]["p"], "to": i["p"]} for i in items if i["id"] in prev and i["p"] < prev[i["id"]]["p"]]
    gone = [i["id"] for i in items if not i["stock"] and prev.get(i["id"], {}).get("stock")]

    visible = [i for i in items if i["stock"] or CFG["show_out_of_stock"]]
    stamp = now.isoformat(timespec="minutes")
    json.dump({"supplier": CFG["supplier"], "updated": stamp, "count": len(visible), "items": visible},
              open(os.path.join(OUT, "catalog.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    json.dump({"updated": stamp, "new": [i["id"] for i in new], "price_up": up, "price_down": down, "out_of_stock": gone, "errors": errors},
              open(os.path.join(OUT, "changes.json"), "w"), ensure_ascii=False, indent=1)
    feed = [{"id": i["id"], "name": i["t"], "price": i["p"], "currency": "ZAR", "in_stock": i["stock"], "category": i["sub"],
             "brand": i["brand"], "image": (i["img"] or [None])[0], "url": f"https://siraytech.co.za/new.html#{i['id']}",
             "delivery": "Ships in 2 to 4 business days"} for i in visible]
    json.dump(feed, open(os.path.join(OUT, "feed.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"done: {len(visible)} on sale, {len(new)} new, {len(down)} cheaper, {len(up)} dearer, {len(gone)} out of stock, {errors} errors")


if __name__ == "__main__":
    main()
