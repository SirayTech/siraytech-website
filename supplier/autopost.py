#!/usr/bin/env python3
"""Posts newly added supplier products to Siray Tech's Instagram and Facebook Page.

Two steps, both run by GitHub Actions after supplier/sync.py:
  python supplier/autopost.py prepare   pick the products, draw branded black-and-white
                                         images (logo bottom-right), save data/supplier/queue.json
  (the workflow pushes, so the images are live on siraytech.co.za)
  python supplier/autopost.py publish   post the queued images with the Meta Graph API

Picks the best new products (priority categories, minimum price) and keeps to a
per-run and per-day cap and quiet hours, so a big catalogue drop never floods the feed.
No background music, no warranty claims, no phone number, no links in captions.
With no tokens set it only prints what it would post (dry run).

Secrets (GitHub > Settings > Secrets and variables > Actions):
  META_PAGE_TOKEN   long-lived Page access token for the Siray Tech Facebook Page
  META_PAGE_ID      Siray Tech Facebook Page ID
  META_IG_USER_ID   Instagram business account ID
"""
import io, json, os, sys, urllib.parse, urllib.request
from datetime import datetime, timezone, timedelta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = json.load(open(os.path.join(ROOT, "supplier", "config.json")))["autopost"]
DATA = os.path.join(ROOT, "data", "supplier")
IMGDIR = os.path.join(DATA, "posts")
LOG, QUEUE = os.path.join(DATA, "posted.json"), os.path.join(DATA, "queue.json")
SITE = "https://siraytech.co.za/data/supplier/posts/"
SAST = timezone(timedelta(hours=2))
GRAPH = "https://graph.facebook.com/v21.0"
UA = {"User-Agent": "SirayTechSync/1.0 (+https://siraytech.co.za)"}


def R(n): return "R" + f"{int(n):,}"


def caption(i):
    tag = {"gaming-pcs": "gamingpc", "laptops": "gaminglaptop", "gpus": "graphicscard", "monitors": "gamingmonitor"}.get(i["sub"], i["sub"].replace("-", ""))
    return "\n".join([
        f"New in at Siray Tech: {i['t']}",
        f"{R(i['p'])}",
        "",
        "Brand new and sealed. Ships in 2 to 4 business days, courier nationwide or collect in Centurion.",
        "",
        "DM us NEW to order or to ask a question.",
        "",
        f"#siraytech #pcbuildsa #gamingpcsa #{tag}",
    ])


