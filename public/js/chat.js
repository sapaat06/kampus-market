// public/js/chat.js
// Real Two-Way User-to-User Chat System for Kampus Market
// 100% Real Database Storage (chat_rooms & chat_messages), No Bot, Live Polling Sync

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getInitials(name) {
  if (!name) return 'KC';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatChatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
  const now = new Date();
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));

  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');

  if (diffDays === 0) {
    return `${hours}.${mins}`;
  } else if (diffDays === 1) {
    return 'Kemarin';
  } else if (diffDays < 7) {
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    return days[d.getDay()];
  } else {
    return `${d.getDate()}/${d.getMonth() + 1}`;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // View Containers
  const viewChatList = document.getElementById('viewChatList');
  const viewChatRoom = document.getElementById('viewChatRoom');
  const roomBackBtn = document.getElementById('roomBackBtn');

  // List View Elements
  const inboxListContainer = document.getElementById('inboxListContainer');
  const inboxEmptyState = document.getElementById('inboxEmptyState');
  const searchChatInput = document.getElementById('searchChatInput');
  const filterChips = document.querySelectorAll('#filterChips .filter-chip');

  // Room View Elements
  const chatUserName = document.getElementById('chatUserName');
  const chatUserStatus = document.getElementById('chatUserStatus');
  const roomAvatar = document.getElementById('roomAvatar');
  const pinnedCard = document.getElementById('pinnedCard');
  const pinnedTitle = document.getElementById('pinnedTitle');
  const pinnedPrice = document.getElementById('pinnedPrice');
  const chatThread = document.getElementById('chatThread');
  const emptyChatState = document.getElementById('emptyChatState');
  const emptyGreeting = document.getElementById('emptyGreeting');
  const msgInput = document.getElementById('msgInput');
  const sendBtn = document.getElementById('sendBtn');
  const chipAjukanSewa = document.getElementById('chipAjukanSewa');
  const quickChips = document.querySelectorAll('.quick-chip[data-msg]');

  let currentUserId = null;
  let activeRoomId = null;
  let lastMessageId = 0;
  let activeFilter = 'all';
  let searchQuery = '';
  let cachedRooms = [];
  let isRoomPollingActive = false;
  let pollRoomTimer = null;
  let pollInboxTimer = null;

  // Helper: ambil ID pengirim dari berbagai kemungkinan nama field API
  // (sender_id dari backend terbaru, atau id_pengirim dari versi lama).
  function getIdPengirim(msg) {
    const id = msg?.sender_id ?? msg?.id_pengirim ?? msg?.id_user;
    return id === null || id === undefined ? null : Number(id);
  }

  // Penentu sisi bubble: true = milik sendiri (kanan), false = lawan (kiri).
  function isPesanSendiri(msg) {
    const id = getIdPengirim(msg);
    return id !== null && currentUserId !== null && id === Number(currentUserId);
  }

  // 1. Ambil data user login saat ini
  function setupRoleNavigation() {
    const userRole = localStorage.getItem('role') || localStorage.getItem('km_role');
    const isOwner = userRole === 'pemilik_kost';
    const homeTarget = isOwner ? 'kos-owner.html' : 'beranda.html';

    const chatBackHome = document.getElementById('chatBackHome');
    if (chatBackHome) {
      chatBackHome.setAttribute('href', homeTarget);
      chatBackHome.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof window.goToHome === 'function') window.goToHome();
        else window.location.href = homeTarget;
      });
    }

    const navChatHome = document.getElementById('navChatHome');
    if (navChatHome) {
      navChatHome.setAttribute('href', homeTarget);
      navChatHome.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof window.goToHome === 'function') window.goToHome();
        else window.location.href = homeTarget;
      });
    }

    const chatFloatingPlus = document.getElementById('chatFloatingPlus');
    if (chatFloatingPlus && isOwner) {
      chatFloatingPlus.setAttribute('href', 'kos-owner.html?action=tambah-properti');
      chatFloatingPlus.setAttribute('aria-label', 'Unggah Properti Kost');
      chatFloatingPlus.setAttribute('title', 'Tambah Properti Kost');
    }

    const inboxEmptyBtn = document.getElementById('inboxEmptyBtn');
    if (inboxEmptyBtn && isOwner) {
      inboxEmptyBtn.textContent = 'Kembali ke Dashboard Kost';
      inboxEmptyBtn.setAttribute('href', 'kos-owner.html');
      inboxEmptyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof window.goToHome === 'function') window.goToHome();
        else window.location.href = 'kos-owner.html';
      });
    }
  }

  setupRoleNavigation();

  async function resolveCurrentUserId() {
    try {
      const me = await KM.get('/saya').catch(() => KM.get('/auth/me'));
      if (me && me.role) {
        localStorage.setItem('role', me.role);
        localStorage.setItem('km_role', me.role);
        setupRoleNavigation();
      }
      const id = me && (me.id_mahasiswa ?? me.id ?? me.user?.id_mahasiswa);
      if (id) {
        currentUserId = Number(id);
        localStorage.setItem('km_user_id', String(currentUserId));
        return currentUserId;
      }
    } catch (_e) {
      // Belum login / sesi berakhir: pakai cadangan di bawah.
    }
    // Cadangan hanya saat sesi masih dianggap aktif (hindari ID akun lama).
    if (KM.sesi?.ada?.()) {
      const cached = Number(localStorage.getItem('km_user_id'));
      if (cached) currentUserId = cached;
    }
    if (currentUserId === null) {
      console.warn('[chat] currentUserId tidak diketahui, bubble akan dirender sebagai pesan masuk.');
    }
    return currentUserId;
  }

  await resolveCurrentUserId();

  // Helper ganti tampilan
  function showInboxView() {
    stopRoomPolling();
    activeRoomId = null;
    if (viewChatList && viewChatRoom) {
      viewChatList.style.display = 'flex';
      viewChatRoom.style.display = 'none';
    }
    loadInbox();
    startInboxPolling();
  }

  function showRoomView() {
    stopInboxPolling();
    if (viewChatList && viewChatRoom) {
      viewChatList.style.display = 'none';
      viewChatRoom.style.display = 'flex';
    }
  }

  // 2. Render Bubble Pesan di Thread
  function renderMessageBubble(msg, isOutgoing) {
    if (!chatThread || !msg.pesan) return;
    if (emptyChatState) emptyChatState.style.display = 'none';

    // Cek apakah bubble sudah ada (hindari duplikasi)
    if (document.getElementById(`msg-${msg.id_pesan}`)) return;

    const wrap = document.createElement('div');
    wrap.id = `msg-${msg.id_pesan}`;
    wrap.className = `bubble-wrap ${isOutgoing ? 'right' : 'left'}`;

    const timeStr = formatChatTime(msg.created_at);
    const metaCheck = isOutgoing
      ? `<svg viewBox="0 0 24 24"><path d="m2 12 5 5L17 7"/><path d="m9 12 3 3L22 5"/></svg>`
      : '';

    wrap.innerHTML = `
      <div class="bubble">
        ${escHtml(msg.pesan)}
        <div class="bubble-meta">
          <span>${timeStr}</span>
          ${metaCheck}
        </div>
      </div>
    `;

    chatThread.appendChild(wrap);
  }

  function scrollToBottom() {
    if (chatThread) {
      chatThread.scrollTop = chatThread.scrollHeight;
    }
  }

  // 3. Buka Ruang Chat Spesifik (Real Data dari Server)
  async function openRoom(roomId) {
    activeRoomId = roomId;
    showRoomView();

    // Reset thread
    const oldBubbles = chatThread.querySelectorAll('.bubble-wrap');
    oldBubbles.forEach((b) => b.remove());
    if (emptyChatState) emptyChatState.style.display = 'none';

    try {
      const data = await KM.get(`/chat/rooms/${roomId}`);
      const { room, lawan, reference, messages } = data;

      // Update info lawan bicara di header
      if (chatUserName) chatUserName.textContent = lawan.nama || 'Pengguna';
      if (chatUserStatus) {
        const roleLabel = lawan.role === 'pemilik_kost' ? 'Pemilik Kost' : 'Mahasiswa';
        chatUserStatus.textContent = `Online · ${roleLabel}`;
      }
      if (roomAvatar) {
        if (lawan.foto) {
          roomAvatar.innerHTML = `<img src="${escHtml(lawan.foto)}" alt="${escHtml(lawan.nama)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else {
          roomAvatar.textContent = getInitials(lawan.nama);
        }
      }

      // Update Pinned Reference Card (Barang atau Kos)
      if (pinnedCard) {
        if (reference) {
          pinnedCard.style.display = 'block';
          if (room.tipe_referensi === 'barang') {
            if (pinnedTitle) pinnedTitle.textContent = reference.nama_barang || 'Barang Kampus';
            if (pinnedPrice) {
              const harga = reference.harga_sewa
                ? `Rp${Number(reference.harga_sewa).toLocaleString('id-ID')} / hari · Sewa`
                : `Rp${Number(reference.harga_jual || 0).toLocaleString('id-ID')} · Beli`;
              pinnedPrice.textContent = harga;
            }
            pinnedCard.onclick = () => {
              window.location.href = `/detail.html?id=${reference.id_barang}`;
            };
            if (chipAjukanSewa) {
              chipAjukanSewa.textContent = reference.harga_sewa ? 'Ajukan Sewa' : 'Beli Sekarang';
              chipAjukanSewa.onclick = () => {
                window.location.href = `/detail.html?id=${reference.id_barang}`;
              };
            }
          } else if (room.tipe_referensi === 'kos') {
            if (pinnedTitle) pinnedTitle.textContent = reference.nama_kos || 'Kamar Kos';
            if (pinnedPrice) {
              pinnedPrice.textContent = `Rp${Number(reference.harga_bulan || 0).toLocaleString('id-ID')} / bulan · Sewa Kost`;
            }
            pinnedCard.onclick = () => {
              window.location.href = `/kos.html`;
            };
            if (chipAjukanSewa) {
              chipAjukanSewa.textContent = 'Ajukan Sewa Kos';
              chipAjukanSewa.onclick = () => {
                window.location.href = `/kos.html`;
              };
            }
          }
        } else {
          pinnedCard.style.display = 'none';
        }
      }

      // Render Messages
      if (!messages || messages.length === 0) {
        if (emptyChatState) {
          emptyChatState.style.display = 'flex';
          if (emptyGreeting) emptyGreeting.textContent = `Mulai Obrolan dengan ${lawan.nama}`;
        }
        lastMessageId = 0;
      } else {
        if (emptyChatState) emptyChatState.style.display = 'none';
        messages.forEach((m) => {
          renderMessageBubble(m, isPesanSendiri(m));
        });
        lastMessageId = messages[messages.length - 1].id_pesan;
        scrollToBottom();
      }

      // Mulai Polling Sinkronisasi Pesan Baru
      startRoomPolling();
    } catch (err) {
      if (err.status === 401) {
        await KM.ui.info('Masuk dulu, ya', 'Silakan masuk ke akun kamu terlebih dahulu untuk melihat obrolan.');
        window.location.href = '/masuk.html';
      } else {
        KM.ui.error('Gagal Memuat Obrolan', err.message || 'Silakan coba lagi sebentar lagi.');
        showInboxView();
      }
    }
  }

  // 4. Polling Real-Time di Ruang Chat (Setiap 1.5 detik)
  function startRoomPolling() {
    stopRoomPolling();
    isRoomPollingActive = true;
    pollRoomTimer = setInterval(async () => {
      if (!isRoomPollingActive || !activeRoomId) return;
      try {
        const syncData = await KM.get(`/chat/rooms/${activeRoomId}?after=${lastMessageId}`);
        if (syncData && syncData.messages && syncData.messages.length > 0) {
          syncData.messages.forEach((m) => {
            renderMessageBubble(m, isPesanSendiri(m));
            if (m.id_pesan > lastMessageId) lastMessageId = m.id_pesan;
          });
          scrollToBottom();
        }
      } catch (_e) {
        // Abaikan error polling transient
      }
    }, 1500);
  }

  function stopRoomPolling() {
    isRoomPollingActive = false;
    if (pollRoomTimer) {
      clearInterval(pollRoomTimer);
      pollRoomTimer = null;
    }
  }

  // 5. Kirim Pesan Real ke API Backend
  async function handleSendMessage() {
    if (!activeRoomId) return;
    const text = (msgInput?.value || '').trim();
    if (!text) return;

    if (sendBtn) sendBtn.disabled = true;
    msgInput.value = '';

    try {
      const newMsg = await KM.post(`/chat/rooms/${activeRoomId}/messages`, { pesan: text });
      if (newMsg && newMsg.id_pesan) {
        renderMessageBubble(newMsg, true);
        if (newMsg.id_pesan > lastMessageId) lastMessageId = newMsg.id_pesan;
        scrollToBottom();
      }
    } catch (err) {
      if (err.status === 401) {
        await KM.ui.info('Sesi berakhir', 'Silakan login kembali untuk melanjutkan obrolan.');
        window.location.href = '/masuk.html';
      } else {
        KM.ui.error('Pesan Gagal Terkirim', err.message || 'Periksa koneksi kamu lalu coba lagi.');
        msgInput.value = text;
      }
    } finally {
      if (sendBtn) sendBtn.disabled = false;
      msgInput?.focus();
    }
  }

  sendBtn?.addEventListener('click', handleSendMessage);
  msgInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  });

  quickChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const msg = chip.getAttribute('data-msg');
      if (msg && msgInput) {
        msgInput.value = msg;
        handleSendMessage();
      }
    });
  });

  // Tombol Kembali di Room View
  roomBackBtn?.addEventListener('click', () => {
    window.history.replaceState(null, '', '/chat.html');
    showInboxView();
  });

  // 6. Muat dan Render Inbox Daftar Chat Masuk
  async function loadInbox(isSilent = false) {
    if (!inboxListContainer) return;

    try {
      const data = await KM.get('/chat/rooms');
      cachedRooms = data?.rooms || [];
      renderInboxRooms();
    } catch (err) {
      if (err.status === 401) {
        if (!isSilent && inboxListContainer) {
          inboxListContainer.innerHTML = `
            <div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;padding:20px 16px;text-align:center;">
              <div style="font-size:14px;font-weight:700;color:#0F172A;margin-bottom:6px;">Masuk ke Akun Anda</div>
              <div style="font-size:12px;color:#64748B;margin-bottom:14px;">Masuk untuk melihat riwayat pesan dan chat langsung dengan penjual atau pemilik kos.</div>
              <a href="/masuk.html" class="btn-primary" style="display:inline-flex;width:auto;padding:0 24px;height:40px;font-size:13px;text-decoration:none;">Masuk Sekarang</a>
            </div>
          `;
          if (inboxEmptyState) inboxEmptyState.style.display = 'none';
        }
      }
    }
  }

  function renderInboxRooms() {
    if (!inboxListContainer) return;

    let filtered = cachedRooms.slice();

    // Filter Chips
    if (activeFilter === 'kost') {
      filtered = filtered.filter((r) => r.tipe_referensi === 'kos');
    } else if (activeFilter === 'barang') {
      filtered = filtered.filter((r) => r.tipe_referensi === 'barang');
    } else if (activeFilter === 'unread') {
      filtered = filtered.filter((r) => r.unread_count > 0);
    }

    // Search Query
    if (searchQuery) {
      filtered = filtered.filter((r) => {
        const lawanNama = (r.lawan?.nama || '').toLowerCase();
        const refNama = (r.reference?.nama_barang || r.reference?.nama_kos || '').toLowerCase();
        const lastMsg = (r.last_message || '').toLowerCase();
        return lawanNama.includes(searchQuery) || refNama.includes(searchQuery) || lastMsg.includes(searchQuery);
      });
    }

    if (filtered.length === 0) {
      inboxListContainer.innerHTML = '';
      if (inboxEmptyState) inboxEmptyState.style.display = 'flex';
      return;
    }

    if (inboxEmptyState) inboxEmptyState.style.display = 'none';

    inboxListContainer.innerHTML = filtered.map((r) => {
      const lawan = r.lawan || { nama: 'Pengguna', role: 'pelanggan' };
      const roleBadge = lawan.role === 'pemilik_kost' ? 'Pemilik Kost' : 'Mahasiswa';
      const roleClass = lawan.role === 'pemilik_kost' ? 'teal' : 'orange';
      const initials = getInitials(lawan.nama);
      const timeFmt = formatChatTime(r.last_message_time);
      const unreadBadge = r.unread_count > 0 ? `<span class="unread-pill">${r.unread_count}</span>` : '';

      let snippet = r.last_message
        ? (Number(r.last_message_sender) === Number(currentUserId) ? 'Anda: ' : '') + r.last_message
        : 'Belum ada pesan · Ketuk untuk mulai';
      const snippetStyle = r.unread_count > 0 ? 'font-weight:700;color:#0F172A;' : 'font-weight:500;color:#64748B;';

      // Mini Attached Item Preview
      let attachedHtml = '';
      if (r.reference) {
        if (r.tipe_referensi === 'barang') {
          const harga = r.reference.harga_sewa
            ? `Rp${Number(r.reference.harga_sewa).toLocaleString('id-ID')} / hari`
            : `Rp${Number(r.reference.harga_jual || 0).toLocaleString('id-ID')}`;
          attachedHtml = `
            <div class="attached-product">
              <div class="product-mini-thumb">
                <svg viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="18"/></svg>
              </div>
              <div class="product-mini-info">
                <div class="product-mini-title">${escHtml(r.reference.nama_barang)}</div>
                <div class="product-mini-sub">${escHtml(r.reference.lokasi || 'Kampus')}</div>
              </div>
              <div class="product-mini-price orange">${harga}</div>
            </div>
          `;
        } else if (r.tipe_referensi === 'kos') {
          attachedHtml = `
            <div class="attached-product">
              <div class="product-mini-thumb">
                <svg viewBox="0 0 24 24"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </div>
              <div class="product-mini-info">
                <div class="product-mini-title">${escHtml(r.reference.nama_kos)}</div>
                <div class="product-mini-sub">${escHtml(r.reference.alamat || 'Area Kampus')}</div>
              </div>
              <div class="product-mini-price">Rp${Number(r.reference.harga_bulan || 0).toLocaleString('id-ID')} / bln</div>
            </div>
          `;
        }
      }

      return `
        <div class="chat-item" data-room="${r.id_room}" role="button" tabindex="0">
          <div class="chat-item-header">
            <div class="avatar-wrap">
              <div class="avatar-img ${roleClass}">${lawan.foto ? `<img src="${escHtml(lawan.foto)}" alt="${escHtml(lawan.nama)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : escHtml(initials)}</div>
              <div class="online-indicator"></div>
            </div>
            <div class="item-meta">
              <div class="item-top-row">
                <div class="name-row">
                  <span class="item-name">${escHtml(lawan.nama)}</span>
                  <span class="verified-badge" title="Terverifikasi">
                    <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                  <span class="item-tag ${roleClass}">${escHtml(roleBadge)}</span>
                </div>
                <span class="item-time">${timeFmt}</span>
              </div>
              <div class="item-msg-row">
                <span class="item-msg" style="${snippetStyle}">${escHtml(snippet)}</span>
                ${unreadBadge}
              </div>
            </div>
          </div>
          ${attachedHtml}
        </div>
      `;
    }).join('');

    // Tambah event click untuk tiap chat item
    inboxListContainer.querySelectorAll('.chat-item').forEach((item) => {
      item.addEventListener('click', () => {
        const rId = Number(item.getAttribute('data-room'));
        if (rId) openRoom(rId);
      });
    });
  }

  // 7. Polling Background untuk Inbox List (Setiap 4 detik)
  function startInboxPolling() {
    stopInboxPolling();
    pollInboxTimer = setInterval(() => {
      if (!activeRoomId && document.visibilityState === 'visible') {
        loadInbox(true);
      }
    }, 4000);
  }

  function stopInboxPolling() {
    if (pollInboxTimer) {
      clearInterval(pollInboxTimer);
      pollInboxTimer = null;
    }
  }

  // Filter Chips Handler
  filterChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      filterChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter = chip.getAttribute('data-filter') || 'all';
      renderInboxRooms();
    });
  });

  // Search Input Handler
  searchChatInput?.addEventListener('input', (e) => {
    searchQuery = (e.target.value || '').toLowerCase().trim();
    renderInboxRooms();
  });

  // 8. Inisialisasi Berdasarkan Query URL
  const urlParams = new URLSearchParams(window.location.search);
  const tipeParam = urlParams.get('tipe');
  const idParam = urlParams.get('id');
  const roomParam = urlParams.get('room');

  if (roomParam) {
    // Arahkan langsung ke ID room tertentu
    openRoom(Number(roomParam));
  } else if (tipeParam && idParam) {
    // Alur Tanya Barang / Kos: buat atau temukan room langsung
    try {
      const room = await KM.post('/chat/room', {
        tipe_referensi: tipeParam,
        id_referensi: Number(idParam)
      });
      if (room && room.id_room) {
        openRoom(room.id_room);
      } else {
        showInboxView();
      }
    } catch (err) {
      if (err.status === 401) {
        await KM.ui.info('Masuk dulu, ya', 'Silakan masuk ke akun kamu terlebih dahulu untuk mengirim pesan ke penjual / pemilik kos.');
        window.location.href = '/masuk.html';
      } else if (err.status === 400 && err.message.includes('sendiri')) {
        KM.ui.peringatan('Postingan Sendiri', err.message || 'Ini adalah postingan Anda sendiri.');
        showInboxView();
      } else {
        KM.ui.error('Gagal Memulai Obrolan', err.message || 'Silakan coba lagi sebentar lagi.');
        showInboxView();
      }
    }
  } else {
    // Tampilan default: Halaman Inbox Pesan Masuk
    showInboxView();
  }
});
