// ARUNIKA — Statistik Indonesia. Router hash + grafik SVG buatan sendiri (tanpa library).
const D = window.ARUNIKA;
const app = document.getElementById('app');
const fmt = (n, d = 2) => n.toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// ---------- grafik SVG ----------
function lineChart(series, opts = {}) {
  const W = 720, H = 300, L = 52, R = 18, T = 22, B = 34;
  const vals = series.map((p) => p.value);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = (hi - lo || 1) * 0.15; lo -= pad; hi += pad;
  const X = (i) => L + (i * (W - L - R)) / (series.length - 1);
  const Y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const grid = [0.25, 0.5, 0.75].map((f) => {
    const v = lo + (hi - lo) * f, y = Y(v);
    return `<line class="gridline" x1="${L}" y1="${y}" x2="${W - R}" y2="${y}"/>` +
      `<text class="tick" x="${L - 6}" y="${y + 4}" text-anchor="end">${fmt(v, 1)}</text>`;
  }).join('');
  const pts = series.map((p, i) => `${X(i).toFixed(1)},${Y(p.value).toFixed(1)}`).join(' ');
  const area = `M ${X(0).toFixed(1)},${Y(series[0].value).toFixed(1)} ` +
    series.slice(1).map((p, i) => `L ${X(i + 1).toFixed(1)},${Y(p.value).toFixed(1)}`).join(' ') +
    ` L ${X(series.length - 1).toFixed(1)},${H - B} L ${X(0).toFixed(1)},${H - B} Z`;
  const dots = series.map((p, i) => {
    const hl = opts.highlight === p.year;
    return `<circle class="dot" cx="${X(i)}" cy="${Y(p.value)}" r="${hl ? 7 : 5}" data-tip="${p.year}: ${fmt(p.value)}${opts.unit || ''}">` +
      `<title>${p.year}: ${fmt(p.value)}${opts.unit || ''}</title></circle>` +
      `<text class="vlabel" x="${X(i)}" y="${Y(p.value) - 11}" text-anchor="middle">${fmt(p.value)}</text>`;
  }).join('');
  const labels = series.map((p, i) =>
    `<text class="tick" x="${X(i)}" y="${H - 10}" text-anchor="middle">${p.year}</text>`).join('');
  return `<div class="tip"><svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik garis ${opts.label || ''}">
    ${grid}<path class="area" d="${area}"/><polyline class="line" points="${pts}"/>${dots}${labels}
    <line class="axis" x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}"/></svg>
    <div class="tipbox"></div></div>`;
}

function barChart(items, opts = {}) {
  const W = 720, H = 300, L = 150, R = 60, T = 14, B = 14;
  const max = Math.max(...items.map((i) => i.value)) * 1.08;
  const rowH = (H - T - B) / items.length;
  const bars = items.map((it, i) => {
    const y = T + i * rowH + 5, bw = (it.value / max) * (W - L - R);
    return `<text class="tick" x="${L - 8}" y="${y + 15}" text-anchor="end" style="font-size:12.5px;fill:#22302A">${esc(it.name)}</text>` +
      `<rect class="bar${i === 0 ? ' hl' : ''}" x="${L}" y="${y}" width="${Math.max(bw, 2)}" height="${rowH - 12}" rx="4" data-tip="${esc(it.name)}: ${fmt(it.value)}${opts.unit || ''}">` +
      `<title>${esc(it.name)}: ${fmt(it.value)}${opts.unit || ''}</title></rect>` +
      `<text class="vlabel" x="${L + bw + 8}" y="${y + 15}">${fmt(it.value)}${opts.unit || ''}</text>`;
  }).join('');
  return `<div class="tip"><svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik batang ${opts.label || ''}">${bars}</svg>
    <div class="tipbox"></div></div>`;
}