def card(i, path):
    from PIL import Image, ImageDraw, ImageFont
    W, H = 1080, 1350
    im = Image.new("RGB", (W, H), "black"); d = ImageDraw.Draw(im)
    f = lambda n, s: ImageFont.truetype(os.path.join(ROOT, "supplier", n), s)
    raw = urllib.request.urlopen(urllib.request.Request(i["img"][0], headers=UA), timeout=60).read()
    ph = Image.open(io.BytesIO(raw)).convert("RGB")
    box = Image.new("RGB", (W, 860), "white")
    ph.thumbnail((980, 800), Image.LANCZOS)
    box.paste(ph, ((W - ph.width) // 2, (860 - ph.height) // 2))
    im.paste(box, (0, 0))
    d.rounded_rectangle((40, 36, 250, 96), radius=30, fill="black")
    d.text((70, 44), "NEW IN", font=f("rajdhani-latin-700-normal.ttf", 44), fill="white")
    y = 900
    words, line, lines = i["t"].split(), "", []
    tf = f("rajdhani-latin-700-normal.ttf", 58)
    for w in words:
        t = (line + " " + w).strip()
        if d.textlength(t, font=tf) <= W - 120: line = t
        else: lines.append(line); line = w
    lines.append(line)
    for ln in lines[:3]:
        d.text((60, y), ln, font=tf, fill="white"); y += 64
    d.text((60, y + 18), R(i["p"]), font=f("rajdhani-latin-700-normal.ttf", 120), fill="white")
    d.text((60, H - 70), "Ships in 2 to 4 business days · siraytech.co.za", font=f("ibm-plex-sans-latin-400-normal.ttf", 30), fill=(190, 190, 190))
    logo = Image.open(os.path.join(ROOT, "supplier", "logo.png")).convert("RGBA").resize((170, 170), Image.LANCZOS)
    im.paste(logo, (W - 200, H - 230), logo)
    im.save(path, "JPEG", quality=90)


def prepare():
    if not CFG["enabled"] and os.environ.get("FORCE_AUTOPOST") != "1":
        print("autopost is off in supplier/config.json"); json.dump([], open(QUEUE, "w")); return
    now = datetime.now(SAST)
    q0, q1 = CFG["quiet_hours_sast"]
    if now.hour >= q0 or now.hour < q1:
        print("quiet hours, posting next run"); json.dump([], open(QUEUE, "w")); return
    cat = {i["id"]: i for i in json.load(open(os.path.join(DATA, "catalog.json")))["items"]}
    changes = json.load(open(os.path.join(DATA, "changes.json")))
    log = json.load(open(LOG)) if os.path.exists(LOG) else {"posted": []}
    today = now.date().isoformat()
    room = min(CFG["max_posts_per_run"], CFG["max_posts_per_day"] - sum(1 for p in log["posted"] if p["at"].startswith(today)))
    if room <= 0:
        print("daily post limit reached"); json.dump([], open(QUEUE, "w")); return
    already = {p["id"] for p in log["posted"]}
    recent = (now - timedelta(days=3)).isoformat()
    queue = [cat[i] for i in changes.get("new", []) if i in cat] + [v for v in cat.values() if v.get("seen", "") >= recent]
    pri = {s: k for k, s in enumerate(CFG["priority_subs"])}
    picks, seen = [], set()
    for i in sorted(queue, key=lambda x: (pri.get(x["sub"], 99), -x["p"])):
        if i["id"] in already or i["id"] in seen or i["p"] < CFG["min_price"] or not i["img"] or not i["stock"]: continue
        seen.add(i["id"]); picks.append(i)
        if len(picks) >= room: break
    os.makedirs(IMGDIR, exist_ok=True)
    out = []
    for i in picks:
        fn = f"{i['id']}.jpg"
        try: card(i, os.path.join(IMGDIR, fn))
        except Exception as e: print("image failed", i["t"], e); continue
        out.append({"id": i["id"], "t": i["t"], "img": SITE + fn, "caption": caption(i)})
    json.dump(out, open(QUEUE, "w"), indent=1)
    print(f"queued {len(out)} posts")


def call(path, params):
    data = urllib.parse.urlencode(params).encode()
    with urllib.request.urlopen(urllib.request.Request(f"{GRAPH}/{path}", data=data), timeout=90) as r:
        return json.loads(r.read())


def publish():
    queue = json.load(open(QUEUE)) if os.path.exists(QUEUE) else []
    log = json.load(open(LOG)) if os.path.exists(LOG) else {"posted": []}
    token, page, ig = os.environ.get("META_PAGE_TOKEN"), os.environ.get("META_PAGE_ID"), os.environ.get("META_IG_USER_ID")
    for q in queue:
        if not token:
            print("DRY RUN would post:", q["t"], q["img"]); continue
        res = {}
        try:
            if "instagram" in CFG["channels"] and ig:
                c = call(f"{ig}/media", {"image_url": q["img"], "caption": q["caption"], "access_token": token})
                res["ig"] = call(f"{ig}/media_publish", {"creation_id": c["id"], "access_token": token}).get("id")
            if "facebook" in CFG["channels"] and page:
                res["fb"] = call(f"{page}/photos", {"url": q["img"], "caption": q["caption"], "access_token": token}).get("post_id")
        except Exception as e:
            print("post failed", q["t"], e); continue
        log["posted"].append({"id": q["id"], "at": datetime.now(SAST).isoformat(timespec="minutes"), **res})
        print("posted", q["t"], res)
    json.dump(log, open(LOG, "w"), indent=1)
    json.dump([], open(QUEUE, "w"))


if __name__ == "__main__":
    {"prepare": prepare, "publish": publish}[sys.argv[1] if len(sys.argv) > 1 else "prepare"]()
