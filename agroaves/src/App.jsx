import { Bell, LogOut, Menu, ShoppingCart } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api/service.js";
import { Sidebar } from "./components/layout/Sidebar.jsx";
import { Btn, Modal } from "./components/ui.jsx";
import { useAuth } from "./context/useAuth.js";
import { C, globalStyleText } from "./lib/designSystem.js";
import { NAV_ITEMS } from "./lib/navigation.js";
import { ClientsPage } from "./pages/ClientsPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { FiscalPage } from "./pages/FiscalPage.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { MessagesPage } from "./pages/MessagesPage.jsx";
import { PdvPage } from "./pages/PdvPage.jsx";
import { ProductsPage } from "./pages/ProductsPage.jsx";
import { ReportsPage } from "./pages/ReportsPage.jsx";
import { StockPage } from "./pages/StockPage.jsx";
import { SuppliersPage } from "./pages/SuppliersPage.jsx";

function LoadingScreen() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, color: C.textSec }}>
      Carregando sistema...
    </div>
  );
}

function buildNotificationItems(dashboard) {
  if (!dashboard) {
    return [];
  }

  const lowStock = dashboard.alerts.lowStock.map((product) => ({
    id: `stock-${product.id}`,
    title: "Estoque baixo",
    description: `${product.name} esta abaixo do minimo em estoque.`,
    page: "estoque",
  }));
  const expiring = dashboard.alerts.expiring.map((product) => ({
    id: `expiry-${product.id}`,
    title: "Produto vencendo",
    description: `${product.name} vence em breve e precisa de acompanhamento.`,
    page: "estoque",
  }));

  return [...lowStock, ...expiring];
}

function AppShell() {
  const { user, logout } = useAuth();
  const [page, setPage] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [notifications, setNotifications] = useState(0);
  const [notificationItems, setNotificationItems] = useState([]);
  const [notificationOpen, setNotificationOpen] = useState(false);

  const refreshHeader = useCallback(async () => {
    try {
      const dashboard = await api.getDashboard();
      const items = buildNotificationItems(dashboard);
      setNotifications(items.length || dashboard.notifications);
      setNotificationItems(items);
    } catch {
      setNotifications(0);
      setNotificationItems([]);
    }
  }, []);

  useEffect(() => {
    void refreshHeader();
  }, [refreshHeader]);

  const pageTitle = useMemo(() => {
    return NAV_ITEMS.find((item) => item.id === page)?.label ?? "";
  }, [page]);

  function renderPage() {
    switch (page) {
      case "dashboard":
        return <DashboardPage onNavigate={setPage} />;
      case "pdv":
        return <PdvPage onDataChanged={refreshHeader} />;
      case "produtos":
        return <ProductsPage onDataChanged={refreshHeader} />;
      case "estoque":
        return <StockPage />;
      case "clientes":
        return <ClientsPage onDataChanged={refreshHeader} />;
      case "fornecedores":
        return <SuppliersPage />;
      case "relatorios":
        return <ReportsPage />;
      case "mensagens":
        return <MessagesPage />;
      case "fiscal":
        return <FiscalPage />;
      default:
        return <DashboardPage onNavigate={setPage} />;
    }
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg, overflow: "hidden" }}>
      <style>{globalStyleText}</style>

      <Sidebar active={page} setActive={setPage} collapsed={collapsed} user={user} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ height: 60, background: C.card, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 24px", gap: 14, flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <button onClick={() => setCollapsed((current) => !current)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textSec, padding: 4, borderRadius: 6, display: "flex" }}>
            <Menu size={18} />
          </button>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 700, color: C.text, fontSize: 15 }}>{pageTitle}</span>
            <span style={{ color: C.textSec, fontSize: 12, marginLeft: 8 }}>
              {new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(new Date())}
            </span>
            {user?.storeName ? (
              <span style={{ color: C.textSec, fontSize: 12, marginLeft: 8 }}>
                Loja: {user.storeName}
              </span>
            ) : null}
          </div>
          <button onClick={() => setPage("pdv")} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 9, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <ShoppingCart size={15} />
            Nova Venda
          </button>
          <div style={{ position: "relative" }}>
            <button onClick={() => setNotificationOpen(true)} style={{ background: "none", border: `1px solid ${C.borderMed}`, borderRadius: 9, padding: "7px 10px", cursor: "pointer", display: "flex", color: C.textSec }}>
              <Bell size={17} />
            </button>
            {notifications > 0 ? (
              <div style={{ position: "absolute", top: -4, right: -4, background: "#dc2626", color: "#fff", borderRadius: 20, width: 17, height: 17, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {notifications}
              </div>
            ) : null}
          </div>
          <Btn variant="outline" icon={LogOut} onClick={logout}>Sair</Btn>
        </header>

        <main style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>{renderPage()}</main>
      </div>

      <Modal open={notificationOpen} onClose={() => setNotificationOpen(false)} title="Notificacoes" width={520}>
        {notificationItems.length === 0 ? (
          <div style={{ fontSize: 13, color: C.textSec }}>Nenhuma notificacao pendente no momento.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {notificationItems.map((item) => (
              <div key={item.id} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", background: C.bg }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{item.title}</div>
                <div style={{ fontSize: 12, color: C.textSec, marginTop: 4 }}>{item.description}</div>
                <div style={{ marginTop: 10 }}>
                  <Btn size="sm" onClick={() => {
                    setPage(item.page);
                    setNotificationOpen(false);
                  }}
                  >
                    Ver agora
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function App() {
  const { login, status, isAuthenticated } = useAuth();

  if (status === "booting") {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={login} />;
  }

  return <AppShell />;
}
