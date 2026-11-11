/* Siray Tech shop: renders CATALOG (catalog.js) with category tree, stock/sold tabs, search and sort. */
(function () {
  const { tree, items } = window.CATALOG;
  const PHONE = "27736786392";
  const R = n => "R" + n.toLocaleString("en-ZA").replace(/[   ]/g, " ");
  const wa = t => `https://wa.me/${PHONE}?text=` + encodeURIComponent(t);
  const subName = {}, topName = {}, subTop = {};
  tree.forEach(([tid, tname, subs]) => { topName[tid] = tname; subs.forEach(([sid, sname]) => { subName[sid] = sname; subTop[sid] = tid; }); });
  const isSold = i => i.st !== "stock";
  const state = { status: "stock", top: "", sub: "", q: "", sort: "new", shown: 24 };

  /* counts */
  const count = (pred) => items.filter(pred).length;
  const stockN = count(i => !isSold(i)), soldN = count(isSold);
  document.getElementById("stockCount").textContent = stockN;
  const soldRounded = Math.floor(soldN / 10) * 10;
  document.getElementById("soldCount").textContent = soldRounded + "+";
  document.getElementById("tStock").textContent = stockN;
  document.getElementById("tSold").textContent = soldN;
  document.getElementById("trSold").textContent = soldN;
  document.getElementById("trGpu").textContent = count(i => isSold(i) && i.sub === "gpus");
  document.getElementById("trPc").textContent = count(i => isSold(i) && ["gaming-pcs", "workstations", "laptops", "handhelds"].includes(i.sub));

  /* sidebar + mega menu */
  const treeEl = document.getElementById("tree"), mega = document.getElementById("megaPanel");
  treeEl.innerHTML = tree.map(([tid, tname, subs]) => `
    <details ${tid === "systems" || tid === "components" ? "open" : ""}>
      <summary>${tname}</summary>
      <ul>
        <li><button type="button" data-top="${tid}" data-sub="" aria-pressed="false"><span>All ${tname}</span><small data-c="t:${tid}"></small></button></li>
        ${subs.map(([sid, sname]) => `<li><button type="button" data-top="${tid}" data-sub="${sid}" aria-pressed="false"><span>${sname}</span><small data-c="s:${sid}"></small></button></li>`).join("")}
      </ul>
    </details>`).join("");
  mega.innerHTML = tree.map(([tid, tname, subs]) => `<div><b>${tname}</b>${subs.map(([sid, sname]) => `<a href="#shop" data-top="${tid}" data-sub="${sid}">${sname}</a>`).join("")}</div>`).join("") +
    `<div><b>Quick links</b><a href="#shop" data-go="stock">In stock now</a><a href="#shop" data-go="sold">Sold archive</a><a href="#builds">Custom builds</a><a href="#builds">Trade-ins</a></div>`;
  if (window.matchMedia("(max-width: 900px)").matches) treeEl.querySelectorAll("details").forEach(d => d.open = false);
  const megaWrap = document.getElementById("mega"), megaBtn = megaWrap.querySelector("button");
  megaBtn.addEventListener("click", () => { const o = !megaWrap.classList.contains("open"); megaWrap.classList.toggle("open", o); megaBtn.setAttribute("aria-expanded", o); });
  document.addEventListener("click", e => { if (!megaWrap.contains(e.target)) { megaWrap.classList.remove("open"); megaBtn.setAttribute("aria-expanded", false); } });

  function inStatus(i) { return state.status === "all" || (state.status === "sold" ? isSold(i) : !isSold(i)); }
  function refreshCounts() {
    const base = items.filter(inStatus);
    document.getElementById("cAll").textContent = base.length;
    document.querySelectorAll("[data-c]").forEach(el => {
      const [k, v] = el.dataset.c.split(":");
      el.textContent = base.filter(i => (k === "t" ? i.top : i.sub) === v).length;
    });
  }

  function card(i) {
    const sold = isSold(i);
    const label = i.st === "soldout" ? "SOLD OUT" : "SOLD";
    const price = `${R(i.p)}${i.was && !sold ? `<s>${R(i.was)}</s>` : ""}`;
    const specs = i.s && !sold ? `<ul>${i.s.map(x => `<li>${x}</li>`).join("")}</ul>` : "";
    const note = i.n && !sold ? `<div class="note">${i.n}</div>` : "";
    const when = new Date(i.d * 1000).toLocaleDateString("en-ZA", { month: "short", year: "numeric" });
    const ask = sold
      ? `<a class="btn ghost" href="${wa(`Hi Siray Tech, I saw the sold ${i.t} on your website. Can you source one like it for me?`)}" target="_blank" rel="noopener">Want one like this?</a>`
      : `<a class="btn" href="${wa(`Hi Siray Tech, is the ${i.t} (${R(i.p)}) available?`)}" target="_blank" rel="noopener">Ask on WhatsApp</a><a class="btn ghost" href="https://www.instagram.com/siraytech/" target="_blank" rel="noopener">DM</a>`;
    return `<article class="card${sold ? " is-sold" : ""}">
      ${sold ? `<span class="ribbon">${label}</span>` : `<span class="ribbon">IN STOCK</span>`}
      <a class="ph" href="${i.u}"><img src="img/${i.img}" alt="${i.t.replace(/"/g, "&quot;")}" loading="lazy" decoding="async" width="800" height="800"></a>
      <div class="body">
        <div class="tag">${subName[i.sub]}</div>
        <h3><a href="${i.u}" style="text-decoration:none">${i.t}</a></h3>
        <div class="price">${price}</div>
        ${specs}${note}
        <div class="meta">${sold ? `Listed ${when} · ${label === "SOLD" ? "sold" : "sold out"}` : `Listed ${when}`}</div>
        <div class="actions">${ask}</div>
      </div>
    </article>`;
  }

  function render() {
    refreshCounts();
    const q = state.q.trim().toLowerCase();
    let list = items.filter(i => inStatus(i) && (!state.top || i.top === state.top) && (!state.sub || i.sub === state.sub) && (!q || i.t.toLowerCase().includes(q)));
    if (state.sort === "low") list.sort((a, b) => a.p - b.p);
    else if (state.sort === "high") list.sort((a, b) => b.p - a.p);
    else list.sort((a, b) => b.d - a.d);
    const grid = document.getElementById("grid");
    const where = state.sub ? `${topName[state.top]} › <b>${subName[state.sub]}</b>` : state.top ? `<b>${topName[state.top]}</b>` : "<b>All products</b>";
    const what = state.status === "stock" ? "in stock" : state.status === "sold" ? "sold" : "listed";
    document.getElementById("crumb").innerHTML = `${where} · ${list.length} ${what}`;
    document.getElementById("trust").hidden = state.status === "stock";
    if (!list.length) {
      const name = state.sub ? subName[state.sub] : state.top ? topName[state.top] : "this search";
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1">Nothing ${what} in ${name} right now. We source on request: <a href="${wa(`Hi Siray Tech, I'm looking for ${state.sub ? subName[state.sub] : state.q || "something"}. Budget: R`)}" target="_blank" rel="noopener">tell us what you need on WhatsApp</a>.${state.status === "stock" ? ` Or <a href="#shop" data-go="sold">see what we've sold</a>.` : ""}</div>`;
    } else {
      grid.innerHTML = list.slice(0, state.shown).map(card).join("");
    }
    const more = document.getElementById("moreBtn");
    more.hidden = list.length <= state.shown;
    more.textContent = `Show more (${list.length - state.shown} left)`;
  }

  function setCat(top, sub) {
    state.top = top; state.sub = sub; state.shown = 24;
    document.querySelectorAll(".side [data-top]").forEach(b => b.setAttribute("aria-pressed", b.dataset.top === top && b.dataset.sub === sub));
    if (top) { const d = document.querySelector(`.side [data-top="${top}"]`).closest("details"); if (d) d.open = true; }
    render();
  }
  function setStatus(s) {
    state.status = s; state.shown = 24;
    document.querySelectorAll(".tabs button").forEach(b => b.setAttribute("aria-selected", b.dataset.s === s));
    render();
  }
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-top],[data-go]");
    if (!t) return;
    if (t.dataset.go) { setStatus(t.dataset.go); setCat("", ""); }
    else if (t.closest(".side,.mega")) {
      setCat(t.dataset.top, t.dataset.sub);
      if (t.closest(".mega")) { megaWrap.classList.remove("open"); if (!items.some(i => !isSold(i) && i.sub === t.dataset.sub)) setStatus("all"); }
    }
  });
  document.querySelectorAll(".tabs button").forEach(b => b.addEventListener("click", () => setStatus(b.dataset.s)));
  document.getElementById("q").addEventListener("input", e => { state.q = e.target.value; state.shown = 24; render(); });
  document.getElementById("sort").addEventListener("change", e => { state.sort = e.target.value; render(); });
  document.getElementById("moreBtn").addEventListener("click", () => { state.shown += 24; render(); });
  render();
})();
