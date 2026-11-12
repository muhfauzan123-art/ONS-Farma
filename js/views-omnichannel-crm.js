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
    SIAP_KIRIM: { badge: 'bpom-bebas', label: 'SIAP KIRIM' },
    DIKIRIM_KURIR: { badge: 'bpom-terbatas', label: 'DIKIRIM KURIR' },
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
      const harga = Number(it.harga || it.harga_jual || obat.harga_umum || 0);
      return {
        id_obat: it.id_obat || obat.id_obat || '',
        nama_dagang: it.nama || obat.nama_dagang || 'Produk E-Apotek',
        qty: Math.max(1, Number(it.qty || 1)),
        satuan: it.satuan || obat.satuan_dasar || 'Unit',
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
    const obatOpts = S().AppState.masterObat.map((o) =>
      `<option value="${S().esc(o.id_obat)}">${S().esc(o.nama_dagang)} (${S().rp(o.harga_umum)})</option>`
    ).join('');
    S().openModal(`<div class="p-6 space-y-4 text-sm">
      <div class="flex justify-between items-center">
        <h3 class="font-bold text-base">Catat Order WA / Delivery / Marketplace</h3>
        <button onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div><label class="text-xs font-bold block mb-1">Nama Pelanggan *</label><input id="omNama" class="ons-input" placeholder="Ny. Rina Marlina"/></div>
        <div><label class="text-xs font-bold block mb-1">No WhatsApp *</label><input id="omWa" class="ons-input" placeholder="081234567890"/></div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-bold block mb-1">Channel Order</label>
          <select id="omChannel" class="ons-select">
            <option value="WhatsApp Apotek">WhatsApp Apotek</option>
            <option value="E-Apotek Web">E-Apotek Web</option>
            <option value="Halodoc / Mitra">Halodoc / Mitra</option>
            <option value="GrabHealth / GoMed">GrabHealth / GoMed</option>
            <option value="Shopee / Tokopedia">Shopee / Tokopedia</option>
          </select>
        </div>
        <div><label class="text-xs font-bold block mb-1">Ongkos Kirim Kurir (Rp)</label><input id="omOngkir" type="number" class="ons-input font-mono-num" value="10000" min="0"/></div>
      </div>
      <div><label class="text-xs font-bold block mb-1">Alamat Pengantaran</label><textarea id="omAlamat" class="ons-textarea" rows="2" placeholder="Jl. Kesehatan No. 12..."></textarea></div>
      <div class="p-3 rounded-xl border space-y-2" style="background:var(--ons-bg-subtle)">
        <div class="text-xs font-bold">Item Obat Utama</div>
        <div class="flex gap-2">
          <select id="omObatPick" class="ons-select flex-1 text-xs">${obatOpts}</select>
          <input id="omQtyPick" type="number" class="ons-input w-20 font-mono-num" value="1" min="1"/>
        </div>
      </div>
      <div><label class="text-xs font-bold block mb-1">Catatan Keluhan / Kurir</label><input id="omCatatan" class="ons-input" placeholder="Minta antar sore / sertakan struk fisik"/></div>
      <div class="flex justify-end gap-2 pt-2">
        <button onclick="ONSStore.closeModal()" class="ons-btn ons-btn-ghost text-xs">Batal</button>
        <button onclick="ONSViewsOmniCrm.submitNewOmni()" class="ons-btn ons-btn-primary text-xs">Simpan Order &amp; Masuk Antrean</button>
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
    const itemArr = obat ? [{ id_obat: obat.id_obat, nama: obat.nama_dagang, qty, satuan: obat.satuan_dasar, harga: obat.harga_umum }] : [];
    const estTotal = obat ? (qty * Number(obat.harga_umum || 0)) : 0;
    try {
      const res = await API().callApi('omni.save', {
        nama_pelanggan: nama,
        no_wa: wa,
        channel: document.getElementById('omChannel').value,
        alamat: document.getElementById('omAlamat').value,
        ongkir: Number(document.getElementById('omOngkir').value || 0),
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
    const flowOrder = ['BARU', 'DIRACIK_APJ', 'SIAP_KIRIM', 'DIKIRIM_KURIR', 'SELESAI', 'BATAL'];
    const curIdx = flowOrder.indexOf(ord.status_order);
    const nextSuggested = (curIdx >= 0 && curIdx < 4) ? flowOrder[curIdx + 1] : ord.status_order;
    S().openModal(`<div class="p-6 space-y-4 text-sm">
      <div class="flex justify-between items-center">
        <h3 class="font-bold text-base">Perbarui Status &amp; Kurir — ${S().esc(ord.no_order)}</h3>
        <button onclick="ONSStore.closeModal()" class="text-xl">&times;</button>
      </div>
      <div class="p-3 rounded-lg text-xs" style="background:var(--ons-bg-subtle)">
        Pelanggan: <strong>${S().esc(ord.nama_pelanggan)}</strong> (${S().esc(ord.no_wa)})<br/>
        Total Estimasi + Ongkir: <strong>${S().rp(Number(ord.total_estimasi || 0) + Number(ord.ongkir || 0))}</strong>
      </div>
      <div>
        <label class="text-xs font-bold block mb-1">Status Baru</label>
        <select id="updOmStatus" class="ons-select">
          ${flowOrder.map((st) => `<option value="${st}" ${st === nextSuggested ? 'selected' : ''}>${st}</option>`).join('')}
        </select>
      </div>
      <div><label class="text-xs font-bold block mb-1">Nama Kurir / No Resi Instant</label><input id="updOmKurir" class="ons-input" value="${S().esc(ord.kurir || '')}" placeholder="GoSend Instant / Kurir Apotek"/></div>
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
        kurir: document.getElementById('updOmKurir').value,
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
    const cntSiap = orders.filter((x) => x.status_order === 'SIAP_KIRIM' || x.status_order === 'DIKIRIM_KURIR').length;
    const cntSelesai = orders.filter((x) => x.status_order === 'SELESAI').length;

    const filtered = orders.filter((o) => {
      const okStat = omniFilterStatus === 'SEMUA' || o.status_order === omniFilterStatus;
      const q = omniSearchQ.toLowerCase();
      const okQ = !q || [o.no_order, o.nama_pelanggan, o.no_wa, o.channel, o.kurir].some((v) => String(v || '').toLowerCase().includes(q));
      return okStat && okQ;
    });

    return `<div class="space-y-5 ons-view-enter">
      <div class="ons-page-header">
        <div>
          <h1 class="text-xl font-extrabold">Omnichannel Delivery Hub &amp; Pesanan Online</h1>
          <p class="text-xs" style="color:var(--ons-text-soft)">Terintegrasi real-time dengan Etalase Publik E-Apotek (?katalog=1), WhatsApp Order, &amp; Kasir POS FEFO.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <a href="./index.html?katalog=1" target="_blank" class="ons-btn ons-btn-ghost text-xs">&#128722; Etalase Publik (?katalog=1)</a>
          <button onclick="ONSViewsOmniCrm.copyKatalogLink()" class="ons-btn ons-btn-ghost text-xs">Salin Link Order</button>
          <button onclick="ONSViewsOmniCrm.openNewOmniOrderModal()" class="ons-btn ons-btn-primary text-xs">+ Catat Order WA / Mitra</button>
        </div>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="ons-card p-3.5 ons-card-interactive"><div class="text-xs" style="color:var(--ons-text-soft)">Order Baru Masuk</div><div class="text-2xl font-extrabold font-mono-num text-blue-600 mt-1">${cntBaru}</div></div>
        <div class="ons-card p-3.5 ons-card-interactive"><div class="text-xs" style="color:var(--ons-text-soft)">Sedang Disiapkan / Racik</div><div class="text-2xl font-extrabold font-mono-num text-amber-600 mt-1">${cntRacik}</div></div>
        <div class="ons-card p-3.5 ons-card-interactive"><div class="text-xs" style="color:var(--ons-text-soft)">Siap / Dalam Pengiriman</div><div class="text-2xl font-extrabold font-mono-num text-blue-600 mt-1">${cntSiap}</div></div>
        <div class="ons-card p-3.5 ons-card-interactive"><div class="text-xs" style="color:var(--ons-text-soft)">Selesai &amp; Lunas POS</div><div class="text-2xl font-extrabold font-mono-num text-emerald-600 mt-1">${cntSelesai}</div></div>
      </div>

      <div class="ons-card p-4 space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="ons-tab-bar">
            ${['SEMUA', 'BARU', 'DIRACIK_APJ', 'SIAP_KIRIM', 'DIKIRIM_KURIR', 'SELESAI'].map((st) =>
              `<button onclick="ONSViewsOmniCrm.setOmniFilter('${st}')" class="ons-tab-btn ${omniFilterStatus === st ? 'active' : ''}">${st.replace('_', ' ')}</button>`
            ).join('')}
          </div>
          <div class="flex gap-2">
            <input class="ons-input w-56 text-xs" value="${S().esc(omniSearchQ)}" oninput="ONSViewsOmniCrm.setOmniSearch(this.value)" placeholder="Cari no order / pasien / WA..."/>
            <button onclick="ONSViewsOmniCrm.refreshOmniOrders()" class="ons-btn ons-btn-ghost text-xs">Refresh</button>
          </div>
        </div>

        <div class="space-y-2.5">
          ${filtered.length === 0 ? `<div class="text-center py-8 text-xs" style="color:var(--ons-text-soft)">Belum ada order omnichannel pada filter ini.</div>` : filtered.map((o) => {
            const items = parseItemsJson(o.items_json);
            const flow = OMNI_STATUS_FLOW[o.status_order] || OMNI_STATUS_FLOW.BARU;
            const grandEst = Number(o.total_estimasi || 0) + Number(o.ongkir || 0);
            return `<div class="p-3.5 rounded-xl border flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div class="space-y-1 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-mono-num font-extrabold text-xs">${S().esc(o.no_order)}</span>
                  <span class="badge-bpom ${flow.badge}">${S().esc(o.status_order)}</span>
                  <span class="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-500/10">${S().esc(o.channel || 'WhatsApp')}</span>
                  <span class="text-[11px]" style="color:var(--ons-text-soft)">${S().formatTgl(o.tanggal, true)}</span>
                </div>
                <div class="text-sm font-bold">${S().esc(o.nama_pelanggan)} <span class="text-xs font-normal" style="color:var(--ons-text-soft)">&bull; ${S().esc(o.no_wa)}</span></div>
                <div class="text-xs" style="color:var(--ons-text-soft)">${S().esc(o.alamat || 'Ambil di Apotek (Self Pickup)')}</div>
                <div class="text-xs">
                  Item: ${items.map((it) => `${S().esc(it.nama || it.id_obat)} x${it.qty}`).join(', ') || 'Lihat catatan resep'}
                  ${o.kurir ? ` &bull; Kurir: <strong>${S().esc(o.kurir)}</strong>` : ''}
                  ${o.no_invoice_pos ? ` &bull; Nota POS: <span class="font-mono-num text-emerald-600 font-bold">${S().esc(o.no_invoice_pos)}</span>` : ''}
                </div>
              </div>
              <div class="flex flex-wrap lg:flex-col items-end justify-between gap-2 shrink-0">
                <div class="text-right">
                  <div class="text-[11px]" style="color:var(--ons-text-soft)">Estimasi + Ongkir</div>
                  <div class="text-base font-extrabold text-emerald-600">${S().rp(grandEst)}</div>
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <a href="${waHref(o.no_wa, 'Halo Kak ' + o.nama_pelanggan + ', pesanan ' + o.no_order + ' di Apotek ONS Farma berstatus: ' + o.status_order)}" target="_blank" class="ons-btn ons-btn-ghost text-xs py-1 px-2.5">Chat WA</a>
                  ${o.status_order !== 'SELESAI' && o.status_order !== 'BATAL' ? `
                    <button onclick="ONSViewsOmniCrm.openUpdateOmniModal('${S().esc(o.id_order)}')" class="ons-btn ons-btn-ghost text-xs py-1 px-2.5">Update Kurir/Status</button>
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
