/* Siray Tech Black Friday 2026 takeover.
   Temporary: shows a full-screen sale screen on each new visit until the sale ends,
   then a slim sticky bar. Switches itself off after 30 Nov 2026 23:59 (SAST).
   To remove early: delete this file and its <script src="bf.js"> line in index.html. */
(function () {
  const BF_DAY = new Date("2026-11-27T00:00:00+02:00");
  const END = new Date("2026-11-30T23:59:59+02:00");
  if (Date.now() > END.getTime()) return;
  if (!window.CATALOG) return;

  const R = n => "R" + Math.round(n).toLocaleString("en-ZA").replace(/[\s, ]/g, " ");
  const WA = "https://wa.me/27736786392?text=" + encodeURIComponent("Hi Siray Tech, I saw your Black Friday sale. I'm interested in ");
  const deals = window.CATALOG.items
    .filter(i => i.st === "stock" && i.was && i.was > i.p)
    .sort((a, b) => (b.was - b.p) - (a.was - a.p))
    .slice(0, 3);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const css = `
#bf,#bf *{box-sizing:border-box}
#bf{position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;padding:16px;
  background:rgba(0,0,0,.86);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;transition:opacity .35s ease}
#bf.show{opacity:1}
#bf .bf-box{position:relative;width:min(980px,100%);max-height:calc(100dvh - 32px);overflow:auto;border-radius:22px;
  background:radial-gradient(120% 80% at 50% -10%,#1d1d1d 0%,#070707 55%,#000 100%);border:1px solid rgba(255,255,255,.55);
  box-shadow:0 0 0 1px #000,0 0 34px rgba(255,255,255,.28),inset 0 0 40px rgba(255,255,255,.05);padding:clamp(20px,3.2vw,36px);
  color:#f5f5f5;font-family:var(--body,system-ui,sans-serif);text-align:center;transform:translateY(14px) scale(.98);transition:transform .45s cubic-bezier(.2,.8,.2,1)}
#bf.show .bf-box{transform:none}
#bf .bf-x{position:absolute;top:12px;right:12px;width:42px;height:42px;border-radius:50%;border:1px solid rgba(255,255,255,.5);
  background:#000;color:#fff;font-size:24px;line-height:1;cursor:pointer;display:grid;place-items:center}
#bf .bf-x:hover{box-shadow:0 0 14px rgba(255,255,255,.55)}
#bf .bf-brand{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:6px}
#bf .bf-brand img{width:44px;height:44px;border-radius:50%;box-shadow:0 0 14px rgba(255,255,255,.55)}
#bf .bf-brand span{font-family:var(--brand,cursive);font-size:30px;text-shadow:0 0 10px rgba(255,255,255,.35)}
#bf .bf-kicker{font-family:var(--display,sans-serif);letter-spacing:.42em;font-size:clamp(11px,1.6vw,14px);color:#bdbdbd;margin:8px 0 2px;padding-left:.42em}
#bf .bf-title{font-family:var(--display,sans-serif);font-weight:700;line-height:.86;margin:0;font-size:clamp(56px,min(14vw,14.5vh),160px);letter-spacing:.01em;text-transform:uppercase}
#bf .bf-title .o{color:transparent;-webkit-text-stroke:2px #fff;text-shadow:0 0 22px rgba(255,255,255,.45)}
#bf .bf-title .f{color:#fff;text-shadow:0 0 6px #fff,0 0 24px rgba(255,255,255,.75),0 0 60px rgba(255,255,255,.35);animation:bfFlick 5s infinite}
@keyframes bfFlick{0%,92%,100%{opacity:1}93%{opacity:.55}94%{opacity:1}96%{opacity:.7}97%{opacity:1}}
#bf .bf-sub{max-width:52ch;margin:14px auto 0;color:#cfcfcf;font-size:clamp(14px,1.9vw,17px)}
#bf .bf-sub b{color:#fff}
#bf .bf-cd{display:flex;justify-content:center;gap:10px;margin:10px 0 4px}
#bf .bf-cd div{min-width:72px;padding:10px 8px 8px;border:1px solid rgba(255,255,255,.35);border-radius:12px;background:#0b0b0b}
#bf .bf-cd b{display:block;font-family:var(--display,sans-serif);font-size:clamp(28px,5vw,40px);line-height:1;font-variant-numeric:tabular-nums}
#bf .bf-cd small{font-size:11px;letter-spacing:.18em;color:#9a9a9a;text-transform:uppercase}
#bf .bf-cdl{font-size:12px;letter-spacing:.2em;color:#9a9a9a;text-transform:uppercase;margin-top:14px}
#bf .bf-deals{display:grid;grid-template-columns:1fr;gap:10px;text-align:left}
#bf .bf-deal{display:flex;flex-direction:row;border:1px solid rgba(255,255,255,.22);border-radius:14px;overflow:hidden;background:#0d0d0d;text-decoration:none;color:inherit;transition:border-color .2s,box-shadow .2s}
#bf .bf-deal:hover{border-color:#fff;box-shadow:0 0 18px rgba(255,255,255,.25)}
#bf .bf-deal .ph{position:relative;flex:0 0 118px;aspect-ratio:1/1;background:#fff}
#bf .bf-deal .ph img{width:100%;height:100%;object-fit:contain}
#bf .bf-deal .save{position:absolute;top:6px;left:6px;font-size:10px!important;padding:3px 8px!important;background:#000;color:#fff;border:1px solid #fff;border-radius:999px;padding:4px 10px;font:700 12px var(--display,sans-serif);letter-spacing:.12em}
#bf .bf-deal .tx{padding:12px 14px;display:flex;flex-direction:column;justify-content:center}
#bf .bf-deal .t{font-size:13px;line-height:1.3;color:#d8d8d8;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:2.6em}
#bf .bf-deal .p{font-family:var(--display,sans-serif);font-weight:700;font-size:24px;margin-top:4px}
#bf .bf-deal .p s{font-size:15px;color:#8d8d8d;margin-left:6px;font-weight:500}
#bf .bf-cta{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:16px}
#bf .bf-btn{display:inline-flex;align-items:center;justify-content:center;padding:13px 22px;border-radius:999px;border:1px solid #fff;font:600 15px var(--body,system-ui);text-decoration:none;cursor:pointer}
#bf .bf-btn.solid{background:#fff;color:#000}
#bf .bf-btn.ghost{background:transparent;color:#fff}
#bf .bf-btn:hover{box-shadow:0 0 20px rgba(255,255,255,.55)}
#bf .bf-fine{margin-top:14px;font-size:12px;color:#8a8a8a}
#bfbar{position:relative;z-index:11;display:none;background:#000;border-bottom:1px solid rgba(255,255,255,.35);color:#fff;
  font:600 13px var(--body,system-ui);letter-spacing:.06em;text-align:center;padding:9px 44px 9px 14px;cursor:pointer}
#bfbar.on{display:block}
#bfbar b{font-family:var(--display,sans-serif);letter-spacing:.22em;text-shadow:0 0 10px rgba(255,255,255,.6);margin-right:8px}
#bfbar u{text-underline-offset:3px}
#bfbar .x{position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:0;color:#bbb;font-size:20px;cursor:pointer;padding:4px 8px}
body.bf-lock{overflow:hidden}
#bf .bf-r{margin-top:20px}
#bf .bf-dh{font-family:var(--display,sans-serif);font-weight:700;letter-spacing:.24em;font-size:13px;color:#cfcfcf;text-transform:uppercase;margin:0 0 10px;text-align:left}
#bf .bf-all{display:block;margin-top:10px;text-align:right;color:#cfcfcf;font-size:13px;text-decoration:underline;text-underline-offset:3px}
@media (min-width:900px){
  #bf .bf-box{width:min(1120px,100%);display:grid;grid-template-columns:1.15fr 1fr;gap:34px;align-items:center;text-align:left}
  #bf .bf-brand,#bf .bf-cd,#bf .bf-cta{justify-content:flex-start}
  #bf .bf-kicker{padding-left:0}
  #bf .bf-sub{margin-left:0}
  #bf .bf-title{font-size:clamp(64px,min(10vw,15.5vh),150px)}
  #bf .bf-r{margin-top:0;padding-left:30px;border-left:1px solid rgba(255,255,255,.18)}
}
@media (max-width:720px){
  #bf .bf-deal .ph{flex:0 0 100px}
  #bf .bf-cd div{min-width:62px}
  #bf .bf-title .o{-webkit-text-stroke:1.5px #fff}
}
@media (prefers-reduced-motion:reduce){#bf,#bf .bf-box{transition:none}#bf .bf-title .f{animation:none}}`;

  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  const dealHTML = deals.map(i => `
    <a class="bf-deal" href="${esc(i.u)}">
      <div class="ph"><img src="img/${esc(i.img)}" alt="${esc(i.t)}" loading="lazy"><span class="save">SAVE ${R(i.was - i.p)}</span></div>
      <div class="tx"><div class="t">${esc(i.t)}</div><div class="p">${R(i.p)}<s>${R(i.was)}</s></div></div>
    </a>`).join("");

  const box = document.createElement("div");
  box.id = "bf";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-label", "Siray Tech Black Friday sale");
  box.innerHTML = `
  <div class="bf-box">
    <button class="bf-x" type="button" aria-label="Close">×</button>
    <div class="bf-l">
    <div class="bf-brand"><img src="img/logo.png" alt=""><span>Siray Tech</span></div>
    <div class="bf-kicker">BUILD • PERFORM • ELEVATE</div>
    <h2 class="bf-title"><span class="o">Black</span><br><span class="f">Friday</span></h2>
    <p class="bf-sub"><b>Black Friday prices are live.</b> Tested gaming PCs, monitors, storage and gear, cleaned and shown working before you pay. Most items are one-offs: when it's gone, it's gone.</p>
    <div class="bf-cdl" id="bfLabel"></div>
    <div class="bf-cd" id="bfCd"><div><b>0</b><small>Days</small></div><div><b>0</b><small>Hrs</small></div><div><b>0</b><small>Min</small></div><div><b>0</b><small>Sec</small></div></div>
    <div class="bf-cta">
      <a class="bf-btn solid" href="#shop" data-go="stock" id="bfShop">Shop the deals</a>
      <a class="bf-btn ghost" href="${WA}" target="_blank" rel="noopener">WhatsApp us</a>
    </div>
    <div class="bf-fine">Sale runs until Monday 30 November 2026 or while stock lasts. Collect in Centurion or courier anywhere in SA.</div>
    </div>
    ${deals.length ? `<div class="bf-r"><div class="bf-dh">Black Friday deals</div><div class="bf-deals">${dealHTML}</div><a class="bf-all" href="#shop" data-go="stock">See everything in stock →</a></div>` : ""}
  </div>`;

  const bar = document.createElement("div");
  bar.id = "bfbar";
  bar.innerHTML = `<b>BLACK FRIDAY</b><span id="bfBarTx"></span> · <u>See the deals</u><button class="x" type="button" aria-label="Hide sale bar">×</button>`;

  const header = document.querySelector("header");
  (header && header.parentNode ? header.parentNode.insertBefore(bar, header) : document.body.prepend(bar));
  document.body.appendChild(box);

  const pad = n => String(n).padStart(2, "0");
  function tick() {
    const now = Date.now();
    if (now > END.getTime()) { box.remove(); bar.remove(); document.body.classList.remove("bf-lock"); clearInterval(timer); return; }
    const before = now < BF_DAY.getTime();
    const target = before ? BF_DAY.getTime() : END.getTime();
    let s = Math.max(0, Math.floor((target - now) / 1000));
    const d = Math.floor(s / 86400); s -= d * 86400;
    const h = Math.floor(s / 3600); s -= h * 3600;
    const m = Math.floor(s / 60); s -= m * 60;
    const v = [d, pad(h), pad(m), pad(s)];
    document.querySelectorAll("#bfCd b").forEach((b, k) => { b.textContent = v[k]; });
    document.getElementById("bfLabel").textContent = before ? "Early deals live now · Black Friday starts in" : "Sale ends in";
    document.getElementById("bfBarTx").textContent = before
      ? `Early deals live now · ${d}d ${pad(h)}h ${pad(m)}m to Black Friday`
      : `Sale ends in ${d}d ${pad(h)}h ${pad(m)}m`;
  }
  tick();
  const timer = setInterval(tick, 1000);

  let last = null;
  function open() {
    last = document.activeElement;
    box.style.display = "flex";
    document.body.classList.add("bf-lock");
    requestAnimationFrame(() => box.classList.add("show"));
    setTimeout(() => box.querySelector("#bfShop").focus({ preventScroll: true }), 50);
  }
  function close() {
    box.classList.remove("show");
    document.body.classList.remove("bf-lock");
    setTimeout(() => { box.style.display = "none"; }, 300);
    if (!barHidden()) bar.classList.add("on");
    try { sessionStorage.setItem("bf26seen", "1"); } catch (e) {}
    if (last && last.focus) last.focus({ preventScroll: true });
  }
  const barHidden = () => { try { return sessionStorage.getItem("bf26bar") === "0"; } catch (e) { return false; } };

  box.addEventListener("click", e => {
    if (e.target === box || e.target.closest(".bf-x") || e.target.closest("#bfShop") || e.target.closest(".bf-deal")) close();
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && box.classList.contains("show")) close(); });
  bar.addEventListener("click", e => {
    if (e.target.closest(".x")) { bar.classList.remove("on"); try { sessionStorage.setItem("bf26bar", "0"); } catch (x) {} return; }
    open();
  });

  let seen = false;
  try { seen = sessionStorage.getItem("bf26seen") === "1"; } catch (e) {}
  if (seen) { box.style.display = "none"; if (!barHidden()) bar.classList.add("on"); }
  else setTimeout(open, 350);
})();
