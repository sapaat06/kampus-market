// Ikon SVG inline. Semua memakai currentColor supaya mudah diwarnai CSS.
const svg = (body, fill = 'none') =>
  `<svg class="ic" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const iconHome = svg('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-7h6v7"/>');
export const iconSearch = svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>');
export const iconChat = svg('<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-4-.9L3 21l1.7-4.4A8.4 8.4 0 1 1 21 11.5Z"/>');
export const iconUser = svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>');
export const iconPlus = svg('<path d="M12 5v14M5 12h14"/>');
export const iconBack = svg('<path d="m15 18-6-6 6-6"/>');
export const iconPin = svg('<path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>');
export const iconFilter = svg('<path d="M4 6h16M7 12h10M10 18h4"/>');
export const iconCheck = svg('<path d="m5 12 4 4L19 6"/>');
export const iconHeart = svg('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>');
export const iconStar = svg('<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3Z"/>');
export const iconLeaf = svg('<path d="M20 4c-8 0-14 4-14 10a6 6 0 0 0 6 6c6 0 8-6 8-16Z"/><path d="M4 21c2-5 6-8 12-10"/>');
export const iconCalendar = svg('<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/>');
export const iconBox = svg('<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>');
export const iconBook = svg('<path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H20v18H7.5A3.5 3.5 0 0 0 4 23V5.5Z"/><path d="M4 19.5A3.5 3.5 0 0 1 7.5 16H20"/>');
export const iconCalculator = svg('<rect x="5" y="2" width="14" height="20" rx="3"/><path d="M8 6h8M8 11h2M12 11h2M16 11h.01M8 15h2M12 15h2M16 15h.01M8 19h2M12 19h2M16 19h.01"/>');
export const iconFlask = svg('<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7.5 15h9"/>');
export const iconLamp = svg('<path d="M9 3h6l2 8H7L9 3Z"/><path d="M12 11v7"/><path d="M8 21h8"/>');
export const iconBall = svg('<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/>');
export const iconGrid = svg('<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>');
export const iconSend = svg('<path d="m22 2-7 20-4-9-9-4 20-7Z"/><path d="M22 2 11 13"/>');
export const iconShield = svg('<path d="M12 3 20 6v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3Z"/><path d="m9 12 2 2 4-4"/>');
export const iconClock = svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>');
export const iconSpark = svg('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>');
export const iconArrow = svg('<path d="M5 12h14M13 6l6 6-6 6"/>');
export const iconImage = svg('<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>');
export const iconLogout = svg('<path d="M10 17l5-5-5-5M15 12H3"/><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/>');

const kategori = {
  1: iconCalculator,
  2: iconBook,
  3: iconLamp,
  4: iconFlask,
  5: iconBall,
};

export const kategoriIcon = (id) => kategori[Number(id)] ?? iconBox;

export const kategoriKelas = (id) => `c${((Number(id) || 0) % 6 + 6) % 6}`;
