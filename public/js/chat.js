// public/js/chat.js
// Handles Dual-View: Chat Inbox / List (Pilih Orang) & Chat Room (Ruang Obrolan Terpilih)
// Synchronized 100% between inbox list and chat room using localStorage

document.addEventListener('DOMContentLoaded', async () => {
  const viewChatList = document.getElementById('viewChatList');
  const viewChatRoom = document.getElementById('viewChatRoom');
  const roomBackBtn = document.getElementById('roomBackBtn');
  const searchChatInput = document.getElementById('searchChatInput');
  const filterChips = document.querySelectorAll('#filterChips .filter-chip');
  const chatItems = document.querySelectorAll('.chat-item');
  const chatCountText = document.getElementById('chatCountText');

  // Room View Elements
  const chatUserName = document.getElementById('chatUserName');
  const chatUserStatus = document.getElementById('chatUserStatus');
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

  let activeUser = 'rani';
  let activeItemId = 'kos1';
  let isDirectFromDetail = false;

  // Conversations Directory Mock Data
  const profiles = {
    rani: {
      name: 'Bu Rani',
      status: 'Online · Pemilik Kost',
      itemId: 'kos1',
      itemTitle: 'Kos Ananda Dago',
      itemPrice: 'Rp850.000 / bulan · Sewa Kost'
    },
    dimas: {
      name: 'Dimas A.',
      status: 'Online · Terverifikasi',
      itemId: '1',
      itemTitle: 'Kalkulator Scientific Casio',
      itemPrice: 'Rp5.000 / hari · Sewa'
    },
    sarah: {
      name: 'Sarah W.',
      status: 'Online · Terverifikasi',
      itemId: '3',
      itemTitle: 'Tenda Dome Camping 4P',
      itemPrice: 'Rp25.000 / hari · Sewa'
    },
    salsa: {
      name: 'Salsa P.',
      status: 'Aktif 15m lalu · Terverifikasi',
      itemId: '4',
      itemTitle: 'Modul Kalkulus 2',
      itemPrice: 'Gratis · Pinjam'
    },
    koperasi: {
      name: 'Koperasi Mahasiswa',
      status: 'Jam operasional 08.00 - 16.00',
      itemId: '8',
      itemTitle: 'Jas Lab Putih (M)',
      itemPrice: 'Rp5.000 / hari · Sewa'
    },
    budi: {
      name: 'Budi Santoso',
      status: 'Online · Terverifikasi',
      itemId: '2',
      itemTitle: 'Power Bank 20.000 mAh',
      itemPrice: 'Rp4.000 / hari · Sewa'
    }
  };

  // LocalStorage Helper
  const loadChatHistory = () => {
    try {
      const raw = localStorage.getItem('kampus_chat_history');
      if (raw) return JSON.parse(raw);
    } catch (_e) {}
    return {
      rani: [],
      dimas: [],
      sarah: [],
      salsa: [],
      koperasi: [],
      budi: []
    };
  };

  const saveChatHistory = (history) => {
    try {
      localStorage.setItem('kampus_chat_history', JSON.stringify(history));
    } catch (_e) {}
  };

  // Update Inbox Snippets based on actual chat history
  const updateInboxPreviews = () => {
    const history = loadChatHistory();
    chatItems.forEach(item => {
      const u = item.getAttribute('data-user');
      const msgs = history[u] || [];
      const msgSpan = item.querySelector('.item-msg');
      const timeSpan = item.querySelector('.item-time');
      const existingPill = item.querySelector('.unread-pill');

      if (!msgs || msgs.length === 0) {
        // Belum pernah chatan -> tampilkan teks awal kosong
        if (msgSpan) {
          msgSpan.textContent = 'Belum ada pesan · Ketuk untuk mulai obrolan';
          msgSpan.style.color = '#7A8583';
          msgSpan.style.fontStyle = 'italic';
          msgSpan.style.fontWeight = 'normal';
        }
        if (existingPill) existingPill.remove();
        item.classList.remove('unread');
      } else {
        // Sudah ada riwayat obrolan -> tampilkan pesan terakhir aktual!
        const last = msgs[msgs.length - 1];
        if (msgSpan) {
          msgSpan.textContent = (last.isOutgoing ? 'Anda: ' : '') + last.text;
          msgSpan.style.color = '#1E3A38';
          msgSpan.style.fontStyle = 'normal';
          msgSpan.style.fontWeight = last.isOutgoing ? '500' : '700';
        }
        if (timeSpan && last.time) {
          timeSpan.textContent = last.time;
        }
        item.classList.add('unread');
      }
    });
  };

  // Switch between List and Room
  const showList = () => {
    updateInboxPreviews();
    if (viewChatList && viewChatRoom) {
      viewChatList.style.display = 'flex';
      viewChatRoom.style.display = 'none';
    }
  };

  const renderBubble = (text, isOutgoing = true, timeStr = '') => {
    if (!chatThread || !text.trim()) return;

    if (emptyChatState) emptyChatState.style.display = 'none';

    const wrap = document.createElement('div');
    wrap.className = `bubble-wrap ${isOutgoing ? 'right' : 'left'}`;

    const metaCheck = isOutgoing ? `<svg viewBox="0 0 24 24"><path d="m2 12 5 5L17 7"/><path d="m9 12 3 3L22 5"/></svg>` : '';

    wrap.innerHTML = `
      <div class="bubble">
        ${escapeHtml(text)}
        <div class="bubble-meta">
          <span>${timeStr || formatTime()}</span>
          ${metaCheck}
        </div>
      </div>
    `;

    chatThread.appendChild(wrap);
    chatThread.scrollTop = chatThread.scrollHeight;
  };

  const showRoom = (userKey, itemId) => {
    activeUser = userKey || 'dimas';
    const profile = profiles[activeUser] || profiles.dimas;
    activeItemId = itemId || profile.itemId;

    if (chatUserName) chatUserName.textContent = profile.name;
    if (chatUserStatus) chatUserStatus.textContent = profile.status;
    if (pinnedTitle) pinnedTitle.textContent = profile.itemTitle;
    if (pinnedPrice) pinnedPrice.textContent = profile.itemPrice;
    if (emptyGreeting) emptyGreeting.textContent = `Mulai Obrolan dengan ${profile.name}`;

    // Load actual messages from localStorage
    const history = loadChatHistory();
    const msgs = history[activeUser] || [];

    // Clear existing bubbles
    const existingBubbles = chatThread.querySelectorAll('.bubble-wrap');
    existingBubbles.forEach(b => b.remove());

    if (msgs.length === 0) {
      if (emptyChatState) emptyChatState.style.display = 'flex';
    } else {
      if (emptyChatState) emptyChatState.style.display = 'none';
      msgs.forEach(m => renderBubble(m.text, m.isOutgoing, m.time));
    }

    // Try fetching live item name if from backend
    if (itemId) {
      KM.get(`/barang/${itemId}`)
        .then(data => {
          if (data.nama_barang && pinnedTitle) pinnedTitle.textContent = data.nama_barang;
          if (data.harga_sewa && pinnedPrice) pinnedPrice.textContent = `Rp${data.harga_sewa.toLocaleString('id-ID')} / hari · Sewa`;
        })
        .catch(() => {});
    }

    if (viewChatList && viewChatRoom) {
      viewChatList.style.display = 'none';
      viewChatRoom.style.display = 'flex';
    }
  };

  // Check URL params on load
  const urlParams = new URLSearchParams(window.location.search);
  const paramSeller = urlParams.get('seller');
  const paramItem = urlParams.get('item');
  const paramName = urlParams.get('nama');
  const paramTitle = urlParams.get('title');
  const paramSub = urlParams.get('sub');

  if (paramSeller) {
    if (!profiles[paramSeller]) {
      profiles[paramSeller] = {
        name: paramName || 'Pemilik Kos',
        status: 'Online · Terverifikasi',
        itemId: paramItem || '',
        itemTitle: paramTitle || 'Kamar Kos',
        itemPrice: paramSub || 'Sewa Bulanan'
      };
    } else {
      if (paramName) profiles[paramSeller].name = paramName;
      if (paramTitle) profiles[paramSeller].itemTitle = paramTitle;
      if (paramSub) profiles[paramSeller].itemPrice = paramSub;
    }
  }

  if (paramSeller || paramItem) {
    isDirectFromDetail = true;
    showRoom(paramSeller || 'dimas', paramItem || '1');
  } else {
    showList();
  }

  // Back button in Room View
  if (roomBackBtn) {
    roomBackBtn.addEventListener('click', () => {
      if (isDirectFromDetail && window.history.length > 1) {
        window.history.back();
      } else {
        showList();
      }
    });
  }

  // Click on Chat List Items
  chatItems.forEach(item => {
    item.addEventListener('click', () => {
      const u = item.getAttribute('data-user') || 'dimas';
      const it = item.getAttribute('data-item') || '1';
      showRoom(u, it);
    });
  });

  // Search filter in Chat List
  if (searchChatInput) {
    searchChatInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      let matchCount = 0;
      chatItems.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(q)) {
          card.style.display = 'flex';
          matchCount++;
        } else {
          card.style.display = 'none';
        }
      });
      if (chatCountText) chatCountText.textContent = `${matchCount} percakapan ditemukan`;
    });
  }

  // Filter chips in Chat List
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const filter = chip.getAttribute('data-filter');

      let visibleCount = 0;
      chatItems.forEach(card => {
        const isUnread = card.classList.contains('unread');
        const type = card.getAttribute('data-type');

        if (filter === 'semua') {
          card.style.display = 'flex';
          visibleCount++;
        } else if (filter === 'unread') {
          const show = isUnread;
          card.style.display = show ? 'flex' : 'none';
          if (show) visibleCount++;
        } else if (filter === type) {
          card.style.display = 'flex';
          visibleCount++;
        } else {
          card.style.display = 'none';
        }
      });
      if (chatCountText) chatCountText.textContent = `${visibleCount} percakapan`;
    });
  });

  // Pinned item click inside Room -> go to detail
  if (pinnedCard) {
    pinnedCard.addEventListener('click', () => {
      window.location.href = `/detail.html?id=${activeItemId}`;
    });
  }

  if (chipAjukanSewa) {
    chipAjukanSewa.addEventListener('click', () => {
      window.location.href = `/detail.html?id=${activeItemId}`;
    });
  }

  // Helpers
  const formatTime = () => {
    const d = new Date();
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}.${m}`;
  };

  const escapeHtml = (str) => {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  const getOwnerReply = (userMsg, targetUser) => {
    const lower = userMsg.toLowerCase();
    const currentProfile = profiles[targetUser] || profiles.dimas;
    let reply = `Halo kak! Silakan langsung ajukan lewat tombol di atas ya, nanti segera saya setujui.`;

    if (lower.includes('tersedia') || lower.includes('ready') || lower.includes('ada')) {
      reply = `Iya kak, barangnya masih ready dan siap pakai. Mau disewa untuk berapa hari kak?`;
    } else if (lower.includes('nego') || lower.includes('harga') || lower.includes('kurang') || lower.includes('diskon')) {
      reply = `Boleh kak, kalau ambil 3 hari atau lebih saya kasih potongan khusus. Mau ambil berapa lama?`;
    } else if (lower.includes('lokasi') || lower.includes('temu') || lower.includes('mana') || lower.includes('kampus')) {
      reply = `Bisa ketemuan di Fakultas Teknik lantai 2 atau depan perpus kampus ya kak. Jam berapa bisanya?`;
    } else if (lower.includes('kondisi') || lower.includes('baterai') || lower.includes('rusak')) {
      reply = `Kondisinya mulus dan bersih kak, tombol normal dan siap pakai untuk kuliah.`;
    } else if (lower.includes('makasih') || lower.includes('terima kasih') || lower.includes('ok') || lower.includes('siap')) {
      reply = `Sama-sama kak! Ditunggu konfirmasinya ya.`;
    }

    return reply;
  };

  const handleSend = () => {
    const val = msgInput.value.trim();
    if (!val) return;

    const timeStr = formatTime();

    // 1. Render in thread
    renderBubble(val, true, timeStr);

    // 2. Save in localStorage
    const history = loadChatHistory();
    if (!history[activeUser]) history[activeUser] = [];
    history[activeUser].push({ text: val, isOutgoing: true, time: timeStr });
    saveChatHistory(history);

    // 3. Update inbox list snippet in background
    updateInboxPreviews();

    msgInput.value = '';
    msgInput.focus();

    // 4. Owner auto reply
    setTimeout(() => {
      const reply = getOwnerReply(val, activeUser);
      const replyTime = formatTime();
      renderBubble(reply, false, replyTime);

      const h = loadChatHistory();
      if (!h[activeUser]) h[activeUser] = [];
      h[activeUser].push({ text: reply, isOutgoing: false, time: replyTime });
      saveChatHistory(h);

      updateInboxPreviews();
    }, 900);
  };

  if (sendBtn) {
    sendBtn.addEventListener('click', handleSend);
  }

  if (msgInput) {
    msgInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      }
    });
  }

  quickChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const msg = chip.getAttribute('data-msg');
      if (msg) {
        msgInput.value = msg;
        handleSend();
      }
    });
  });

  // Initial update
  updateInboxPreviews();
});
