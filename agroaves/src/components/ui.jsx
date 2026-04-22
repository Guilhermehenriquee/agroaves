import { Search, X } from "lucide-react";
import { C, shadow, shadowMd } from "../lib/designSystem.js";

export function Badge({ label, bg, text, size = 12 }) {
  return (
    <span
      style={{
        background: bg,
        color: text,
        fontSize: size,
        fontWeight: 500,
        padding: "2px 8px",
        borderRadius: 20,
        display: "inline-block",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

export function Card({ children, style = {} }) {
  return (
    <div
      style={{
        background: C.card,
        borderRadius: 12,
        boxShadow: shadow,
        border: `1px solid ${C.border}`,
        padding: "20px 22px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function KpiCard({ icon: Icon, label, value, sub, color = C.accent, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: C.card,
        borderRadius: 12,
        boxShadow: shadow,
        border: `1px solid ${C.border}`,
        padding: "18px 20px",
        cursor: onClick ? "pointer" : "default",
      }}
      onMouseEnter={(event) => {
        if (onClick) {
          event.currentTarget.style.boxShadow = shadowMd;
        }
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.boxShadow = shadow;
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div
          style={{
            background: `${color}18`,
            borderRadius: 10,
            width: 42,
            height: 42,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={20} color={color} />
        </div>
        {sub ? (
          <span
            style={{
              fontSize: 11,
              color: sub.up ? C.success : C.danger,
              background: sub.up ? C.successBg : C.dangerBg,
              padding: "2px 7px",
              borderRadius: 20,
              fontWeight: 500,
            }}
          >
            {sub.label}
          </span>
        ) : null}
      </div>
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.text, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: C.textSec, marginTop: 4 }}>{label}</div>
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, width = 600, children }) {
  if (!open) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: C.card,
          borderRadius: 16,
          width: "100%",
          maxWidth: width,
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: shadowMd,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 24px",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 16, color: C.text }}>{title}</span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: C.textSec,
              borderRadius: 8,
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: "22px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

export function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label ? (
        <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSec, marginBottom: 5 }}>
          {label}
        </label>
      ) : null}
      <input
        {...props}
        style={{
          width: "100%",
          border: `1.5px solid ${C.borderMed}`,
          borderRadius: 8,
          padding: "9px 12px",
          fontSize: 14,
          color: C.text,
          background: "#fff",
          outline: "none",
          ...props.style,
        }}
      />
    </div>
  );
}

export function Select({ label, children, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label ? (
        <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSec, marginBottom: 5 }}>
          {label}
        </label>
      ) : null}
      <select
        {...props}
        style={{
          width: "100%",
          border: `1.5px solid ${C.borderMed}`,
          borderRadius: 8,
          padding: "9px 12px",
          fontSize: 14,
          color: C.text,
          background: "#fff",
          outline: "none",
        }}
      >
        {children}
      </select>
    </div>
  );
}

export function TextArea({ label, ...props }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label ? (
        <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: C.textSec, marginBottom: 5 }}>
          {label}
        </label>
      ) : null}
      <textarea
        {...props}
        style={{
          width: "100%",
          border: `1.5px solid ${C.borderMed}`,
          borderRadius: 8,
          padding: "9px 12px",
          fontSize: 13,
          resize: "vertical",
          fontFamily: "inherit",
          outline: "none",
          ...props.style,
        }}
      />
    </div>
  );
}

export function Btn({ children, onClick, variant = "primary", size = "md", icon: Icon, style = {}, disabled = false, type = "button" }) {
  const base = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    border: "none",
    borderRadius: 9,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.65 : 1,
    ...style,
  };
  const variants = {
    primary: {
      background: C.accent,
      color: "#fff",
      padding: size === "sm" ? "7px 14px" : "10px 20px",
      fontSize: size === "sm" ? 13 : 14,
    },
    outline: {
      background: "transparent",
      color: C.text,
      border: `1.5px solid ${C.borderMed}`,
      padding: size === "sm" ? "6px 13px" : "9px 19px",
      fontSize: size === "sm" ? 13 : 14,
    },
    ghost: {
      background: "transparent",
      color: C.textSec,
      padding: "6px 10px",
      fontSize: 13,
    },
    danger: {
      background: C.dangerBg,
      color: C.danger,
      padding: size === "sm" ? "7px 14px" : "10px 20px",
      fontSize: 14,
    },
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      style={{ ...base, ...variants[variant] }}
      onMouseEnter={(event) => {
        if (!disabled) {
          event.currentTarget.style.opacity = "0.82";
        }
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.opacity = disabled ? "0.65" : "1";
      }}
    >
      {Icon ? <Icon size={15} /> : null}
      {children}
    </button>
  );
}

export function SectionHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 2 }}>{title}</h2>
        {subtitle ? <p style={{ fontSize: 13, color: C.textSec }}>{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Table({ headers, rows, empty = "Nenhum registro encontrado" }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                style={{
                  padding: "10px 14px",
                  textAlign: "left",
                  color: C.textSec,
                  fontWeight: 600,
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  borderBottom: `1.5px solid ${C.border}`,
                  whiteSpace: "nowrap",
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} style={{ padding: 32, textAlign: "center", color: C.textSec }}>
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr
                key={index}
                style={{ borderBottom: `1px solid ${C.border}` }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background = "#fafaf9";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = "transparent";
                }}
              >
                {row}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Td({ children, style = {} }) {
  return <td style={{ padding: "11px 14px", color: C.text, verticalAlign: "middle", ...style }}>{children}</td>;
}

export function SearchField({ value, onChange, placeholder }) {
  return (
    <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
      <Search size={15} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: C.textSec }} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          border: `1.5px solid ${C.borderMed}`,
          borderRadius: 8,
          padding: "8px 12px 8px 34px",
          fontSize: 13,
          outline: "none",
        }}
      />
    </div>
  );
}

export function EmptyState({ title, description }) {
  return (
    <Card style={{ textAlign: "center", color: C.textSec, padding: "36px 24px" }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13 }}>{description}</div>
    </Card>
  );
}

export function LoadingCard({ label = "Carregando..." }) {
  return <Card style={{ textAlign: "center", color: C.textSec }}>{label}</Card>;
}

export function ErrorCard({ message, onRetry }) {
  return (
    <Card style={{ borderColor: "#fecaca", background: "#fff7f7" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.danger, marginBottom: 8 }}>Nao foi possivel carregar.</div>
      <div style={{ fontSize: 13, color: C.textSec, marginBottom: onRetry ? 12 : 0 }}>{message}</div>
      {onRetry ? <Btn onClick={onRetry}>Tentar novamente</Btn> : null}
    </Card>
  );
}