// tooltip hover sederhana: delegasi pada elemen ber-data-tip
document.addEventListener('mouseover', (e) => {
  const t = e.target.closest('[data-tip]');
  const box = t && t.closest('.tip') ? t.closest('.tip').querySelector('.tipbox') : null;
  if (box) { box.textContent = t.getAttribute('data-tip'); box.style.display = 'block';
    const r = t.getBoundingClientRect(), pr = box.parentElement.getBoundingClientRect();
    box.style.left = Math.min(Math.max(r.left - pr.left, 0), pr.width - 110) + 'px';
    box.style.top = Math.max(r.top - pr.top - 30, 0) + 'px'; }
});
document.addEventListener('mouseout', (e) => {
  const box = e.target.closest && e.target.closest('.tip') ? e.target.closest('.tip').querySelector('.tipbox') : null;
  if (box) box.style.display = 'none';
});

// ---------- potongan bersama ----------
const parang = (cls) => `<div class="parang ${cls}" aria-hidden="true"></div>`;
const srcNote = (t) => `<p class="src-note">Sumber: ${t} — Badan Pusat Statistik (BPS), bps.go.id. Angka dibulatkan.</p>`;
const navCards = [
  { r: '#/penduduk', t: 'Penduduk', d: '281,60 juta jiwa dan komposisi usianya.' },
  { r: '#/ekonomi', t: 'Ekonomi', d: 'PDB, inflasi, dan perdagangan luar negeri.' },
  { r: '#/kesejahteraan', t: 'Kesejahteraan', d: 'IPM, kemiskinan, dan pengangguran.' },
  { r: '#/provinsi', t: 'Provinsi', d: '15 provinsi terpadat, bisa dicari dan dibandingkan.' },
].map((c) => `<a class="nav-card" href="${c.r}"><h3>${c.t} →</h3><p>${c.d}</p></a>`).join('');

// ---------- state ----------
let popYear = 2024;
let ecoTab = 'pdb';
let sortKey = 'pop', sortDir = -1;
let query = '';
const compare = new Set();

// ---------- halaman ----------
function viewHome() {
  const kpis = D.kpi.map((k) => `<a class="kpi" href="${k.route}">
    <div class="k-label">${k.label}</div>
    <div class="k-value">${k.value} <span>${k.unit}</span></div>
    <div class="k-note">${k.note}</div></a>`).join('');
  const top5 = [...D.provinces].sort((a, b) => b.pop - a.pop).slice(0, 5)
    .map((p) => ({ name: p.name, value: p.pop }));
  return `
  <div class="hero"><div class="wrap">
    <span class="badge">Data resmi BPS · Tahun 2024</span>
    <h1>Indonesia dalam angka — <em>data resmi, dijelaskan dengan jernih.</em></h1>
    <p class="lede">ARUNIKA menyajikan statistik nasional Indonesia: penduduk, ekonomi, kesejahteraan,
    dan provinsi — dari publikasi Badan Pusat Statistik, dirangkum agar mudah dibaca siapa pun.</p>
    <div class="hero-cta">
      <a class="btn" href="#/penduduk">Jelajahi penduduk</a>
      <a class="btn ghost" href="#/ekonomi">Lihat ekonomi</a>
      <a class="btn ghost" href="#/tentang">Tentang data ini</a>
    </div>
    <p class="meta-line" style="margin-top:18px">Diperbarui November 2026 · Sumber: BPS (bps.go.id)</p>
  </div></div>${parang('gold')}
  <section class="block"><div class="wrap">
    <h2>Angka kunci 2024</h2>
    <p class="sub">Delapan indikator utama Indonesia tahun 2024. Klik sebuah kartu untuk melihat detailnya.</p>
    <div class="kpi-grid">${kpis}</div>
  </div></section>
  <section class="block"><div class="wrap"><div class="grid-2">
    <div class="card"><h3>Pertumbuhan ekonomi 2019–2024</h3>
      <p class="hint">PDB tumbuh 5,03% pada 2024 — pulih penuh dari kontraksi pandemi 2020.</p>
      ${lineChart(D.growth, { unit: '%', label: 'pertumbuhan ekonomi' })}
      ${srcNote('Berita Resmi Statistik BPS')}</div>
    <div class="card"><h3>Provinsi terpadat</h3>
      <p class="hint">Lima provinsi dengan penduduk terbanyak, 2024 (juta jiwa).</p>
      ${barChart(top5, { unit: ' jt', label: 'provinsi terpadat' })}
      <p class="hint" style="margin-top:8px">Jawa Barat sendiri menampung hampir 18% penduduk Indonesia.
      <a href="#/provinsi">Lihat 15 provinsi →</a></p></div>
  </div></div></section>
  <section class="block"><div class="wrap">
    <h2>Jelajahi berdasarkan topik</h2>
    <p class="sub">Empat pintu masuk ke data nasional.</p>
    <div class="nav-cards">${navCards}</div>
  </div></section>`;
}

