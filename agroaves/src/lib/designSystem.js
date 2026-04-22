export const C = {
  sidebar: "#152318",
  sidebarHover: "#1e3425",
  sidebarActive: "#2a5438",
  sidebarText: "#7daa8a",
  sidebarTextActive: "#c8ecd0",
  accent: "#D4880C",
  accentHover: "#b8740a",
  bg: "#F3EDE1",
  card: "#FFFFFF",
  text: "#18181b",
  textSec: "#71717a",
  border: "rgba(0,0,0,0.07)",
  borderMed: "rgba(0,0,0,0.12)",
  success: "#14532d",
  successBg: "#dcfce7",
  warning: "#78350f",
  warningBg: "#fef3c7",
  danger: "#7f1d1d",
  dangerBg: "#fee2e2",
  info: "#0c4a6e",
  infoBg: "#e0f2fe",
};

export const shadow = "0 1px 3px rgba(0,0,0,0.06), 0 1px 8px rgba(0,0,0,0.04)";
export const shadowMd = "0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)";

export const CAT_LABELS = {
  racoes: "Racoes",
  medicamentos: "Medicamentos",
  aves: "Aves",
  utensilios: "Utensilios",
};

export const PAYMENT_LABELS = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  cartao: "Cartao",
  fiado: "Fiado",
};

export const MESSAGE_CHANNEL_LABELS = {
  whatsapp: "WhatsApp",
  email: "E-mail",
  sms: "SMS",
};

export function fmt(value) {
  return `R$ ${Number(value ?? 0)
    .toFixed(2)
    .replace(".", ",")
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

export function fmtQty(value, unit = "") {
  const numeric = Number(value ?? 0);
  const rounded = Math.round(numeric * 1000) / 1000;
  const isInteger = Math.abs(rounded - Math.round(rounded)) < 0.0001;
  const formatted = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: isInteger ? 0 : 3,
    maximumFractionDigits: 3,
  }).format(rounded);

  return unit ? `${formatted} ${unit}` : formatted;
}

export function fmtDate(value) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

export function fmtTime(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function daysUntil(value) {
  if (!value) {
    return null;
  }

  const target = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  const today = new Date();
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.ceil((target - current) / 86400000);
}

export function catColor(category) {
  return {
    racoes: { bg: "#dcfce7", text: "#14532d" },
    medicamentos: { bg: "#fef3c7", text: "#78350f" },
    aves: { bg: "#e0f2fe", text: "#0c4a6e" },
    utensilios: { bg: "#f3e8ff", text: "#581c87" },
  }[category] ?? { bg: "#f4f4f5", text: "#3f3f46" };
}

export function payColor(payment) {
  return {
    Pix: { bg: "#dcfce7", text: "#14532d" },
    Dinheiro: { bg: "#fef9c3", text: "#713f12" },
    Cartao: { bg: "#e0f2fe", text: "#0c4a6e" },
    Fiado: { bg: "#fee2e2", text: "#7f1d1d" },
  }[payment] ?? { bg: "#f4f4f5", text: "#3f3f46" };
}

export const globalStyleText = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { width: 100%; min-height: 100%; }
  body {
    margin: 0;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    background: ${C.bg};
    color: ${C.text};
  }
  button, input, select, textarea { font: inherit; }
  button:focus-visible { outline: 2px solid ${C.accent}; outline-offset: 2px; }
  input:focus, select:focus, textarea:focus {
    border-color: ${C.accent} !important;
    box-shadow: 0 0 0 3px ${C.accent}22;
  }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
`;
