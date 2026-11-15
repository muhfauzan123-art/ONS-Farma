/**
 * ONS FARMA DIGITAL ENTERPRISE v11.0
 * Modul Omnichannel Delivery Hub & WhatsApp CRM Broadcast (/gas-notifikasi-wa-crm)
 */
(function (global) {
  'use strict';

  const S = () => global.ONSStore;
  const API = () => global.ONSApi;

  const OMNI_STATUS_FLOW = {
    BARU: { badge: 'bpom-terbatas', label: 'BARU' },
    DIRACIK_APJ: { badge: 'bpom-prekursor', label: 'DIRACIK APJ' },
    SIAP_DIAMBIL: { badge: 'bpom-bebas', label: 'SIAP DIAMBIL' },
    SIAP_KIRIM: { badge: 'bpom-bebas', label: 'SIAP DIAMBIL' },
    DIKIRIM_KURIR: { badge: 'bpom-bebas', label: 'SIAP DIAMBIL' },
    SELESAI: { badge: 'bpom-bebas', label: 'SELESAI' },
    BATAL: { badge: 'bpom-keras', label: 'BATAL' }
  };

  let omniFilterStatus = 'SEMUA';
  let omniSearchQ = '';
  let crmTab = 'kontak';
  let crmFilterSeg = 'SEMUA';
  let crmSearchQ = '';

  function parseItemsJson(raw) {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw || '[]') : raw;
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  }

  function waHref(phone, text) {
    if (S().buildWaUrl) return S().buildWaUrl(phone, text);
    const clean = String(phone || '').replace(/[^0-9]/g, '');
    const p62 = clean.startsWith('0') ? ('62' + clean.slice(1)) : (clean.startsWith('62') ? clean : (clean ? ('62' + clean) : ''));
    const q = text ? ('?text=' + encodeURIComponent(text)) : '';
    return p62 ? ('https://wa.me/' + p62 + q) : ('https://wa.me/' + q);
  }

  async function refreshOmniOrders() {
    try {
      const res = await API().callApi('omni.list', {});
      S().AppState.omnichannelOrders = res.items || [];
      if (typeof global.renderActiveView === 'function') global.renderActiveView();
    } catch (e) { global.toast(e.message, 'err'); }
  }

  function loadOmniOrderToPos(idOrder) {
    const st = S().AppState;
    const ord = (st.omnichannelOrders || []).find((x) => x.id_order === idOrder);
    if (!ord) return;
    const parsedItems = parseItemsJson(ord.items_json);
    const cartItems = parsedItems.map((it) => {
      const obat = st.masterObat.find((o) => o.id_obat === it.id_obat) || {};
      const h1 = Number(obat.harga_jual_1 !== undefined && obat.harga_jual_1 !== '' ? obat.harga_jual_1 : (obat.harga_umum || 0));
      const s1 = String(obat.satuan_1 || obat.satuan_dasar || 'Unit').trim();
      const harga = Number(it.harga || it.harga_jual || h1 || 0);
      return {
        id_obat: it.id_obat || obat.id_obat || '',
        nama_dagang: it.nama || obat.nama_dagang || 'Produk E-Apotek',
        qty: Math.max(1, Number(it.qty || 1)),
        satuan: it.satuan || s1,
        faktor_konversi: Number(it.faktor_konversi || 1),
        harga_jual: harga
      };
    }).filter((x) => x.id_obat);

    const currentCart = st.carts[st.activeCartIdx];
    if (currentCart && currentCart.items.length > 0 && st.carts.length < 4) {
      st.carts.push({
        id: 'K' + (st.carts.length + 1),
        label: 'Online #' + String(ord.no_order || '').slice(-4),
        channel: ord.channel || 'E-Apotek Web',
        id_member: 'UMUM',
        id_order: ord.id_order,
        pelanggan_nama: ord.nama_pelanggan,
        no_wa: ord.no_wa,
        items: cartItems,
        diskon_global: 0
      });
      st.activeCartIdx = st.carts.length - 1;
    } else if (currentCart) {
      currentCart.label = 'Online #' + String(ord.no_order || '').slice(-4);
      currentCart.channel = ord.channel || 'E-Apotek Web';
      currentCart.id_order = ord.id_order;
      currentCart.pelanggan_nama = ord.nama_pelanggan;
      currentCart.no_wa = ord.no_wa;
      currentCart.items = cartItems;
      currentCart.diskon_global = 0;
    }

    global.toast('Order ' + ord.no_order + ' dimuat ke Kasir POS. Lanjutkan verifikasi & pembayaran.', 'ok');
    if (typeof global.navigateView === 'function') global.navigateView('pos');
  }

  function openNewOmniOrderModal() {
    const obatOpts = S().AppState.masterObat.map((o) => {
      const h1 = Number(o.harga_jual_1 !== undefined && o.harga_jual_1 !== '' ? o.harga_jual_1 : (o.harga_umum || 0));
      const s1 = String(o.satuan_1 || o.satuan_dasar || 'Unit').trim();
      return `<option value="${S().esc(o.id_obat)}">${S().esc(o.nama_dagang)} (${S().rp(h1)}/${S().esc(s1)})</option>`;
    }).join('');
    S().openModal(`<div class="p-6 space-y-4 text-sm">
      <div class="flex justify-between items-center">
        <h3 class="font-bold text-base">Catat Pesanan Masuk (Ambil di Apotek)</h3>
        <button onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><label class="text-xs font-bold block mb-1">Nama Pelanggan *</label><input id="omNama" class="ons-input" placeholder="Ny. Rina Marlina"/></div>
        <div><label class="text-xs font-bold block mb-1">No WhatsApp *</label><input id="omWa" class="ons-input" placeholder="081234567890"/></div>
      </div>
      <div>
        <label class="text-xs font-bold block mb-1">Kanal Pesanan</label>
        <select id="omChannel" class="ons-select">
          <option value="WhatsApp Apotek">WhatsApp Apotek</option>
          <option value="E-Apotek Web">E-Apotek Web (Ambil di Apotek)</option>
          <option value="Telepon Apotek">Telepon Apotek</option>
          <option value="Resep Dokter Langsung">Resep Dokter Langsung</option>
        </select>
      </div>
      <div class="p-3 rounded-xl border space-y-2" style="background:var(--ons-bg-subtle)">
        <div class="text-xs font-bold">Item Obat Utama</div>
        <div class="flex gap-2">
          <select id="omObatPick" class="ons-select flex-1 text-xs">${obatOpts}</select>
          <input id="omQtyPick" type="number" class="ons-input w-20 font-mono-num" value="1" min="1"/>
        </div>
      </div>
      <div><label class="text-xs font-bold block mb-1">Catatan Resep / Instruksi Pengambilan</label><input id="omCatatan" class="ons-input" placeholder="Cth: Ambil sore hari / bawa resep fisik"/></div>
      <div class="flex justify-end gap-2 pt-2">
        <button onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Batal</button>
        <button onclick="ONSViewsOmniCrm.submitNewOmni()" class="ons-btn ons-btn-primary text-xs">Simpan Pesanan &amp; Masuk Antrean</button>
      </div>
    </div>`, '580px');
  }

  async function submitNewOmni() {
    const nama = (document.getElementById('omNama').value || '').trim();
    const wa = (document.getElementById('omWa').value || '').trim();
    if (!nama || !wa) { global.toast('Nama & nomor WA wajib diisi.', 'warn'); return; }
    const idObat = document.getElementById('omObatPick').value;
    const qty = Math.max(1, Number(document.getElementById('omQtyPick').value || 1));
    const obat = S().AppState.masterObat.find((o) => o.id_obat === idObat);
    const h1 = obat ? Number(obat.harga_jual_1 !== undefined && obat.harga_jual_1 !== '' ? obat.harga_jual_1 : (obat.harga_umum || 0)) : 0;
    const s1 = obat ? String(obat.satuan_1 || obat.satuan_dasar || 'Unit').trim() : 'Unit';
    const itemArr = obat ? [{ id_obat: obat.id_obat, nama: obat.nama_dagang, qty, satuan: s1, harga: h1 }] : [];
    const estTotal = obat ? (qty * h1) : 0;
    try {
      const res = await API().callApi('omni.save', {
        nama_pelanggan: nama,
        no_wa: wa,
        channel: document.getElementById('omChannel').value,
        alamat: 'Ambil Langsung di Apotek',
        ongkir: 0,
        total_estimasi: estTotal,
        catatan: document.getElementById('omCatatan').value,
        items_json: JSON.stringify(itemArr)
      }, { isWrite: true });
      if (res && res.item) S().AppState.omnichannelOrders.unshift(res.item);
      S().closeModal();
      global.toast('Order Omnichannel ' + ((res.item && res.item.no_order) || '') + ' dicatat!', 'ok');
      if (typeof global.renderActiveView === 'function') global.renderActiveView();
    } catch (e) { global.toast(e.message, 'err'); }
  }

  function openUpdateOmniModal(idOrder) {
    const ord = (S().AppState.omnichannelOrders || []).find((x) => x.id_order === idOrder);
    if (!ord) return;
    const flowOrder = ['BARU', 'DIRACIK_APJ', 'SIAP_DIAMBIL', 'SELESAI', 'BATAL'];
    const curIdx = flowOrder.indexOf(ord.status_order);
    const nextSuggested = (curIdx >= 0 && curIdx < 3) ? flowOrder[curIdx + 1] : ord.status_order;
    S().openModal(`<div class="p-6 space-y-4 text-sm">
      <div class="flex justify-between items-center">
        <h3 class="font-bold text-base">Perbarui Status Pesanan — ${S().esc(ord.no_order)}</h3>
        <button onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <div class="p-3 rounded-lg text-xs" style="background:var(--ons-bg-subtle)">
        Pelanggan: <strong>${S().esc(ord.nama_pelanggan)}</strong> (${S().esc(ord.no_wa)})<br/>
        Total Tagihan: <strong>${S().rp(Number(ord.total_estimasi || 0))}</strong> &bull; Metode: <strong>Ambil di Apotek</strong>
      </div>
      <div>
        <label class="text-xs font-bold block mb-1">Status Baru</label>
        <select id="updOmStatus" class="ons-select">
          ${flowOrder.map((st) => `<option value="${st}" ${st === nextSuggested ? 'selected' : ''}>${st.replace('_', ' ')}</option>`).join('')}
        </select>
      </div>
      <label class="flex items-center gap-2 text-xs font-semibold cursor-pointer">
        <input id="updOmSendWa" type="checkbox" checked class="w-4 h-4"/> Antrikan Notifikasi Update Status ke WhatsApp Pelanggan
      </label>
      <div class="flex justify-end gap-2 pt-2">
        <button onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Batal</button>
        <button onclick="ONSViewsOmniCrm.submitUpdateOmni('${S().esc(ord.id_order)}')" class="ons-btn ons-btn-emerald text-xs">Simpan Status</button>
      </div>
    </div>`, '500px');
  }

  async function submitUpdateOmni(idOrder) {
    try {
      const res = await API().callApi('omni.updateStatus', {
        id_order: idOrder,
        status_order: document.getElementById('updOmStatus').value,
        kirim_wa: document.getElementById('updOmSendWa').checked
      }, { isWrite: true });
      const arr = S().AppState.omnichannelOrders || [];
      const idx = arr.findIndex((x) => x.id_order === idOrder);
      if (idx >= 0 && res && res.item) arr[idx] = res.item;
      S().closeModal();
      global.toast('Status pesanan diperbarui.', 'ok');
      if (typeof global.renderActiveView === 'function') global.renderActiveView();
    } catch (e) { global.toast(e.message, 'err'); }
  }

  function copyKatalogLink() {
    const url = new URL('./index.html?katalog=1', global.location.href).href;
    if (navigator.clipboard) navigator.clipboard.writeText(url);
    global.toast('Link Etalase Publik disalin: ' + url, 'ok');
  }

  function renderOmnichannelView() {
    const st = S().AppState;
    omniFilterStatus = (st.subTabs && st.subTabs.omnichannel) || omniFilterStatus || 'SEMUA';
    const orders = st.omnichannelOrders || [];
    const cntBaru = orders.filter((x) => x.status_order === 'BARU').length;
    const cntRacik = orders.filter((x) => x.status_order === 'DIRACIK_APJ').length;
    const cntSiap = orders.filter((x) => x.status_order === 'SIAP_DIAMBIL' || x.status_order === 'SIAP_KIRIM' || x.status_order === 'DIKIRIM_KURIR').length;
    const cntSelesai = orders.filter((x) => x.status_order === 'SELESAI').length;

    const filtered = orders.filter((o) => {
      const okStat = omniFilterStatus === 'SEMUA' || o.status_order === omniFilterStatus;
      const q = omniSearchQ.toLowerCase();
      const okQ = !q || [o.no_order, o.nama_pelanggan, o.no_wa, o.channel].some((v) => String(v || '').toLowerCase().includes(q));
      return okStat && okQ;
    });

    return `<div class="space-y-5 ons-view-enter">
      <div class="ons-page-header">
        <div>
          <h1 class="text-xl font-extrabold">Pesanan Masuk Online &amp; WhatsApp (Ambil di Apotek)</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Terintegrasi real-time dengan Etalase Publik E-Apotek (?katalog=1), WhatsApp Order, &amp; Kasir POS FEFO (Pick Up langsung di apotek).</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <a href="./index.html?katalog=1" target="_blank" class="ons-btn ons-btn-ghost text-xs">&#128722; Etalase Publik (?katalog=1)</a>
          <button onclick="ONSViewsOmniCrm.copyKatalogLink()" class="ons-btn ons-btn-ghost text-xs">Salin Link Order</button>
          <button onclick="ONSViewsOmniCrm.openNewOmniOrderModal()" class="ons-btn ons-btn-primary text-xs">+ Catat Pesanan Masuk</button>
        </div>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="ons-card p-3.5 ons-card-interactive"><div class="text-xs" style="color:var(--ons-text-soft)">Pesanan Baru Masuk</div><div class="text-2xl font-extrabold font-mono-num text-blue-600 mt-1">${cntBaru}</div></div>
        <div class="ons-card p-3.5 ons-card-interactive"><div class="text-xs" style="color:var(--ons-text-soft)">Sedang Disiapkan APJ</div><div class="text-2xl font-extrabold font-mono-num text-amber-600 mt-1">${cntRacik}</div></div>
        <div class="ons-card p-3.5 ons-card-interactive"><div class="text-xs" style="color:var(--ons-text-soft)">Siap Diambil di Apotek</div><div class="text-2xl font-extrabold font-mono-num text-blue-600 mt-1">${cntSiap}</div></div>
        <div class="ons-card p-3.5 ons-card-interactive"><div class="text-xs" style="color:var(--ons-text-soft)">Selesai &amp; Lunas POS</div><div class="text-2xl font-extrabold font-mono-num text-emerald-600 mt-1">${cntSelesai}</div></div>
      </div>

      <div class="ons-card p-4 space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="ons-tab-bar">
            ${['SEMUA', 'BARU', 'DIRACIK_APJ', 'SIAP_DIAMBIL', 'SELESAI'].map((st) =>
              `<button onclick="ONSViewsOmniCrm.setOmniFilter('${st}')" class="ons-tab-btn ${omniFilterStatus === st ? 'active' : ''}">${st.replace('_', ' ')}</button>`
            ).join('')}
          </div>
          <div class="flex gap-2">
            <input class="ons-input w-56 text-xs" value="${S().esc(omniSearchQ)}" oninput="ONSViewsOmniCrm.setOmniSearch(this.value)" placeholder="Cari no order / pasien / WA..."/>
            <button onclick="ONSViewsOmniCrm.refreshOmniOrders()" class="ons-btn ons-btn-ghost text-xs">Refresh</button>
          </div>
        </div>

        <div class="space-y-2.5">
          ${filtered.length === 0 ? `<div class="text-center py-8 text-xs" style="color:var(--ons-text-soft)">Belum ada pesanan masuk pada filter ini.</div>` : filtered.map((o) => {
            const items = parseItemsJson(o.items_json);
            const flow = OMNI_STATUS_FLOW[o.status_order] || OMNI_STATUS_FLOW.BARU;
            const grandEst = Number(o.total_estimasi || 0);
            return `<div class="p-3.5 rounded-xl border flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div class="space-y-1 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-mono-num font-extrabold text-xs">${S().esc(o.no_order)}</span>
                  <span class="badge-bpom ${flow.badge}">${S().esc((flow.label || o.status_order).replace('_', ' '))}</span>
                  <span class="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-500/10">${S().esc(o.channel || 'WhatsApp')}</span>
                  <span class="text-[11px]" style="color:var(--ons-text-soft)">${S().formatTgl(o.tanggal, true)}</span>
                </div>
                <div class="text-sm font-bold">${S().esc(o.nama_pelanggan)} <span class="text-xs font-normal" style="color:var(--ons-text-soft)">&bull; ${S().esc(o.no_wa)}</span></div>
                <div class="text-xs" style="color:var(--ons-text-soft)">Metode: <b>Ambil Langsung di Apotek (Pick Up)</b></div>
                <div class="text-xs">
                  Item: ${items.map((it) => `${S().esc(it.nama || it.id_obat)} x${it.qty}`).join(', ') || 'Lihat catatan resep'}
                  ${o.no_invoice_pos ? ` &bull; Nota POS: <span class="font-mono-num text-emerald-600 font-bold">${S().esc(o.no_invoice_pos)}</span>` : ''}
                </div>
              </div>
              <div class="flex flex-wrap lg:flex-col items-end justify-between gap-2 shrink-0">
                <div class="text-right">
                  <div class="text-[11px]" style="color:var(--ons-text-soft)">Total Tagihan</div>
                  <div class="text-base font-extrabold text-emerald-600">${S().rp(grandEst)}</div>
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <a href="${waHref(o.no_wa, 'Halo Kak ' + o.nama_pelanggan + ', pesanan ' + o.no_order + ' di Apotek ONS Farma siap diambil di apotek.')}" target="_blank" class="ons-btn ons-btn-ghost text-xs py-1 px-2.5">Chat WA</a>
                  ${o.status_order !== 'SELESAI' && o.status_order !== 'BATAL' ? `
                    <button onclick="ONSViewsOmniCrm.openUpdateOmniModal('${S().esc(o.id_order)}')" class="ons-btn ons-btn-ghost text-xs py-1 px-2.5">Update Status</button>
                    <button onclick="ONSViewsOmniCrm.loadOmniOrderToPos('${S().esc(o.id_order)}')" class="ons-btn ons-btn-primary text-xs py-1 px-3">Muat ke POS &rarr;</button>
                  ` : ''}
                </div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
  }

  async function loadCrmAndQueue() {
    try {
      const [cRes, qRes] = await Promise.all([
        API().callApi('crm.list', {}),
        API().callApi('notif.list', {})
      ]);
      S().AppState.crmKontak = cRes.items || [];
      S().AppState.antrianNotif = qRes.items || [];
      if (S().AppState.activeView === 'crm-wa' && typeof global.renderActiveView === 'function') global.renderActiveView();
    } catch (e) {}
  }

  async function syncCrmNow() {
    try {
      const res = await API().callApi('crm.sync', {}, { isWrite: true });
      await loadCrmAndQueue();
      global.toast(`Sinkronisasi selesai: ${res.synced || 0} kontak baru (total ${res.total || 0}).`, 'ok');
    } catch (e) { global.toast(e.message, 'err'); }
  }

  function openAddCrmModal() {
    S().openModal(`<div class="p-6 space-y-4 text-sm">
      <div class="flex justify-between items-center">
        <h3 class="font-bold text-base">Tambah Kontak CRM Pasien</h3>
        <button onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <div><label class="text-xs font-bold block mb-1">Nama Lengkap *</label><input id="crmAddNama" class="ons-input"/></div>
      <div><label class="text-xs font-bold block mb-1">Nomor WA (08xx / 628xx) *</label><input id="crmAddWa" class="ons-input font-mono-num" placeholder="081234567890"/></div>
      <div><label class="text-xs font-bold block mb-1">Segmen</label><select id="crmAddSeg" class="ons-select"><option value="UMUM">UMUM</option><option value="TERAPI_RUTIN">TERAPI_RUTIN</option><option value="ONLINE">ONLINE</option></select></div>
      <div><label class="text-xs font-bold block mb-1">Catatan Medis / Alergi</label><input id="crmAddCat" class="ons-input"/></div>
      <div class="flex justify-end gap-2 pt-2">
        <button onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Batal</button>
        <button onclick="ONSViewsOmniCrm.submitAddCrm()" class="ons-btn ons-btn-primary text-xs">Simpan Kontak</button>
      </div>
    </div>`, '480px');
  }

  async function submitAddCrm() {
    try {
      await API().callApi('crm.save', {
        nama: document.getElementById('crmAddNama').value,
        no_wa: document.getElementById('crmAddWa').value,
        segmen: document.getElementById('crmAddSeg').value,
        catatan_medis: document.getElementById('crmAddCat').value
      }, { isWrite: true });
      S().closeModal();
      global.toast('Kontak CRM disimpan & dinormalisasi (62/08).', 'ok');
      await loadCrmAndQueue();
    } catch (e) { global.toast(e.message, 'err'); }
  }

  async function toggleOptOut(idKontak) {
    try {
      await API().callApi('crm.toggleOptOut', { id_kontak: idKontak }, { isWrite: true });
      await loadCrmAndQueue();
    } catch (e) { global.toast(e.message, 'err'); }
  }

  async function sendBlastNow() {
    const pesan = (document.getElementById('blastPesanTxt').value || '').trim();
    const seg = document.getElementById('blastSegmen').value;
    if (!pesan) { global.toast('Tulis isi pesan broadcast terlebih dahulu.', 'warn'); return; }
    try {
      const res = await API().callApi('crm.blastWa', { segmen: seg, pesan }, { isWrite: true });
      crmTab = 'antrean';
      global.toast(`Berhasil mengantrikan ${res.queued || 0} pesan WhatsApp ke ANTRIAN_NOTIF!`, 'ok');
      await loadCrmAndQueue();
    } catch (e) { global.toast(e.message, 'err'); }
  }

  async function processQueueNow() {
    try {
      const res = await API().callApi('notif.processQueue', {}, { isWrite: true });
      global.toast(`Batch selesai: ${res.terkirim || 0} terkirim, ${res.gagal || 0} gagal (${res.mode || 'LIVE'}).`, 'ok');
      await loadCrmAndQueue();
    } catch (e) { global.toast(e.message, 'err'); }
  }

  function renderCrmWaView() {
    if (!S().canSeeFinancialCost()) {
      return `<div class="ons-card p-6 text-center text-sm">Akses Pusat CRM WhatsApp &amp; Broadcast khusus untuk Pemilik &amp; APJ.</div>`;
    }
    const st = S().AppState;
    crmTab = (st.subTabs && st.subTabs['crm-wa']) || crmTab || 'kontak';
    if (!(st.crmKontak || []).length && !renderCrmWaView._autoFetched) {
      renderCrmWaView._autoFetched = true;
      setTimeout(() => loadCrmAndQueue(), 20);
    }

    const contacts = st.crmKontak || [];
    const queue = st.antrianNotif || [];
    const activeOptIn = contacts.filter((c) => c.status_aktif !== 'OPT_OUT');
    const pendingQ = queue.filter((q) => q.status === 'ANTRI');
    const sentQ = queue.filter((q) => q.status === 'TERKIRIM');

    const normSeg = (s) => {
      const u = String(s || '').toUpperCase();
      return (u.includes('PRB') || u.includes('KRONIS')) ? 'TERAPI_RUTIN' : (u || 'UMUM');
    };
    const filteredContacts = contacts.filter((c) => {
      const sg = normSeg(c.segmen);
      const okSeg = crmFilterSeg === 'SEMUA' || sg === crmFilterSeg || String(c.segmen || '') === crmFilterSeg;
      const q = crmSearchQ.toLowerCase();
      const okQ = !q || [c.nama, c.no_wa_08, c.no_wa_62, c.catatan_medis].some((v) => String(v || '').toLowerCase().includes(q));
      return okSeg && okQ;
    });
    const filteredTargets = contacts.filter((c) => (crmFilterSeg === 'SEMUA' || normSeg(c.segmen) === crmFilterSeg || c.segmen === crmFilterSeg) && c.status_aktif !== 'OPT_OUT');

    return `<div class="space-y-5 ons-view-enter">
      <div class="ons-page-header">
        <div>
          <h1 class="text-xl font-extrabold">WhatsApp CRM, Broadcast Edukasi &amp; Antrean Fonnte</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Arsitektur /gas-notifikasi-wa-crm: normalisasi 62/08, proteksi Opt-Out pasien, &amp; antrean non-blocking.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button onclick="ONSViewsOmniCrm.syncCrmNow()" class="ons-btn ons-btn-primary text-xs">Sinkronkan Member &amp; Pembeli Online</button>
          <button onclick="ONSViewsOmniCrm.openAddCrmModal()" class="ons-btn ons-btn-ghost text-xs">+ Tambah Kontak</button>
        </div>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="ons-card p-3.5"><div class="text-xs" style="color:var(--ons-text-soft)">Total Kontak CRM</div><div class="text-2xl font-extrabold font-mono-num mt-1">${contacts.length}</div></div>
        <div class="ons-card p-3.5"><div class="text-xs" style="color:var(--ons-text-soft)">Pasien Opt-In (Aktif WA)</div><div class="text-2xl font-extrabold font-mono-num text-emerald-600 mt-1">${activeOptIn.length}</div></div>
        <div class="ons-card p-3.5"><div class="text-xs" style="color:var(--ons-text-soft)">Antrean Menunggu</div><div class="text-2xl font-extrabold font-mono-num text-amber-600 mt-1">${pendingQ.length}</div></div>
        <div class="ons-card p-3.5"><div class="text-xs" style="color:var(--ons-text-soft)">WA Terkirim (Log)</div><div class="text-2xl font-extrabold font-mono-num text-blue-600 mt-1">${sentQ.length}</div></div>
      </div>

      <div class="ons-card p-4 space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="ons-tab-bar">
            <button onclick="ONSViewsOmniCrm.setCrmTab('kontak')" class="ons-tab-btn ${crmTab === 'kontak' ? 'active' : ''}">Kontak &amp; Opt-Out</button>
            <button onclick="ONSViewsOmniCrm.setCrmTab('blast')" class="ons-tab-btn ${crmTab === 'blast' ? 'active' : ''}">Broadcast WA Massal</button>
            <button onclick="ONSViewsOmniCrm.setCrmTab('antrean')" class="ons-tab-btn ${crmTab === 'antrean' ? 'active' : ''}">Antrean Notifikasi (${pendingQ.length})</button>
            <button onclick="ONSViewsOmniCrm.setCrmTab('tele-refill')" class="ons-tab-btn ${crmTab === 'tele-refill' ? 'active' : ''}">💊 Pantauan Obat Rutin (Tele-Refill H-3)</button>
          </div>
          <button onclick="ONSViewsOmniCrm.loadCrmAndQueue()" class="ons-btn ons-btn-ghost text-xs">Muat Data Server</button>
        </div>

        ${crmTab === 'kontak' ? `
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap gap-2">
              ${['SEMUA', 'TERAPI_RUTIN', 'ONLINE', 'UMUM'].map((sg) =>
                `<button onclick="ONSViewsOmniCrm.setCrmSeg('${sg}')" class="ons-btn ${crmFilterSeg === sg ? 'ons-btn-primary' : 'ons-btn-ghost'} text-xs py-1.5 px-3">${sg}</button>`
              ).join('')}
            </div>
            <input class="ons-input w-64 text-xs" value="${S().esc(crmSearchQ)}" oninput="ONSViewsOmniCrm.setCrmSearch(this.value)" placeholder="Cari nama pasien / nomor 08 / 62..."/>
          </div>
          <div class="ons-table-wrap">
            <table class="ons-table">
              <thead><tr><th>Pasien</th><th>WA Format 08 / 62</th><th>Segmen</th><th>Catatan Klinis</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody>
                ${filteredContacts.length === 0 ? `<tr><td colspan="6" class="text-center py-6 text-xs" style="color:var(--ons-text-soft)">Klik "Sinkronkan Member &amp; Pembeli Online" untuk memuat kontak otomatis.</td></tr>` : filteredContacts.map((c) => `<tr>
                  <td class="font-bold text-xs">${S().esc(c.nama)}</td>
                  <td class="font-mono-num text-xs">${S().esc(c.no_wa_08)} <span style="color:var(--ons-text-soft)">(${S().esc(c.no_wa_62)})</span></td>
                  <td><span class="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-500/10">${S().esc(normSeg(c.segmen))}</span></td>
                  <td class="text-xs" style="color:var(--ons-text-soft)">${S().esc(c.catatan_medis || '-')}</td>
                  <td><span class="badge-bpom ${c.status_aktif === 'OPT_OUT' ? 'bpom-keras' : 'bpom-bebas'}">${S().esc(c.status_aktif)}</span></td>
                  <td>
                    <div class="flex flex-wrap gap-1.5">
                      <a href="${S().esc(waHref(c.no_wa_62 || c.no_wa_08, 'Halo Kak ' + c.nama + ', salam sehat dari ' + ((S().getStoreProfile && S().getStoreProfile().nama_usaha) || 'Apotek ONS Farma') + '. '))}" target="_blank" rel="noopener" class="ons-btn ons-btn-emerald text-[11px] py-1 px-2">Chat WA</a>
                      <button onclick="ONSViewsOmniCrm.toggleOptOut('${S().esc(c.id_kontak)}')" class="ons-btn ons-btn-ghost text-xs py-1 px-2">${c.status_aktif === 'OPT_OUT' ? 'Aktifkan WA' : 'Opt-Out'}</button>
                    </div>
                  </td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${crmTab === 'blast' ? `
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div class="space-y-3">
              <div>
                <label class="text-xs font-bold block mb-1">Target Segmen Pasien</label>
                <select id="blastSegmen" onchange="ONSViewsOmniCrm.setCrmSeg(this.value)" class="ons-select">
                  <option value="SEMUA" ${crmFilterSeg === 'SEMUA' ? 'selected' : ''}>SEMUA PASIEN AKTIF</option>
                  <option value="TERAPI_RUTIN" ${crmFilterSeg === 'TERAPI_RUTIN' ? 'selected' : ''}>PASIEN TERAPI RUTIN / KRONIS</option>
                  <option value="ONLINE" ${crmFilterSeg === 'ONLINE' ? 'selected' : ''}>PELANGGAN RESEP WA / KONSULTASI</option>
                  <option value="UMUM" ${crmFilterSeg === 'UMUM' ? 'selected' : ''}>PELANGGAN UMUM</option>
                </select>
              </div>
              <div class="flex flex-wrap gap-1.5">
                <button onclick="ONSViewsOmniCrm.fillBlastTpl('Halo Kak {nama}, Apotek ONS Farma mengingatkan jadwal kontrol dan tebus ulang obat rutin Anda. Silakan balas chat ini atau kunjungi apotek kami ya!')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Reminder Kontrol Rutin</button>
                <button onclick="ONSViewsOmniCrm.fillBlastTpl('Salam sehat Kak {nama}! Apoteker ONS Farma siap melayani konsultasi penggunaan obat dan penyiapan resep Anda secara langsung maupun via WhatsApp.')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Info Konsultasi Apoteker</button>
              </div>
              <div>
                <label class="text-xs font-bold block mb-1">Isi Pesan WhatsApp (Gunakan <code>{nama}</code> untuk personalisasi)</label>
                <textarea id="blastPesanTxt" oninput="ONSViewsOmniCrm.refreshBlastManualList()" class="ons-textarea" rows="5" placeholder="Tulis pesan edukasi kesehatan atau reminder tebus obat..."></textarea>
              </div>
              <button onclick="ONSViewsOmniCrm.sendBlastNow()" class="ons-btn ons-btn-ghost w-full">Antrikan Broadcast Otomatis via Fonnte (${filteredTargets.length} Penerima)</button>
            </div>
            <div class="p-4 rounded-xl border space-y-2.5 text-xs" style="background:var(--ons-bg-subtle);border-color:var(--ons-border)">
              <div class="flex items-center justify-between gap-2">
                <div class="font-bold text-sm text-emerald-600">Kirim WA Manual Satu-per-Satu (100% Gratis)</div>
                <span class="badge-bpom bpom-bebas">${filteredTargets.length} Aktif</span>
              </div>
              <p style="color:var(--ons-text-soft)">Klik tombol <b>Kirim WA</b> di bawah untuk membuka WhatsApp langsung ke pasien tanpa perlu langganan Fonnte berbayar:</p>
              <div id="blastManualListWrap" class="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                ${filteredTargets.length === 0 ? `<div class="py-4 text-center" style="color:var(--ons-text-soft)">Tidak ada kontak aktif pada segmen ini.</div>` : filteredTargets.slice(0, 20).map((c) => {
                  const defaultMsg = 'Halo Kak ' + c.nama + ', salam sehat dari Apotek kami.';
                  return `<div class="p-2 rounded-lg border flex items-center justify-between gap-2" style="background:var(--ons-bg-card);border-color:var(--ons-border)">
                    <div class="min-w-0">
                      <div class="font-bold truncate">${S().esc(c.nama)}</div>
                      <div class="font-mono-num text-[11px]" style="color:var(--ons-text-soft)">${S().esc(c.no_wa_08 || c.no_wa_62)}</div>
                    </div>
                    <a data-wa-name="${S().esc(c.nama)}" data-wa-phone="${S().esc(c.no_wa_62 || c.no_wa_08)}" href="${S().esc(waHref(c.no_wa_62 || c.no_wa_08, defaultMsg))}" target="_blank" rel="noopener" class="ons-btn ons-btn-emerald text-[11px] py-1 px-2.5 shrink-0">Kirim WA</a>
                  </div>`;
                }).join('')}
              </div>
            </div>
          </div>
        ` : ''}

        ${crmTab === 'antrean' ? `
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="text-xs" style="color:var(--ons-text-soft)">Menampilkan ${queue.length} log antrean notifikasi WhatsApp terbaru.</div>
            <button onclick="ONSViewsOmniCrm.processQueueNow()" class="ons-btn ons-btn-emerald text-xs">Proses Antrean Sekarang (${pendingQ.length} Antri)</button>
          </div>
          <div class="ons-table-wrap">
            <table class="ons-table">
              <thead><tr><th>Waktu</th><th>Tujuan</th><th>Nama</th><th>Event</th><th>Status</th><th>Pesan</th><th>Manual WA</th></tr></thead>
              <tbody>
                ${queue.length === 0 ? `<tr><td colspan="7" class="text-center py-6 text-xs">Antrean notifikasi WhatsApp masih kosong.</td></tr>` : queue.slice(0, 50).map((q) => `<tr>
                  <td class="text-xs whitespace-nowrap">${S().formatTgl(q.created_at, true)}</td>
                  <td class="font-mono-num text-xs">${S().esc(q.tujuan)}</td>
                  <td class="text-xs font-bold">${S().esc(q.nama_penerima)}</td>
                  <td class="text-xs">${S().esc(q.jenis_event)}</td>
                  <td><span class="badge-bpom ${q.status === 'TERKIRIM' ? 'bpom-bebas' : (q.status === 'GAGAL' ? 'bpom-keras' : 'bpom-prekursor')}">${S().esc(q.status)}</span></td>
                  <td class="text-xs max-w-xs truncate" title="${S().esc(q.pesan || q.catatan_error)}">${S().esc((q.pesan || '').slice(0, 65))}</td>
                  <td><a href="${waHref(q.tujuan, q.pesan)}" target="_blank" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2">Buka WA</a></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
      </div>
    </div>`;
  }


  const TELE_REFILL_KEY = 'ons_farma_tele_refill_patients_v2';

  function _getTeleRefillSeed() {
    const today = new Date();
    const dMinus1 = new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 10);
    const dPlus2 = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    const dPlus8 = new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 10);
    const dPlus20 = new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10);

    return [
      { id: 'TRF-001', nama_pasien: 'Ny. Ratna Juwita', no_wa: '08129876543', nama_obat: 'Amlodipine 10mg', aturan_pakai: '1x1 Pagi', tgl_tebus: '2026-10-18', tgl_habis: dPlus2, status_prb: 'Hipertensi', hari_sisa: 2 },
      { id: 'TRF-002', nama_pasien: 'Tn. Hendra Gunawan', no_wa: '08134455667', nama_obat: 'Metformin 500mg & Glimepiride 2mg', aturan_pakai: '2x1 Sesudah Makan', tgl_tebus: '2026-10-16', tgl_habis: new Date().toISOString().slice(0, 10), status_prb: 'Diabetes Melitus', hari_sisa: 0 },
      { id: 'TRF-003', nama_pasien: 'Ibu Siti Aisyah', no_wa: '08198877665', nama_obat: 'Candesartan 8mg', aturan_pakai: '1x1 Malam', tgl_tebus: '2026-10-28', tgl_habis: dPlus8, status_prb: 'Hipertensi', hari_sisa: 8 },
      { id: 'TRF-004', nama_pasien: 'Bpk. Bambang Wijaya', no_wa: '08213344556', nama_obat: 'Atorvastatin 20mg', aturan_pakai: '1x1 Malam', tgl_tebus: '2026-10-14', tgl_habis: dMinus1, status_prb: 'Dislipidemia / Kolesterol', hari_sisa: -1 }
    ];
  }

  function _getTeleRefillList() {
    try {
      const raw = localStorage.getItem(TELE_REFILL_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length) return arr;
      }
    } catch (e) {}
    const seed = _getTeleRefillSeed();
    _saveTeleRefillList(seed);
    return seed;
  }

  function _saveTeleRefillList(list) {
    try {
      localStorage.setItem(TELE_REFILL_KEY, JSON.stringify(list || []));
    } catch (e) {}
  }

  let teleRefillSearchQ = '';
  let teleRefillFilterStatus = 'SEMUA';

  function _renderTeleRefillSubTab() {
    const allList = _getTeleRefillList();
    const today = new Date().toISOString().slice(0, 10);
    const todayMs = new Date(today + 'T00:00:00').getTime();

    // Recalculate countdown days
    const computed = allList.map((p) => {
      const hMs = new Date(String(p.tgl_habis || today) + 'T00:00:00').getTime();
      const diffDays = Math.round((hMs - todayMs) / (86400000));
      let statusGroup = 'AMAN';
      if (diffDays < 0) statusGroup = 'OVERDUE';
      else if (diffDays === 0) statusGroup = 'H0';
      else if (diffDays <= 3) statusGroup = 'H3';
      return Object.assign({}, p, { sisaHari: diffDays, statusGroup });
    });

    const urgentCount = computed.filter((p) => p.statusGroup === 'H3' || p.statusGroup === 'H0').length;
    const overdueCount = computed.filter((p) => p.statusGroup === 'OVERDUE').length;
    const safeCount = computed.filter((p) => p.statusGroup === 'AMAN').length;
    const totalCount = computed.length;
    const compliancePct = totalCount ? Math.round(((totalCount - overdueCount) / totalCount) * 100) : 100;

    const q = teleRefillSearchQ.trim().toLowerCase();
    const filtered = computed.filter((p) => {
      if (teleRefillFilterStatus !== 'SEMUA' && p.statusGroup !== teleRefillFilterStatus) return false;
      if (q) {
        const hay = `${p.nama_pasien} ${p.no_wa} ${p.nama_obat} ${p.status_prb}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const prof = (typeof S().getStoreProfile === 'function' ? S().getStoreProfile() : {}) || {};
    const usahaNama = prof.nama_usaha || 'Apotek ONS Farma';

    return `
      <div class="space-y-4 text-xs">
        <!-- Cockpit Tracker -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="ons-card p-3.5 border-l-4" style="border-left-color:#0D9488">
            <div class="text-[11px]" style="color:var(--ons-text-soft)">Total Pasien Terapi Rutin</div>
            <div class="text-2xl font-extrabold font-mono-num mt-1">${totalCount} Pasien</div>
            <div class="text-[10px] text-teal-600 dark:text-teal-400 mt-0.5">Hipertensi, DM, Jantung &amp; PRB</div>
          </div>
          <div class="ons-card p-3.5 border-l-4" style="border-left-color:#F59E0B">
            <div class="text-[11px]" style="color:var(--ons-text-soft)">Prioritas Refill Segera (H-3 s.d H-0)</div>
            <div class="text-2xl font-extrabold font-mono-num text-amber-600 mt-1">${urgentCount} Pasien</div>
            <div class="text-[10px] text-amber-600 mt-0.5">Obat hampir/sudah habis</div>
          </div>
          <div class="ons-card p-3.5 border-l-4" style="border-left-color:#EF4444">
            <div class="text-[11px]" style="color:var(--ons-text-soft)">Terlewat Jadwal Tebus (Overdue)</div>
            <div class="text-2xl font-extrabold font-mono-num text-red-600 mt-1">${overdueCount} Pasien</div>
            <div class="text-[10px] text-red-500 mt-0.5">Potensi putus terapi</div>
          </div>
          <div class="ons-card p-3.5 border-l-4" style="border-left-color:#10B981">
            <div class="text-[11px]" style="color:var(--ons-text-soft)">Tingkat Kepatuhan Minum Obat</div>
            <div class="text-2xl font-extrabold font-mono-num text-emerald-600 mt-1">${compliancePct}%</div>
            <div class="text-[10px] text-emerald-600 mt-0.5">Target kepatuhan terapi &gt;90%</div>
          </div>
        </div>

        <!-- Action Header & Filters -->
        <div class="flex flex-wrap items-center justify-between gap-2.5">
          <div class="flex flex-wrap items-center gap-1.5">
            ${[
              { id: 'SEMUA', lbl: 'Semua (' + totalCount + ')' },
              { id: 'H3', lbl: '⚠️ Segera Habis H-3 (' + computed.filter(p => p.statusGroup === 'H3').length + ')' },
              { id: 'H0', lbl: '🔴 Habis Hari Ini (' + computed.filter(p => p.statusGroup === 'H0').length + ')' },
              { id: 'OVERDUE', lbl: '⛔ Terlewat (' + overdueCount + ')' },
              { id: 'AMAN', lbl: '🟢 Aman (' + safeCount + ')' }
            ].map(f => `
              <button type="button" onclick="ONSViewsOmniCrm.setTeleRefillFilter('${f.id}')" class="ons-btn ${teleRefillFilterStatus === f.id ? 'ons-btn-primary' : 'ons-btn-ghost'} text-xs py-1.5 px-3">${f.lbl}</button>
            `).join('')}
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <input class="ons-input w-56 text-xs" value="${S().esc(teleRefillSearchQ)}" oninput="ONSViewsOmniCrm.setTeleRefillSearch(this.value)" placeholder="Cari pasien / nomor WA / obat..."/>
            <button type="button" onclick="ONSViewsOmniCrm.printTeleRefillReportA4()" class="ons-btn ons-btn-ghost text-xs" title="Cetak Rekap A4">&#128424; Cetak Rekap A4</button>
            <button type="button" onclick="ONSViewsOmniCrm.openAddTeleRefillModal()" class="ons-btn ons-btn-emerald text-xs font-bold">+ Pasien Terapi Rutin</button>
          </div>
        </div>

        <!-- Tabel Pantauan Terapi -->
        <div class="ons-table-wrap">
          <table class="ons-table">
            <thead>
              <tr>
                <th>Pasien</th>
                <th>Obat Rutin Terapi</th>
                <th>Tgl Tebus Terakhir</th>
                <th>Perkiraan Habis</th>
                <th>Status Countdown</th>
                <th>Aksi WhatsApp Pengingat Refill</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length === 0 ? `
                <tr><td colspan="6" class="text-center py-8 text-xs" style="color:var(--ons-text-soft)">Tidak ada data pasien terapi rutin pada filter ini.</td></tr>
              ` : filtered.map((p, idx) => {
                let badgeCls = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                let badgeText = '🟢 Aman (' + p.sisaHari + ' hari)';
                if (p.statusGroup === 'H3') {
                  badgeCls = 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse font-bold';
                  badgeText = '⚠️ Sisa ' + p.sisaHari + ' hari (Segera Habis)';
                } else if (p.statusGroup === 'H0') {
                  badgeCls = 'bg-rose-100 text-rose-900 border-rose-300 font-extrabold';
                  badgeText = '🔴 HABIS HARI INI';
                } else if (p.statusGroup === 'OVERDUE') {
                  badgeCls = 'bg-red-100 text-red-900 border-red-300 font-bold';
                  badgeText = '⛔ Terlewat ' + Math.abs(p.sisaHari) + ' hari';
                }

                const reminderMsg = `Halo Ibu/Bpk ${p.nama_pasien}, salam sehat dari ${usahaNama}. Berdasarkan pemantauan apotek kami, persediaan obat rutin Anda (${p.nama_obat} - ${p.aturan_pakai}) diperkirakan habis ${p.sisaHari === 0 ? 'hari ini' : (p.sisaHari < 0 ? 'beberapa hari lalu' : ('dalam ' + p.sisaHari + ' hari lagi (tgl ' + p.tgl_habis + ')'))}. Mohon jangan lewatkan jadwal kontrol dan penyiapan obat kembali agar kondisi kesehatan tetap optimal. Kami siap membantu penyiapan obat Anda langsung di apotek. Terima kasih.`;

                const waUrl = S().buildWaUrl ? S().buildWaUrl(p.no_wa, reminderMsg) : ('https://wa.me/?text=' + encodeURIComponent(reminderMsg));

                return `
                  <tr>
                    <td>
                      <div class="font-bold text-slate-900 dark:text-slate-100">${S().esc(p.nama_pasien)}</div>
                      <div class="text-[11px] font-mono-num text-slate-500">${S().esc(p.no_wa)} &bull; <span class="text-teal-700 dark:text-teal-300 font-semibold">${S().esc(p.status_prb || 'Rutin')}</span></div>
                    </td>
                    <td>
                      <div class="font-semibold text-slate-800 dark:text-slate-200">${S().esc(p.nama_obat)}</div>
                      <div class="text-[11px] text-slate-500">Signa: ${S().esc(p.aturan_pakai || 'Sesuai Anjuran')}</div>
                    </td>
                    <td class="font-mono-num text-xs whitespace-nowrap">${S().esc(p.tgl_tebus)}</td>
                    <td class="font-mono-num text-xs font-bold whitespace-nowrap text-blue-700 dark:text-blue-300">${S().esc(p.tgl_habis)}</td>
                    <td>
                      <span class="px-2.5 py-1 rounded-full text-[11px] border inline-block ${badgeCls}">${badgeText}</span>
                    </td>
                    <td>
                      <div class="flex flex-wrap items-center gap-1.5">
                        <a href="${S().esc(waUrl)}" target="_blank" rel="noopener" class="ons-btn ons-btn-emerald text-[11px] py-1 px-2.5 shadow-sm flex items-center gap-1" title="Kirim Pesan WhatsApp Personal">
                          <span>📲 Kirim WA H-3</span>
                        </a>
                        <button type="button" onclick="ONSViewsOmniCrm.renewTeleRefill('${S().esc(p.id)}')" class="ons-btn ons-btn-ghost text-[11px] py-1 px-2" title="Catat Penebusan Baru (+30 Hari)">+30 Hari</button>
                        <button type="button" onclick="ONSViewsOmniCrm.deleteTeleRefill('${S().esc(p.id)}')" class="ons-btn ons-btn-danger text-[11px] py-1 px-1.5" title="Hapus">&times;</button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  global.ONSViewsOmniCrm = {
    renderOmnichannelView,
    renderCrmWaView,
    loadOmniOrderToPos,
    openNewOmniOrderModal,
    submitNewOmni,
    openUpdateOmniModal,
    submitUpdateOmni,
    refreshOmniOrders,
    copyKatalogLink,
    setOmniFilter: (s) => {
      omniFilterStatus = s || 'SEMUA';
      if (S().AppState.subTabs) S().AppState.subTabs.omnichannel = omniFilterStatus;
      if (typeof global.renderActiveView === 'function') global.renderActiveView();
      if (typeof global.syncNavHighlight === 'function') global.syncNavHighlight();
    },
    setOmniSearch: (q) => { omniSearchQ = q; if (typeof global.renderActiveView === 'function') global.renderActiveView(); },
    setTeleRefillSearch: (q) => { teleRefillSearchQ = q || ''; if (typeof global.renderActiveView === 'function') global.renderActiveView(); },
    setTeleRefillFilter: (st) => { teleRefillFilterStatus = st || 'SEMUA'; if (typeof global.renderActiveView === 'function') global.renderActiveView(); },
    renewTeleRefill: (id) => {
      const list = _getTeleRefillList();
      const item = list.find((x) => x.id === id);
      if (!item) return;
      const today = new Date().toISOString().slice(0, 10);
      const nextHabis = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      item.tgl_tebus = today;
      item.tgl_habis = nextHabis;
      _saveTeleRefillList(list);
      global.toast('Jadwal refill ' + item.nama_pasien + ' diperbarui +30 hari!', 'ok');
      if (typeof global.renderActiveView === 'function') global.renderActiveView();
    },
    deleteTeleRefill: (id) => {
      const list = _getTeleRefillList().filter((x) => x.id !== id);
      _saveTeleRefillList(list);
      global.toast('Pasien dihapus dari pantauan terapi rutin.', 'ok');
      if (typeof global.renderActiveView === 'function') global.renderActiveView();
    },
    openAddTeleRefillModal: () => {
      const today = new Date().toISOString().slice(0, 10);
      const nextHabis = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      const members = S().AppState.members || [];
      const drugs = S().AppState.masterObat || [];

      S().openModal(`<div class="p-6 space-y-3.5 text-xs">
        <div class="flex justify-between items-center pb-2 border-b" style="border-color:var(--ons-border)">
          <h3 class="font-bold text-base">Tambah Pasien Terapi Rutin (Tele-Refill Tracker)</h3>
          <button type="button" onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="font-semibold block mb-1">Nama Pasien *</label>
            <input id="trfNama" list="trfMemberList" class="ons-input" placeholder="Ketik nama pasien atau pilih member"/>
            <datalist id="trfMemberList">
              ${members.map(m => `<option value="${S().esc(m.nama_pasien)}">${S().esc(m.no_hp || '')}</option>`).join('')}
            </datalist>
          </div>
          <div>
            <label class="font-semibold block mb-1">Nomor WhatsApp Aktif *</label>
            <input id="trfWa" class="ons-input font-mono-num" placeholder="08xxxxxxxxxx atau 628xxxxxxxx"/>
          </div>
          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <label class="font-semibold block mb-1">Nama Obat Rutin *</label>
              <input id="trfObat" list="trfDrugList" class="ons-input" placeholder="Contoh: Amlodipine 10mg"/>
              <datalist id="trfDrugList">
                ${drugs.map(o => `<option value="${S().esc(o.nama_dagang)}">`).join('')}
              </datalist>
            </div>
            <div>
              <label class="font-semibold block mb-1">Aturan Pakai / Dosis *</label>
              <input id="trfSigna" class="ons-input" value="1x1 Pagi Hari" placeholder="Contoh: 1x1 Pagi"/>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <label class="font-semibold block mb-1">Tanggal Tebus Terakhir *</label>
              <input id="trfTglTebus" type="date" value="${today}" class="ons-input font-mono-num"/>
            </div>
            <div>
              <label class="font-semibold block mb-1">Perkiraan Obat Habis *</label>
              <input id="trfTglHabis" type="date" value="${nextHabis}" class="ons-input font-mono-num"/>
            </div>
          </div>
          <div>
            <label class="font-semibold block mb-1">Diagnosa / Program Terapi</label>
            <select id="trfProg" class="ons-select">
              <option value="Hipertensi">Hipertensi (Tekanan Darah Tinggi)</option>
              <option value="Diabetes Melitus">Diabetes Melitus (Gula Darah)</option>
              <option value="Jantung / Kardiovaskular">Jantung / Kardiovaskular</option>
              <option value="Dislipidemia / Kolesterol">Dislipidemia / Kolesterol</option>
              <option value="Asma / PPOK">Asma / PPOK</option>
              <option value="PRB Lainnya">Program Rujuk Balik (PRB) Lainnya</option>
            </select>
          </div>
        </div>
        <div class="flex justify-end gap-2 pt-2 border-t" style="border-color:var(--ons-border)">
          <button type="button" onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Batal</button>
          <button type="button" onclick="ONSViewsOmniCrm.submitAddTeleRefill()" class="ons-btn ons-btn-primary text-xs font-bold">Simpan Pasien</button>
        </div>
      </div>`, '540px');
    },
    submitAddTeleRefill: () => {
      const nama = ((document.getElementById('trfNama') || {}).value || '').trim();
      const wa = ((document.getElementById('trfWa') || {}).value || '').trim();
      const obat = ((document.getElementById('trfObat') || {}).value || '').trim();
      const signa = ((document.getElementById('trfSigna') || {}).value || '').trim();
      const tglTebus = (document.getElementById('trfTglTebus') || {}).value || '';
      const tglHabis = (document.getElementById('trfTglHabis') || {}).value || '';
      const prog = (document.getElementById('trfProg') || {}).value || 'Hipertensi';

      if (!nama || !wa || !obat) return global.toast('Nama pasien, nomor WA, dan obat wajib diisi!', 'warn');

      const list = _getTeleRefillList();
      const newId = 'TRF-' + Date.now().toString(36).toUpperCase();
      list.push({
        id: newId,
        nama_pasien: nama,
        no_wa: wa,
        nama_obat: obat,
        aturan_pakai: signa || '1x1 Sehari',
        tgl_tebus: tglTebus,
        tgl_habis: tglHabis,
        status_prb: prog
      });
      _saveTeleRefillList(list);
      S().closeModal();
      global.toast('Pasien ' + nama + ' berhasil ditambahkan ke Tele-Refill Tracker!', 'ok');
      if (typeof global.renderActiveView === 'function') global.renderActiveView();
    },
    printTeleRefillReportA4: () => {
      const list = _getTeleRefillList();
      const dateTag = new Date().toISOString().slice(0, 10);
      const headers = [
        { key: 'no', label: 'No.', type: 'int', width: 6 },
        { key: 'nama_pasien', label: 'Nama Pasien', width: 24 },
        { key: 'no_wa', label: 'No. WhatsApp', width: 16 },
        { key: 'nama_obat', label: 'Obat Rutin', width: 26 },
        { key: 'aturan_pakai', label: 'Signa', width: 18 },
        { key: 'tgl_tebus', label: 'Tgl Tebus', width: 14 },
        { key: 'tgl_habis', label: 'Est. Habis', width: 14 },
        { key: 'status_prb', label: 'Diagnosa / Terapi', width: 18 }
      ];
      const rows = list.map((p, i) => ({
        no: i + 1,
        nama_pasien: p.nama_pasien,
        no_wa: p.no_wa,
        nama_obat: p.nama_obat,
        aturan_pakai: p.aturan_pakai,
        tgl_tebus: p.tgl_tebus,
        tgl_habis: p.tgl_habis,
        status_prb: p.status_prb
      }));
      return S().exportDataset('pdf', 'Laporan Pantauan Pasien Terapi Rutin & Tele-Refill', 'Laporan_Tele_Refill_ONS_' + dateTag, headers, rows, { sheetName: 'TeleRefill' });
    },
    setCrmTab: (t) => {
      crmTab = t || 'kontak';
      if (S().AppState.subTabs) S().AppState.subTabs['crm-wa'] = crmTab;
      if (typeof global.renderActiveView === 'function') global.renderActiveView();
      if (typeof global.syncNavHighlight === 'function') global.syncNavHighlight();
    },
    setCrmSeg: (s) => { crmFilterSeg = s; if (typeof global.renderActiveView === 'function') global.renderActiveView(); },
    setCrmSearch: (q) => { crmSearchQ = q; if (typeof global.renderActiveView === 'function') global.renderActiveView(); },
    fillBlastTpl: (txt) => {
      const el = document.getElementById('blastPesanTxt');
      if (el) el.value = txt;
      if (global.ONSViewsOmniCrm && typeof global.ONSViewsOmniCrm.refreshBlastManualList === 'function') {
        global.ONSViewsOmniCrm.refreshBlastManualList();
      }
    },
    refreshBlastManualList: () => {
      const txtEl = document.getElementById('blastPesanTxt');
      const rawTpl = (txtEl && txtEl.value.trim()) || 'Halo Kak {nama}, salam sehat dari Apotek kami.';
      document.querySelectorAll('#blastManualListWrap a[data-wa-phone]').forEach((a) => {
        const nama = a.getAttribute('data-wa-name') || 'Pasien';
        const phone = a.getAttribute('data-wa-phone') || '';
        const msg = rawTpl.replace(/\{nama\}/gi, nama);
        a.href = waHref(phone, msg);
      });
    },
    loadCrmAndQueue,
    syncCrmNow,
    openAddCrmModal,
    submitAddCrm,
    toggleOptOut,
    sendBlastNow,
    processQueueNow
  };
})(window);