function viewPenduduk() {
  const y = D.populationByYear[popYear];
  const buttons = D.years.map((yr) =>
    `<button data-year="${yr}" class="${yr === popYear ? 'on' : ''}">${yr}</button>`).join('');
  const ages = [
    { label: '0–14 tahun', v: y.age014, cls: '' },
    { label: '15–64 tahun', v: y.age1564, cls: 'c2' },
    { label: '65+ tahun', v: y.age65, cls: 'c3' },
  ].map((a) => `<div class="age-row"><span>${a.label}</span>
    <div class="age-track"><div class="age-fill ${a.cls}" style="width:${a.v}%"></div></div>
    <b>${fmt(a.v, 1)}%</b></div>`).join('');
  const top10 = [...D.provinces].sort((a, b) => b.pop - a.pop).slice(0, 10)
    .map((p, i) => `<tr><td>${i + 1}</td><td>${p.name}</td><td class="num">${fmt(p.pop)}</td></tr>`).join('');
  return `
  <section class="block"><div class="wrap">
    <h2>Penduduk Indonesia</h2>
    <p class="sub">Jumlah dan komposisi penduduk menurut proyeksi BPS. Pilih tahun untuk melihat perubahannya.</p>
    <div class="controls"><span class="checkline">Tahun:</span>
      <div class="seg" id="yearSeg">${buttons}</div></div>
    <div class="grid-3">
      <div class="card"><div class="k-label" style="font-size:13px;text-transform:uppercase;letter-spacing:.8px;color:var(--muted)">Jumlah penduduk ${popYear}</div>
        <div class="k-value" style="font-family:Georgia,serif;font-size:38px;color:var(--forest)">${fmt(y.total)} <span style="font-size:16px;color:var(--terra)">juta jiwa</span></div>
        <p class="hint">Negara keempat terpadat di dunia.</p></div>
      <div class="card"><div class="k-label" style="font-size:13px;text-transform:uppercase;letter-spacing:.8px;color:var(--muted)">Usia produktif (15–64)</div>
        <div class="k-value" style="font-family:Georgia,serif;font-size:38px;color:var(--forest)">${fmt(y.age1564, 1)}%</div>
        <p class="hint">Bonus demografi: mayoritas penduduk berada di usia kerja.</p></div>
      <div class="card"><div class="k-label" style="font-size:13px;text-transform:uppercase;letter-spacing:.8px;color:var(--muted)">Kepadatan penduduk</div>
        <div class="k-value" style="font-family:Georgia,serif;font-size:38px;color:var(--forest)">${y.density} <span style="font-size:16px;color:var(--terra)">jiwa/km²</span></div>
        <p class="hint">Rata-rata nasional ${popYear}.</p></div>
    </div>
    <div class="grid-2">
      <div class="card"><h3>Pertumbuhan penduduk 2019–2024</h3>
        <p class="hint">Juta jiwa. Tahun terpilih (${popYear}) ditandai dengan titik lebih besar.</p>
        ${lineChart(D.population, { unit: ' jt', highlight: popYear, label: 'populasi' })}
        ${srcNote('Statistik Indonesia 2025, BPS')}</div>
      <div class="card"><h3>Komposisi usia ${popYear}</h3>
        <p class="hint">Pangsa penduduk menurut kelompok umur.</p>${ages}
        <p class="hint" style="margin-top:14px">Penduduk lanjut usia (65+) terus naik: dari 6,7% pada 2019
        menjadi 7,2% pada 2024 — Indonesia perlahan menua.</p></div>
    </div>
    <div class="card"><h3>10 provinsi terpadat ${popYear}</h3>
      <p class="hint">Juta jiwa. Tiga provinsi di Jawa menampung lebih dari separuh penduduk Indonesia.</p>
      <table class="data"><thead><tr><th>#</th><th>Provinsi</th><th class="num">Penduduk (juta)</th></tr></thead>
      <tbody>${top10}</tbody></table>
      <p class="hint" style="margin-top:10px"><a href="#/provinsi">Buka tabel lengkap 15 provinsi →</a></p></div>
  </div></section>`;
}

