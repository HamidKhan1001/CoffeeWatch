/* Coffee Watch — UI logic (classic script; the 3D scene is the inline module in index.html) */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const money = n => '$' + (Math.round(n * 100) / 100).toFixed(n % 1 ? 2 : 0);
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };

  /* ---------- Data ---------- */
  window.ORIGINS = [
    { name: 'Yirgacheffe', country: 'Ethiopia', lat: 6.16, lon: 38.2, alt: '1,900–2,200 m', process: 'Washed', harvest: 'Nov – Jan', notes: ['Jasmine', 'Bergamot', 'Peach'], farm: 'Kochere smallholder co-op', score: 88.5 },
    { name: 'Huila', country: 'Colombia', lat: 2.5, lon: -75.6, alt: '1,600–1,900 m', process: 'Honey', harvest: 'Apr – Jun', notes: ['Red apple', 'Panela', 'Cacao'], farm: 'La Esperanza, Pitalito', score: 87.0 },
    { name: 'Nyeri', country: 'Kenya', lat: -0.42, lon: 36.95, alt: '1,700–1,950 m', process: 'Washed', harvest: 'Oct – Dec', notes: ['Blackcurrant', 'Grapefruit', 'Tomato leaf'], farm: 'Gatomboya factory', score: 89.0 },
    { name: 'Antigua', country: 'Guatemala', lat: 14.56, lon: -90.73, alt: '1,500–1,700 m', process: 'Washed', harvest: 'Jan – Mar', notes: ['Milk chocolate', 'Orange', 'Almond'], farm: 'Finca El Injerto', score: 86.5 },
    { name: 'Cerrado', country: 'Brazil', lat: -18.5, lon: -47.4, alt: '1,000–1,200 m', process: 'Natural', harvest: 'May – Sep', notes: ['Hazelnut', 'Caramel', 'Dark berry'], farm: 'Fazenda Santa Inês', score: 86.0 },
  ];
  const PRODUCTS = [
    { id: 'yirg', name: 'Yirgacheffe Kochere', origin: 'Ethiopia', roast: 'Light', notes: 'Jasmine · Bergamot · Peach', price: 22, c: '#d9a15c', tag: 'Bestseller' },
    { id: 'huila', name: 'Huila Honey', origin: 'Colombia', roast: 'Medium', notes: 'Red apple · Panela · Cacao', price: 19, c: '#c4623a', tag: '' },
    { id: 'nyeri', name: 'Nyeri AA', origin: 'Kenya', roast: 'Light', notes: 'Blackcurrant · Grapefruit', price: 24, c: '#8c2f3a', tag: 'New' },
    { id: 'antigua', name: 'Antigua Reserve', origin: 'Guatemala', roast: 'Medium', notes: 'Milk chocolate · Orange', price: 20, c: '#6f7d4f', tag: '' },
    { id: 'cerrado', name: 'Cerrado Natural', origin: 'Brazil', roast: 'Dark', notes: 'Hazelnut · Caramel', price: 18, c: '#4b3324', tag: '' },
    { id: 'gesha', name: 'Panama Gesha', origin: 'Panama', roast: 'Light', notes: 'Lychee · Jasmine · Honey', price: 48, c: '#e6c37a', tag: 'Limited' },
  ];

  /* ---------- Nav ---------- */
  const nav = $('#nav');
  addEventListener('scroll', () => nav.classList.toggle('solid', scrollY > 30), { passive: true });
  $('#burger').onclick = () => nav.classList.toggle('open');
  $$('.nav-links a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));

  const observe = () => {};

  /* ---------- Origins ---------- */
  const oList = $('#originList'), oCard = $('#originCard');
  ORIGINS.forEach((o, i) => { const b = document.createElement('button'); b.className = 'chip' + (i ? '' : ' on'); b.role = 'tab'; b.textContent = o.country; b.onclick = () => pickOrigin(i); oList.appendChild(b); });
  function pickOrigin(i) {
    const o = ORIGINS[i]; $$('.chip', oList).forEach((c, j) => c.classList.toggle('on', i === j));
    oCard.innerHTML = `<div class="oc-head"><h3>${o.name}<small>${o.country}</small></h3><span class="score"><b>${o.score}</b> SCA</span></div>
      <div class="oc-grid"><div><span>Farm</span><b>${o.farm}</b></div><div><span>Altitude</span><b>${o.alt}</b></div><div><span>Process</span><b>${o.process}</b></div><div><span>Harvest</span><b>${o.harvest}</b></div></div>
      <div class="notes">${o.notes.map(n => `<i>${n}</i>`).join('')}</div>`;
    dispatchEvent(new CustomEvent('origin', { detail: { index: i } }));
  }
  pickOrigin(0);

  /* ---------- Cart ---------- */
  let cart = store.get('cw-cart', {});
  const drawer = $('#drawer'), scrim = $('#scrim');
  const toastEl = $('#toast'); let toastT;
  const toast = m => { toastEl.textContent = m; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 2600); };
  const openCart = o => { drawer.classList.toggle('open', o); scrim.classList.toggle('show', o); };
  $('#cartBtn').onclick = () => openCart(true); $('#closeCart').onclick = scrim.onclick = () => openCart(false);
  function renderCart() {
    const ids = Object.keys(cart).filter(k => cart[k] > 0); let total = 0, count = 0;
    $('#cartItems').innerHTML = ids.length ? ids.map(id => { const p = PRODUCTS.find(x => x.id === id), q = cart[id]; total += p.price * q; count += q;
      return `<div class="ci"><img class="ci-bag" src="assets/${p.id}.jpg" alt=""><div><b>${p.name}</b><small>${p.origin} · 250 g</small><div class="qty"><button data-d="-1" data-id="${id}">−</button><span>${q}</span><button data-d="1" data-id="${id}">+</button></div></div><b>${money(p.price * q)}</b></div>`; }).join('') : '<p class="empty">Your cart is empty.<br>Fresh roasts are waiting.</p>';
    $('#cartTotal').textContent = money(total); $('#cartCount').textContent = count;
    const left = 40 - total; $('#shipMsg').innerHTML = left > 0 ? `You’re <b>${money(left)}</b> away from free shipping` : '🎉 Free shipping unlocked';
    $('#shipFill').style.width = Math.min(100, total / 40 * 100) + '%'; store.set('cw-cart', cart);
  }
  $('#cartItems').addEventListener('click', e => { const b = e.target.closest('button[data-id]'); if (!b) return; cart[b.dataset.id] = Math.max(0, (cart[b.dataset.id] || 0) + +b.dataset.d); renderCart(); });
  $('#checkout').onclick = () => { if (!Object.values(cart).some(Boolean)) return toast('Add a roast first'); toast('Demo storefront — checkout is not connected'); };
  const addToCart = id => { cart[id] = (cart[id] || 0) + 1; renderCart(); toast(PRODUCTS.find(p => p.id === id).name + ' added'); };

  /* ---------- Shop ---------- */
  const grid = $('#productGrid'), filters = $('#shopFilters'); let filter = 'All';
  ['All', 'Light', 'Medium', 'Dark'].forEach(f => { const b = document.createElement('button'); b.className = 'chip' + (f === 'All' ? ' on' : ''); b.textContent = f; b.onclick = () => { filter = f; $$('.chip', filters).forEach(c => c.classList.toggle('on', c === b)); renderShop(); }; filters.appendChild(b); });
  function renderShop() {
    grid.innerHTML = PRODUCTS.filter(p => filter === 'All' || p.roast === filter).map(p => `
      <article class="product reveal" style="--c:${p.c}">
        <div class="p-art"><img src="assets/${p.id==="gesha"?"gesha":p.id==="yirg"?"yirg":p.id}.jpg" alt="${p.name} coffee bag" loading="lazy">${p.tag ? `<span class="p-tag">${p.tag}</span>` : ''}</div>
        <div class="p-info"><div><h3>${p.name}</h3><p>${p.notes}</p><span class="meta">${p.roast} roast · 250 g</span></div>
          <div class="p-buy"><b>${money(p.price)}</b><button class="btn primary sm" data-add="${p.id}">Add</button></div></div>
      </article>`).join('');
    observe();
    $$('.product').forEach(c => { c.onpointermove = e => { const r = c.getBoundingClientRect(); c.style.setProperty('--rx', ((e.clientY - r.top) / r.height - 0.5) * -10 + 'deg'); c.style.setProperty('--ry', ((e.clientX - r.left) / r.width - 0.5) * 10 + 'deg'); }; c.onpointerleave = () => { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); }; });
  }
  grid.addEventListener('click', e => { const b = e.target.closest('[data-add]'); if (b) addToCart(b.dataset.add); });
  renderShop(); renderCart();

  /* ---------- Brew Lab: recipe + timer ---------- */
  const METHODS = {
    Espresso: { ratio: 2, temp: 93, time: 28, grind: 'Fine', dose: 18, min: 14, max: 22 },
    'Pour-over': { ratio: 16, temp: 94, time: 180, grind: 'Medium-fine', dose: 20, min: 12, max: 40 },
    AeroPress: { ratio: 13, temp: 90, time: 120, grind: 'Medium', dose: 15, min: 10, max: 22 },
    'French press': { ratio: 12, temp: 96, time: 240, grind: 'Coarse', dose: 30, min: 20, max: 40 },
  };
  let method = 'Espresso', rating = 0, elapsed = 0, running = false, raf, startAt = 0;
  const mc = $('#methodChips'), dose = $('#dose'), C = 2 * Math.PI * 70, fg = $('#trFg');
  fg.style.strokeDasharray = C;
  $('#trTicks').innerHTML = Array.from({ length: 60 }, (_, i) => { const a = i / 60 * 6.283, l = i % 5 ? 3 : 7; return `<line x1="${80 + Math.sin(a) * 78}" y1="${80 - Math.cos(a) * 78}" x2="${80 + Math.sin(a) * (78 - l)}" y2="${80 - Math.cos(a) * (78 - l)}"/>`; }).join('');
  const mmss = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  Object.keys(METHODS).forEach(m => { const b = document.createElement('button'); b.className = 'chip' + (m === method ? ' on' : ''); b.textContent = m; b.onclick = () => { method = m; const d = METHODS[m]; dose.min = d.min; dose.max = d.max; dose.value = d.dose; $$('.chip', mc).forEach(c => c.classList.toggle('on', c === b)); resetTimer(); calc(); }; mc.appendChild(b); });
  function calc() {
    const m = METHODS[method], d = +dose.value;
    $('#doseVal').textContent = d + ' g'; $('#outWater').textContent = Math.round(d * m.ratio) + ' g'; $('#outRatio').textContent = '1 : ' + m.ratio; $('#outTemp').textContent = m.temp + ' °C'; $('#outGrind').textContent = m.grind;
    $('#timerTarget').textContent = 'target ' + mmss(m.time).replace(/^0/, '');
    dose.style.setProperty('--p', (d - dose.min) / (dose.max - dose.min) * 100 + '%');
  }
  dose.min = METHODS[method].min; dose.max = METHODS[method].max; dose.oninput = calc; calc();
  function paint() { const tgt = METHODS[method].time; $('#timerRead').textContent = mmss(elapsed); fg.style.strokeDashoffset = C * (1 - Math.min(1, elapsed / tgt)); fg.classList.toggle('good', Math.abs(elapsed - tgt) <= tgt * 0.1); fg.classList.toggle('over', elapsed > tgt * 1.1); }
  function tick() { elapsed = (performance.now() - startAt) / 1000; paint(); if (running) raf = requestAnimationFrame(tick); }
  function resetTimer() { running = false; cancelAnimationFrame(raf); elapsed = 0; $('#timerStart').textContent = 'Start'; paint(); }
  $('#timerStart').onclick = e => { if (running) { running = false; cancelAnimationFrame(raf); e.target.textContent = 'Resume'; } else { running = true; startAt = performance.now() - elapsed * 1000; e.target.textContent = 'Pause'; tick(); } };
  $('#timerReset').onclick = resetTimer;
  const starsEl = $('#stars');
  starsEl.innerHTML = [1, 2, 3, 4, 5].map(n => `<button data-n="${n}" aria-label="${n} stars">★</button>`).join('');
  starsEl.onclick = e => { const b = e.target.closest('button'); if (!b) return; rating = +b.dataset.n; $$('button', starsEl).forEach((s, i) => s.classList.toggle('on', i < rating)); };
  let log = store.get('cw-log', []);
  function renderLog() { $('#brewLog').innerHTML = log.length ? log.slice(0, 4).map(l => `<li><b>${l.m}</b><span>${l.d} g → ${l.w} g · ${mmss(l.t)}</span><em>${'★'.repeat(l.r)}${'☆'.repeat(5 - l.r)}</em></li>`).join('') : '<li class="muted">No brews logged yet — run the timer and log your first.</li>'; }
  $('#timerLog').onclick = () => { if (elapsed < 1) return toast('Run the timer first'); running = false; cancelAnimationFrame(raf); $('#timerStart').textContent = 'Start'; const d = +dose.value; log.unshift({ m: method, d, w: Math.round(d * METHODS[method].ratio), t: elapsed, r: rating || 4 }); log = log.slice(0, 20); store.set('cw-log', log); renderLog(); toast('Brew logged'); resetTimer(); };
  renderLog();

  /* ---------- Roast watch ---------- */
  const CAP = 12000;
  let batches = store.get('cw-batches', null) || [
    { id: 'b1', name: 'Yirgacheffe Kochere', lot: '#214', age: 2, stock: 8400 },
    { id: 'b2', name: 'Huila Honey', lot: '#211', age: 9, stock: 5200 },
    { id: 'b3', name: 'Nyeri AA', lot: '#207', age: 17, stock: 1750 },
    { id: 'b4', name: 'Cerrado Natural', lot: '#198', age: 26, stock: 3100 },
  ];
  function renderBatches() {
    $('#batches').innerHTML = batches.map(b => {
      const st = b.age < 4 ? ['Resting', 'rest'] : b.age <= 21 ? ['Peak', 'peak'] : ['Fading', 'fade'], low = b.stock < 2000;
      return `<div class="batch"><div class="b-top"><div><b>${b.name}</b><small>Lot ${b.lot} · day ${b.age}</small></div><span class="pill ${st[1]}">${st[0]}</span></div>
        <div class="fresh"><i class="zone" style="left:${4 / 28 * 100}%;width:${17 / 28 * 100}%"></i><i class="dot" style="left:${Math.min(100, b.age / 28 * 100)}%"></i></div>
        <div class="b-stock"><div class="stock"><i style="width:${b.stock / CAP * 100}%" class="${low ? 'low' : ''}"></i></div><span>${(b.stock / 1000).toFixed(2).replace(/\.?0+$/, '')} kg${low ? ' · <u>low</u>' : ''}</span></div>
        <div class="b-act"><button class="mini" data-act="sell" data-id="${b.id}">− 250 g</button><button class="mini" data-act="roast" data-id="${b.id}">Log roast +5 kg</button></div></div>`; }).join('');
  }
  $('#batches').addEventListener('click', e => { const t = e.target.closest('[data-act]'); if (!t) return; const b = batches.find(x => x.id === t.dataset.id);
    if (t.dataset.act === 'sell') b.stock = Math.max(0, b.stock - 250); else { b.stock = Math.min(CAP, b.stock + 5000); b.age = 0; toast(`Roast logged for ${b.name}`); }
    store.set('cw-batches', batches); renderBatches(); });
  renderBatches();

  /* ---------- Throughput bars ---------- */
  const H = [20, 48, 86, 74, 52, 40, 58, 66, 44, 30, 18];
  $('#bars').innerHTML = H.map((h, i) => `<div class="bar${i === 2 || i === 3 ? ' hot' : ''}" style="--h:${h}%;--i:${i}"><i></i><span>${Math.round(h * 0.34)}</span></div>`).join('');

  /* ---------- Subscription ---------- */
  const FREQ = [['Weekly', 7], ['Every 2 weeks', 14], ['Monthly', 30]], SIZE = [['250 g', 20], ['500 g', 37], ['1 kg', 68]], ROAST = ['Light', 'Medium', 'Dark', 'Surprise me'];
  const sub = { f: 1, s: 0, r: 3 };
  const mk = (el, arr, key, lab) => { const box = $(el); arr.forEach((a, i) => { const b = document.createElement('button'); b.className = 'chip'; b.textContent = lab(a); b.onclick = () => { sub[key] = i; subRender(); }; box.appendChild(b); }); };
  mk('#subFreq', FREQ, 'f', a => a[0]); mk('#subSize', SIZE, 's', a => a[0]); mk('#subRoast', ROAST, 'r', a => a);
  function subRender() {
    ['#subFreq:f', '#subSize:s', '#subRoast:r'].forEach(x => { const [el, k] = x.split(':'); $$('.chip', $(el)).forEach((c, i) => c.classList.toggle('on', sub[k] === i)); });
    const base = SIZE[sub.s][1]; $('#subWas').textContent = money(base); $('#subPrice').textContent = money(base * 0.9);
    const d = new Date(Date.now() + 2 * 864e5); $('#subNext').textContent = `First roast ships ${d.toLocaleDateString('en-US', { weekday: 'long' })} · then ${FREQ[sub.f][0].toLowerCase()}`;
  }
  subRender();
  $('#subGo').onclick = () => toast(`Subscribed: ${SIZE[sub.s][0]} · ${FREQ[sub.f][0]} · ${ROAST[sub.r]} (demo)`);
  $('#newsForm').onsubmit = e => { e.preventDefault(); e.target.reset(); toast('Welcome to the morning list ☕'); };

  /* ---------- Immersive 3D film: hide header, keep slim HUD ---------- */
  (() => {
    const film = $('#film'); if (!film) return;
    const body = document.body;
    let ticking = false;
    const update = () => {
      ticking = false;
      const r = film.getBoundingClientRect();
      const on = r.top <= 8 && r.bottom >= innerHeight - 8;
      body.classList.toggle('immersive', on);
      if (!on) { body.classList.remove('show-nav'); const m = $('#hudMenu'); if (m) m.setAttribute('aria-expanded', 'false'); }
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update); addEventListener('loader-done', update); update();

    const menu = $('#hudMenu');
    menu.onclick = () => { const o = body.classList.toggle('show-nav'); menu.setAttribute('aria-expanded', String(o)); };
    $('#hudCart').onclick = () => $('#cartBtn').click();
    const count = $('#cartCount'), hc = $('#hudCount');
    new MutationObserver(() => { hc.textContent = count.textContent; }).observe(count, { childList: true, characterData: true, subtree: true });
    hc.textContent = count.textContent;

    const full = $('#hudFull');
    if (!document.fullscreenEnabled && !document.webkitFullscreenEnabled) full.style.display = 'none';
    full.onclick = () => {
      const el = document.documentElement;
      if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
    };
  })();
})();
