const PAYMENT_LABELS = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  cartao: "Cartao",
  fiado: "Fiado",
};

const CATEGORY_LABELS = {
  racoes: "Racoes",
  medicamentos: "Medicamentos",
  aves: "Aves",
  utensilios: "Utensilios",
};

const BRASILIA_TIME_ZONE = "America/Sao_Paulo";
const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function nowIso() {
  return new Date().toISOString();
}

export function dateOnly(value) {
  return value ? String(value).slice(0, 10) : null;
}

export function brasiliaDateKey(value) {
  if (!value) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRASILIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));

  const read = (type) => parts.find((entry) => entry.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")}`;
}

export function formatDatePt(value) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRASILIA_TIME_ZONE,
  }).format(new Date(value));
}

export function formatTimePt(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BRASILIA_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function daysUntil(value) {
  if (!value) {
    return null;
  }

  const target = new Date(`${dateOnly(value)}T00:00:00`);
  const today = new Date();
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.ceil((target - current) / 86400000);
}

export function categoryLabel(value) {
  if (!value) {
    return "Sem categoria";
  }

  return CATEGORY_LABELS[value] ?? String(value)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function paymentLabel(value) {
  return PAYMENT_LABELS[value] ?? value;
}

export function groupBy(items, getKey) {
  const grouped = new Map();

  for (const item of items) {
    const key = getKey(item);
    const bucket = grouped.get(key);
    if (bucket) {
      bucket.push(item);
    } else {
      grouped.set(key, [item]);
    }
  }

  return grouped;
}

export function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

export function shortWeekday(date) {
  return WEEKDAY_LABELS[new Date(date).getDay()];
}

export function shortMonth(date) {
  return MONTH_LABELS[new Date(date).getMonth()];
}

export function clampNumber(value, min, max) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return min;
  }

  return Math.min(max, Math.max(min, parsed));
}

export function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function safeTrim(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function interpolateTemplate(template, variables) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, token) => {
    return variables[token] ?? "";
  });
}

export function saleNumberFromId(id) {
  return `#${String(id).padStart(4, "0")}`;
}

export function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function addDays(date, amount) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

export function addMonths(date, amount) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + amount);
  return copy;
}

export function buildWindowDates(days) {
  const today = startOfDay(new Date());
  return Array.from({ length: days }, (_, index) => addDays(today, index - (days - 1)));
}

export function buildMonthDates(months) {
  const reference = new Date();
  reference.setDate(1);
  reference.setHours(0, 0, 0, 0);
  return Array.from({ length: months }, (_, index) => addMonths(reference, index - (months - 1)));
}