function viewEkonomi() {
  const tabs = [['pdb', 'PDB per sektor'], ['inflasi', 'Inflasi'], ['ekspor', 'Ekspor–Impor']]
    .map(([k, l]) => `<button data-tab="${k}" class="${ecoTab === k ? 'on' : ''}">${l}</button>`).join('');
  let chartHtml = '';
  if (ecoTab === 'pdb') {
    chartHtml = `<h3>PDB menurut lapangan usaha, 2024</h3>
      <p class="hint">Pangsa terhadap PDB (%). Manufaktur tetap penyumbang terbesar.</p>
      ${barChart(D.sectors, { unit: '%', label: 'PDB per sektor' })}`;
  } else if (ecoTab === 'inflasi') {
    chartHtml = `<h3>Inflasi tahunan 2019–2024</h3>
      <p class="hint">Inflasi year-on-year (%). Puncaknya 5,51% pada 2022, lalu turun ke 1,57% pada 2024.</p>
      ${lineChart(D.inflation, { unit: '%', label: 'inflasi' })}`;
  } else {
    chartHtml = `<h3>Perdagangan luar negeri 2024</h3>
      <p class="hint">Miliar dolar AS. Neraca perdagangan surplus lima tahun berturut-turut.</p>
      ${barChart([
        { name: 'Ekspor', value: D.trade.exports },
        { name: 'Impor', value: D.trade.imports },
        { name: 'Surplus', value: D.trade.surplus },
      ], { unit: ' mld US$', label: 'ekspor impor' })}`;
  }
  return `
  <section class="block"><div class="wrap">
    <h2>Ekonomi Indonesia</h2>
    <p class="sub">PDB Rp22.139 triliun dengan pertumbuhan 5,03% pada 2024. Pilih metrik untuk mengganti grafik.</p>
    <div class="controls"><div class="tabs" id="ecoTabs">${tabs}</div></div>
    <div class="grid-3">
      <div class="card"><div class="k-label" style="font-size:13px;text-transform:uppercase;letter-spacing:.8px;color:var(--muted)">Ekspor 2024</div>
        <div class="k-value" style="font-family:Georgia,serif;font-size:32px;color:var(--forest)">US$${fmt(D.trade.exports)} <span style="font-size:15px;color:var(--terra)">miliar</span></div></div>
      <div class="card"><div class="k-label" style="font-size:13px;text-transform:uppercase;letter-spacing:.8px;color:var(--muted)">Impor 2024</div>
        <div class="k-value" style="font-family:Georgia,serif;font-size:32px;color:var(--forest)">US$${fmt(D.trade.imports)} <span style="font-size:15px;color:var(--terra)">miliar</span></div></div>
      <div class="card"><div class="k-label" style="font-size:13px;text-transform:uppercase;letter-spacing:.8px;color:var(--muted)">Surplus perdagangan</div>
        <div class="k-value" style="font-family:Georgia,serif;font-size:32px;color:var(--forest)">US$${fmt(D.trade.surplus)} <span style="font-size:15px;color:var(--terra)">miliar</span></div>
        <p class="hint">Cadangan devisa: US$${fmt(D.trade.reserves, 1)} miliar.</p></div>
    </div>
    <div class="card">${chartHtml}${srcNote('Berita Resmi Statistik BPS')}</div>
    <div class="card"><h3>Membaca ekonominya</h3>
      <p>Manufaktur (18,67%), perdagangan (12,97%), dan pertanian (12,48%) adalah tiga sektor terbesar.
      Inflasi 2024 yang rendah (1,57%) memberi ruang daya beli, sementara surplus perdagangan
      US$31,04 miliar ditopang ekspor komoditas dan manufaktur.</p></div>
  </div></section>`;
}

