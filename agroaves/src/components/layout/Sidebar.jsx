import {
  Bird,
  User,
} from "lucide-react";
import { C } from "../../lib/designSystem.js";
import { NAV_ITEMS } from "../../lib/navigation.js";

export function Sidebar({ active, setActive, collapsed, user }) {
  return (
    <aside
      style={{
        width: collapsed ? 64 : 240,
        minWidth: collapsed ? 64 : 240,
        height: "100vh",
        background: C.sidebar,
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        overflow: "hidden",
        transition: "width .25s ease",
      }}
    >
      <div
        style={{
          padding: collapsed ? "16px 0" : "22px 20px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          justifyContent: collapsed ? "center" : "flex-start",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: C.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Bird size={20} color="#fff" />
        </div>
        {!collapsed ? (
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 15, lineHeight: 1 }}>AgroAves</div>
            <div style={{ color: C.sidebarText, fontSize: 10 }}>Gestao Agropecuaria</div>
          </div>
        ) : null}
      </div>

      <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              title={collapsed ? item.label : ""}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: collapsed ? "12px 0" : "11px 14px",
                borderRadius: 9,
                border: "none",
                background: isActive ? C.sidebarActive : "transparent",
                color: isActive ? C.sidebarTextActive : C.sidebarText,
                cursor: "pointer",
                marginBottom: 2,
                justifyContent: collapsed ? "center" : "flex-start",
                fontWeight: isActive ? 600 : 400,
                fontSize: 14,
              }}
              onMouseEnter={(event) => {
                if (!isActive) {
                  event.currentTarget.style.background = C.sidebarHover;
                  event.currentTarget.style.color = C.sidebarTextActive;
                }
              }}
              onMouseLeave={(event) => {
                if (!isActive) {
                  event.currentTarget.style.background = "transparent";
                  event.currentTarget.style.color = C.sidebarText;
                }
              }}
            >
              <item.icon size={18} style={{ flexShrink: 0 }} />
              {!collapsed ? item.label : null}
              {!collapsed && isActive ? (
                <div style={{ marginLeft: "auto", width: 4, height: 4, borderRadius: 2, background: C.accent }} />
              ) : null}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: "14px 8px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: collapsed ? "8px 0" : "10px 12px",
            borderRadius: 9,
            justifyContent: collapsed ? "center" : "flex-start",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#2a5438",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <User size={16} color={C.sidebarTextActive} />
          </div>
          {!collapsed ? (
            <div>
              <div style={{ color: C.sidebarTextActive, fontSize: 12, fontWeight: 600 }}>{user?.name ?? "Admin"}</div>
              <div style={{ color: C.sidebarText, fontSize: 10 }}>
                {user?.storeName ?? user?.role ?? "Gerente"}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
