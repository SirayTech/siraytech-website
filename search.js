/* Siray Tech site search: a Search button in the header of every page that opens a quick-search panel over the full catalogue (catalog.js). */
(function () {
  if (window.__stSearch) return;
  window.__stSearch = 1;

  const css = `
.st-sbtn{display:inline-flex;align-items:center;gap:8px;font:500 14px var(--body,system-ui);color:var(--ink,#fff);background:transparent;border:1px solid var(--line,#2a2a2a);border-radius:999px;padding:8px 14px;cursor:pointer;white-space:nowrap}
.st-sbtn:hover{border-color:var(--ink,#fff)}
.st-sbtn svg{width:16px;height:16px;flex:none}
.st-sbtn kbd{font:500 11px var(--body,system-ui);color:var(--muted,#9a9a9a);border:1px solid var(--line,#2a2a2a);border-radius:5px;padding:1px 5px}
@media (max-width:900px){.st-sbtn kbd{display:none}}
@media (max-width:700px){.st-sbtn{margin-left:auto;padding:9px}.st-sbtn span{display:none}header .bar>a.btn{white-space:nowrap;padding:9px 14px;font-size:13px}header .bar{gap:10px}}
@media (max-width:380px){header .brand span{font-size:20px}}
.st-so{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:none;align-items:flex-start;justify-content:center;padding:8vh 14px 14px}
.st-so.on{display:flex}
.st-sbox{width:100%;max-width:720px;max-height:84vh;display:flex;flex-direction:column;background:#0b0b0b;border:1px solid var(--line,#2a2a2a);border-radius:16px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.6)}
.st-srow{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--line,#2a2a2a)}
.st-srow svg{width:20px;height:20px;color:var(--muted,#9a9a9a);flex:none}
.st-srow input{flex:1;min-width:0;background:transparent;border:0;outline:0;color:var(--ink,#fff);font:500 18px var(--body,system-ui)}
.st-srow input::-webkit-search-cancel-button{display:none}
.st-sx{font:500 12px var(--body,system-ui);color:var(--muted,#9a9a9a);background:transparent;border:1px solid var(--line,#2a2a2a);border-radius:6px;padding:4px 8px;cursor:pointer}
.st-sres{overflow-y:auto;padding:6px 8px 8px}
.st-sh{font:700 12px var(--display,system-ui);letter-spacing:.2em;color:var(--muted,#9a9a9a);padding:12px 8px 6px}
.st-si{display:grid;grid-template-columns:56px 1fr auto;gap:12px;align-items:center;padding:8px;border-radius:12px;text-decoration:none;color:var(--ink,#fff)}
.st-si:hover,.st-si[aria-selected="true"]{background:#1a1a1a}
.st-si img{width:56px;height:56px;object-fit:contain;background:#fff;border-radius:8px}
.st-si .t{font-size:15px;line-height:1.3;display:block}
.st-si small{display:block;color:var(--muted,#9a9a9a);font-size:12px;margin-top:2px}
.st-si b{font:700 18px var(--display,system-ui);white-space:nowrap;text-align:right}
.st-si b em{display:block;font:600 10px var(--body,system-ui);font-style:normal;letter-spacing:.16em;color:var(--muted,#9a9a9a)}
.st-si.sold{opacity:.7}
.st-sempty{color:var(--muted,#9a9a9a);padding:18px 10px;font-size:15px}
.st-sfoot{display:flex;flex-wrap:wrap;gap:8px 18px;padding:12px 16px;border-top:1px solid var(--line,#2a2a2a);font-size:13px;color:var(--muted,#9a9a9a)}
.st-sfoot a{color:var(--ink,#fff)}
.st-schips{display:flex;flex-wrap:wrap;gap:8px;padding:4px 8px 10px}
.st-schips button{font:500 13px var(--body,system-ui);color:var(--muted,#9a9a9a);background:transparent;border:1px solid var(--line,#2a2a2a);border-radius:999px;padding:6px 12px;cursor:pointer}
.st-schips button:hover{color:var(--ink,#fff);border-color:var(--ink,#fff)}
body.st-lock{overflow:hidden}`;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const R = n => "R" + Math.round(n).toLocaleString("en-ZA").replace(/[\s ]/g, ",");
  const WA = "https://wa.me/27736786392?text=";
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || "");

  /* Header button */
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "st-sbtn";
  btn.setAttribute("aria-label", "Search products");
  btn.innerHTML = ICON + "<span>Search</span><kbd>" + (isMac ? "⌘K" : "Ctrl K") + "</kbd>";
  const bar = document.querySelector("header .bar");
  if (bar) {
    const wa = [...bar.children].find(el => el.matches("a.btn"));
    bar.insertBefore(btn, wa || null);
  }

  /* Overlay */
  const so = document.createElement("div");
  so.className = "st-so";
  so.setAttribute("role", "dialog");
  so.setAttribute("aria-modal", "true");
  so.setAttribute("aria-label", "Search Siray Tech");
  so.innerHTML = `<div class="st-sbox"><div class="st-srow">${ICON}<input type="search" id="stQ" placeholder="Search PCs, graphics cards, monitors, RAM…" autocomplete="off" aria-label="Search products" aria-controls="stRes"><button type="button" class="st-sx" aria-label="Close search">Esc</button></div><div class="st-sres" id="stRes" role="listbox"></div><div class="st-sfoot" id="stFoot"></div></div>`;
  document.body.appendChild(so);
  const input = so.querySelector("#stQ"), res = so.querySelector("#stRes"), foot = so.querySelector("#stFoot");

  /* Catalogue */
  let items = null, subName = {}, loading = null;
  function index(cat) {
    (cat.tree || []).forEach(([, , subs]) => (subs || []).forEach(([id, name]) => (subName[id] = name)));
    items = (cat.items || []).map(i => {
      const words = [i.t, i.brand, subName[i.sub], (i.s || []).join(" "), i.n].filter(Boolean).join(" ").toLowerCase();
      return Object.assign({}, i, { _t: i.t.toLowerCase(), _w: words, _c: words.replace(/[^a-z0-9]/g, "") });
    });
  }
  function load() {
    if (items) return Promise.resolve();
    if (window.CATALOG) { index(window.CATALOG); return Promise.resolve(); }
    if (loading) return loading;
    const cur = document.querySelector('script[src*="catalog.js"]');
    const src = cur ? cur.getAttribute("src") : "/catalog.js?v=" + new Date().toISOString().slice(0, 13);
    loading = new Promise(ok => {
      const s = document.createElement("script");
      s.src = src.startsWith("/") || src.startsWith("http") ? src : "/" + src;
      s.onload = () => { if (window.CATALOG) index(window.CATALOG); ok(); };
      s.onerror = () => { items = []; ok(); };
      document.head.appendChild(s);
    });
    return loading;
  }
  const sold = i => i.st === "sold" || i.st === "soldout";

  function search(q) {
    const toks = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!toks.length) return [];
    const out = [];
    for (const i of items) {
      let score = 0, ok = true;
      for (const t of toks) {
        const tc = t.replace(/[^a-z0-9]/g, "");
        if (i._t.includes(t)) score += 3;
        else if (i._w.includes(t)) score += 1;
        else if (tc && i._c.includes(tc)) score += 1;
        else if ((t.match(/[a-z]+|[0-9]+[a-z]*/g) || []).length > 1 && t.match(/[a-z]+|[0-9]+[a-z]*/g).every(p => i._w.includes(p))) score += 1;
        else { ok = false; break; }
      }
      if (ok) out.push([score + (sold(i) ? 0 : 10), i]);
    }
    out.sort((a, b) => b[0] - a[0] || (b[1].d || 0) - (a[1].d || 0));
    return out.map(x => x[1]);
  }

  const SUGGEST = ["Gaming PC", "RTX", "Monitor", "SSD", "RAM", "Keyboard", "Laptop", "iPhone"];
  let sel = -1, links = [];
  function row(i) {
    const s = sold(i);
    const img = i.img ? "/img/" + i.img : "/img/logo.png";
    return `<a class="st-si${s ? " sold" : ""}" href="/${esc(i.u)}" role="option" aria-selected="false"><img src="${esc(img)}" alt="" loading="lazy"><span><span class="t">${esc(i.t)}</span><small>${esc(subName[i.sub] || "")}${s ? " · sold" : " · in stock, pre-owned"}</small></span><b>${R(i.p)}<em>${s ? "SOLD" : "IN STOCK"}</em></b></a>`;
  }
  function draw() {
    const q = input.value.trim();
    sel = -1;
    if (!items) { res.innerHTML = '<div class="st-sempty">Loading…</div>'; return; }
    if (!q) {
      const live = items.filter(i => !sold(i)).sort((a, b) => (b.d || 0) - (a.d || 0)).slice(0, 6);
      res.innerHTML = `<div class="st-schips">${SUGGEST.map(s => `<button type="button" data-s="${esc(s)}">${esc(s)}</button>`).join("")}</div><div class="st-sh">JUST LISTED</div>${live.map(row).join("")}`;
      foot.innerHTML = `<span>${items.filter(i => !sold(i)).length} items in stock</span><a href="/#shop">Browse the shop</a><a href="/new.html">Brand-new range</a>`;
    } else {
      const list = search(q);
      const live = list.filter(i => !sold(i)), gone = list.filter(sold);
      let html = "";
      if (live.length) html += `<div class="st-sh">IN STOCK · ${live.length}</div>` + live.slice(0, 20).map(row).join("");
      if (gone.length) html += `<div class="st-sh">SOLD BEFORE · ${gone.length}</div>` + gone.slice(0, live.length ? 6 : 12).map(row).join("");
      if (!list.length) html = `<div class="st-sempty">Nothing matches “${esc(q)}” right now. We source on request, new or pre-owned.</div>`;
      res.innerHTML = html;
      const ask = WA + encodeURIComponent(`Hi Siray Tech, I'm looking for: ${q}. Budget: R`);
      foot.innerHTML = `<a href="${ask}" target="_blank" rel="noopener">Can't find it? Ask us to source it</a><a href="/?q=${encodeURIComponent(q)}#shop">See all in the shop</a><a href="/new.html">Brand-new range</a>`;
    }
    links = [...res.querySelectorAll(".st-si")];
  }
  function move(d) {
    if (!links.length) return;
    if (sel >= 0) links[sel].setAttribute("aria-selected", "false");
    sel = (sel + d + links.length) % links.length;
    links[sel].setAttribute("aria-selected", "true");
    links[sel].scrollIntoView({ block: "nearest" });
  }

  let lastFocus = null;
  function open(prefill) {
    lastFocus = document.activeElement;
    so.classList.add("on");
    document.body.classList.add("st-lock");
    if (typeof prefill === "string") input.value = prefill;
    input.focus();
    input.select();
    load().then(draw);
    draw();
  }
  function close() {
    so.classList.remove("on");
    document.body.classList.remove("st-lock");
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  window.SirayTechSearch = { open, close };

  btn.addEventListener("click", () => open());
  so.querySelector(".st-sx").addEventListener("click", close);
  so.addEventListener("click", e => {
    if (e.target === so) close();
    const chip = e.target.closest("[data-s]");
    if (chip) { input.value = chip.dataset.s; draw(); input.focus(); }
  });
  input.addEventListener("input", draw);
  input.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const t = links[sel >= 0 ? sel : 0];
      if (t) location.href = t.href;
      else if (input.value.trim()) location.href = "/?q=" + encodeURIComponent(input.value.trim()) + "#shop";
    }
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && so.classList.contains("on")) { close(); return; }
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || "")) || e.target.isContentEditable;
    if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) { e.preventDefault(); so.classList.contains("on") ? close() : open(); }
    else if (e.key === "/" && !typing && !so.classList.contains("on")) { e.preventDefault(); open(); }
  });

  /* Shop page: apply ?q= to the shop's own search box */
  const q0 = new URLSearchParams(location.search).get("q");
  const shopQ = document.getElementById("q");
  if (q0 && shopQ) {
    const apply = () => { shopQ.value = q0; shopQ.dispatchEvent(new Event("input", { bubbles: true })); };
    if (document.readyState === "complete") apply(); else window.addEventListener("load", apply);
  }
})();