function viewKesejahteraan() {
  const cards = D.welfare.map((w) => `<div class="card">
    <div class="k-label" style="font-size:13px;text-transform:uppercase;letter-spacing:.8px;color:var(--muted)">${w.label}</div>
    <div class="k-value" style="font-family:Georgia,serif;font-size:34px;color:var(--forest)">${w.value} <span style="font-size:16px;color:var(--terra)">${w.unit}</span></div>
    <p class="hint">${w.note}</p></div>`).join('');
  return `
  <section class="block"><div class="wrap">
    <h2>Kesejahteraan</h2>
    <p class="sub">Kualitas hidup penduduk: pendidikan, kesehatan, kemiskinan, dan ketimpangan.</p>
    <div class="grid-3">${cards}</div>
    <div class="grid-2">
      <div class="card"><h3>Tingkat kemiskinan 2019–2024</h3>
        <p class="hint">Persen penduduk miskin. Sempat naik saat pandemi 2020, lalu turun ke 8,57% — terendah sepanjang sejarah.</p>
        ${lineChart(D.poverty, { unit: '%', label: 'kemiskinan' })}
        ${srcNote('Profil Kemiskinan di Indonesia, BPS')}</div>
      <div class="card"><h3>Tingkat pengangguran 2019–2024</h3>
        <p class="hint">Tingkat pengangguran terbuka (%). Dari 7,07% pada 2020 kembali ke 4,91% pada Agustus 2024.</p>
        ${lineChart(D.unemployment, { unit: '%', label: 'pengangguran' })}
        ${srcNote('Keadaan Ketenagakerjaan Agustus 2024, BPS')}</div>
    </div>
    <div class="card"><h3>Apa artinya?</h3>
      <p>IPM 75,02 menempatkan Indonesia pada kategori pembangunan manusia “Tinggi”. Tantangan terbesar
      yang tersisa: stunting balita masih 19,8% dan rata-rata lama sekolah 9,21 tahun — setara kelas 9 —
      masih di bawah target wajib belajar 12 tahun.</p></div>
  </div></section>`;
}

function density(p) { return Math.round((p.pop * 1e6) / p.area); }
function provinceRows() {
  let rows = D.provinces.map((p) => ({ ...p, density: density(p) }));
  if (query) {
    const q = query.toLowerCase();
    rows = rows.filter((p) => p.name.toLowerCase().includes(q));
  }
  const dir = sortDir;
  rows.sort((a, b) => {
    if (sortKey === 'name') return dir * a.name.localeCompare(b.name, 'id');
    return dir * (a[sortKey] - b[sortKey]);
  });
  return rows;
}
function renderProvinceTable() {
  const rows = provinceRows();
  const arrow = (k) => (sortKey === k ? (sortDir === 1 ? ' ▲' : ' ▼') : '');
  const body = rows.length ? rows.map((p) => `<tr>
    <td><input type="checkbox" data-compare="${esc(p.name)}" ${compare.has(p.name) ? 'checked' : ''} aria-label="Bandingkan ${esc(p.name)}"></td>
    <td>${esc(p.name)}</td>
    <td class="num">${fmt(p.pop)}</td>
    <td class="num">${p.area.toLocaleString('id-ID')}</td>
    <td class="num">${p.density.toLocaleString('id-ID')}</td></tr>`).join('')
    : `<tr><td colspan="5" class="empty">Tidak ada provinsi yang cocok dengan “${esc(query)}”.</td></tr>`;
  document.getElementById('provBody').innerHTML = body;
  document.querySelectorAll('#provTable th[data-sort]').forEach((th) => {
    th.innerHTML = th.dataset.label + `<span class="arrow">${arrow(th.dataset.sort)}</span>`;
  });
  const sel = [...compare].map((n) => D.provinces.find((p) => p.name === n)).filter(Boolean);
  const panel = document.getElementById('comparePanel');
  if (sel.length >= 2) {
    panel.style.display = 'block';
    panel.innerHTML = `<h3>Perbandingan: ${sel.map((p) => esc(p.name)).join(' vs ')}</h3>
      <p class="hint">Penduduk 2024 (juta jiwa). Pilih maksimal 3 provinsi.</p>
      ${barChart(sel.map((p) => ({ name: p.name, value: p.pop })), { unit: ' jt', label: 'perbandingan provinsi' })}
      <p class="hint">Kepadatan: ${sel.map((p) => `${esc(p.name)} ${density(p).toLocaleString('id-ID')} jiwa/km²`).join(' · ')}</p>`;
  } else {
    panel.style.display = 'none';
    panel.innerHTML = '';
  }
  document.getElementById('compareHint').textContent =
    compare.size === 0 ? 'Centang hingga 3 provinsi untuk membandingkannya.' :
    compare.size === 1 ? `1 provinsi dipilih — centang 1 lagi untuk melihat perbandingan.` :
    `${compare.size} provinsi dipilih untuk perbandingan.`;
}
function viewProvinsi() {
  return `
  <section class="block"><div class="wrap">
    <h2>Provinsi</h2>
    <p class="sub">15 provinsi terpadat di Indonesia, 2024. Klik judul kolom untuk mengurutkan, ketik untuk mencari,
    centang untuk membandingkan.</p>
    <div class="controls">
      <input class="search" id="provSearch" type="search" placeholder="Cari provinsi… (mis. Jawa)" value="${esc(query)}" aria-label="Cari provinsi">
      <button class="btn light small" id="csvBtn">Unduh data (CSV)</button>
      <span class="checkline" id="compareHint"></span>
    </div>
    <div class="card" style="padding:0;overflow-x:auto">
      <table class="data" id="provTable"><thead><tr>
        <th data-label="Bandingkan" style="cursor:default">Bandingkan</th>
        <th data-sort="name" data-label="Provinsi">Provinsi</th>
        <th data-sort="pop" data-label="Penduduk 2024 (juta)" class="num">Penduduk 2024 (juta)</th>
        <th data-sort="area" data-label="Luas (km²)" class="num">Luas (km²)</th>
        <th data-sort="density" data-label="Kepadatan (jiwa/km²)" class="num">Kepadatan (jiwa/km²)</th>
      </tr></thead><tbody id="provBody"></tbody></table>
    </div>
    <div class="compare-panel" id="comparePanel" style="display:none"></div>
    ${srcNote('Statistik Indonesia 2025, BPS — penduduk hasil proyeksi; luas wilayah menurut Kemendagri/BPS')}
  </div></section>`;
}

function viewTentang() {
  const srcs = D.sources.map((s) => `<li><b>${s.title}</b> — ${s.publisher}. ${s.note}</li>`).join('');
  const faqs = D.faq.map((f, i) => `<div class="faq-item">
    <button class="faq-q" data-faq="${i}" aria-expanded="false">${f.q}<span class="sign">+</span></button>
    <div class="faq-a">${f.a}</div></div>`).join('');
  return `
  <section class="block"><div class="wrap">
    <h2>Tentang ARUNIKA</h2>
    <p class="sub">Bagaimana situs ini dibuat dan dari mana datanya berasal.</p>
    <div class="card"><h3>Metodologi</h3>
      <p>ARUNIKA menyajikan ulang angka-angka resmi Badan Pusat Statistik (BPS) untuk Indonesia tahun 2024.
      Angka diambil dari publikasi Statistik Indonesia 2025, Berita Resmi Statistik, dan survei resmi BPS
      lainnya, lalu dibulatkan ke dua desimal agar mudah dibaca. Kepadatan penduduk dihitung sendiri dari
      penduduk dibagi luas wilayah. Situs ini berjalan sepenuhnya dari berkas statis — tidak ada pelacakan,
      tidak ada permintaan jaringan, dan seluruh data tersimpan di dalam situs.</p>
      <p><b>Catatan:</b> angka dibulatkan; lihat publikasi resmi BPS untuk detail, definisi, dan revisi terbaru.
      ARUNIKA bukan situs resmi BPS.</p></div>
    <div class="card"><h3>Sumber data</h3><ul>${srcs}</ul>
      <p class="hint" style="margin-top:10px">Situs resmi: <a href="https://www.bps.go.id">bps.go.id</a></p></div>
    <div class="card"><h3>Pertanyaan yang sering diajukan</h3>${faqs}</div>
  </div></section>`;
}

// ---------- router ----------
const routes = {
  '/': viewHome, '/penduduk': viewPenduduk, '/ekonomi': viewEkonomi,
  '/kesejahteraan': viewKesejahteraan, '/provinsi': viewProvinsi, '/tentang': viewTentang,
};
function route() {
  const path = (location.hash.replace(/^#/, '') || '/').split('?')[0];
  const view = routes[path] || viewHome;
  app.innerHTML = view();
  document.querySelectorAll('nav.links a').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('href') === '#' + (routes[path] ? path : '/'));
  });
  if (path === '/provinsi') {
    renderProvinceTable();
    document.getElementById('provSearch').addEventListener('input', (e) => { query = e.target.value; renderProvinceTable(); });
    document.getElementById('provTable').addEventListener('click', (e) => {
      const th = e.target.closest('th[data-sort]');
      if (th) {
        const k = th.dataset.sort;
        if (sortKey === k) sortDir *= -1; else { sortKey = k; sortDir = k === 'name' ? 1 : -1; }
        renderProvinceTable();
      }
    });
    document.getElementById('provTable').addEventListener('change', (e) => {
      const cb = e.target.closest('input[data-compare]');
      if (!cb) return;
      if (cb.checked) {
        if (compare.size >= 3) { cb.checked = false; alert('Maksimal 3 provinsi untuk perbandingan.'); return; }
        compare.add(cb.dataset.compare);
      } else compare.delete(cb.dataset.compare);
      renderProvinceTable();
    });
    document.getElementById('csvBtn').addEventListener('click', () => {
      const head = 'Provinsi,Penduduk 2024 (juta),Luas (km2),Kepadatan (jiwa/km2)';
      const lines = provinceRows().map((p) => `"${p.name}",${p.pop},${p.area},${p.density}`);
      const blob = new Blob([[head, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'arunika-provinsi-2024.csv';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
  }
  window.scrollTo(0, 0);
}

// delegasi klik: toggle tahun, tab ekonomi, FAQ, menu
document.addEventListener('click', (e) => {
  const yb = e.target.closest('#yearSeg button');
  if (yb) { popYear = Number(yb.dataset.year); route(); return; }
  const tb = e.target.closest('#ecoTabs button');
  if (tb) { ecoTab = tb.dataset.tab; route(); return; }
  const fq = e.target.closest('.faq-q');
  if (fq) {
    const item = fq.closest('.faq-item');
    const open = item.classList.toggle('open');
    fq.setAttribute('aria-expanded', String(open));
    fq.querySelector('.sign').textContent = open ? '−' : '+';
    return;
  }
  if (e.target.closest('#menuBtn')) {
    document.getElementById('navLinks').classList.toggle('open');
  }
});
window.addEventListener('hashchange', route);

// tombol kembali ke atas
const toTop = document.getElementById('toTop');
window.addEventListener('scroll', () => toTop.classList.toggle('show', window.scrollY > 400));
toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

route();
