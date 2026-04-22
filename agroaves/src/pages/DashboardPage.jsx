import { useCallback, useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, Clock, DollarSign, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { Cell, Pie, PieChart, Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api/service.js";
import { Badge, Card, ErrorCard, KpiCard, LoadingCard, SectionHeader, Table, Td } from "../components/ui.jsx";
import { C, fmt, payColor } from "../lib/designSystem.js";

export function DashboardPage({ onNavigate }) {
  const [state, setState] = useState({ loading: true, error: "", data: null });

  const loadDashboard = useCallback(async () => {
    try {
      const data = await api.getDashboard();
      setState({ loading: false, error: "", data });
    } catch (error) {
      setState({ loading: false, error: error.message, data: null });
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (state.loading) {
    return <LoadingCard label="Carregando dashboard..." />;
  }

  if (state.error) {
    return <ErrorCard message={state.error} onRetry={loadDashboard} />;
  }

  const { data } = state;
  const lowStock = data.alerts.lowStock;
  const expiring = data.alerts.expiring;

  return (
    <div>
      <SectionHeader title="Dashboard" subtitle={`Visao geral da operacao — ${data.dateLabel}`} />

      {(expiring.length > 0 || lowStock.length > 0) && (
        <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 8 }}>
          {expiring.length > 0 ? (
            <div
              style={{
                background: C.warningBg,
                border: "1px solid #fde68a",
                borderRadius: 10,
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <AlertCircle size={16} color={C.warning} />
              <span style={{ fontSize: 13, color: C.warning, fontWeight: 500 }}>
                {expiring.length} produto(s) vencendo em 30 dias.
              </span>
              <button
                onClick={() => onNavigate("estoque")}
                style={{ background: "none", border: "none", color: C.warning, fontWeight: 700, cursor: "pointer", fontSize: 13, textDecoration: "underline" }}
              >
                Ver estoque →
              </button>
            </div>
          ) : null}
          {lowStock.length > 0 ? (
            <div
              style={{
                background: C.dangerBg,
                border: "1px solid #fca5a5",
                borderRadius: 10,
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <AlertTriangle size={16} color={C.danger} />
              <span style={{ fontSize: 13, color: C.danger, fontWeight: 500 }}>
                {lowStock.length} produto(s) com estoque abaixo do minimo.
              </span>
              <button
                onClick={() => onNavigate("estoque")}
                style={{ background: "none", border: "none", color: C.danger, fontWeight: 700, cursor: "pointer", fontSize: 13, textDecoration: "underline" }}
              >
                Ver agora →
              </button>
            </div>
          ) : null}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 24 }}>
        <KpiCard icon={DollarSign} label="Vendas Hoje" value={fmt(data.metrics.salesToday)} sub={{ up: true, label: "dados reais" }} color={C.accent} />
        <KpiCard icon={Users} label="Clientes c/ Fiado" value={data.metrics.openCreditClients} sub={{ up: false, label: fmt(data.metrics.totalOpenCredit) }} color="#dc2626" onClick={() => onNavigate("clientes")} />
        <KpiCard icon={AlertTriangle} label="Estoque Baixo" value={`${data.metrics.lowStockCount} itens`} color="#ea580c" onClick={() => onNavigate("estoque")} />
        <KpiCard icon={TrendingUp} label="Ticket Medio" value={fmt(data.metrics.averageTicket)} color="#2563eb" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16, marginBottom: 16 }}>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>Vendas da Semana</div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.salesWeek} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="dashboard-sales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.accent} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.textSec }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: C.textSec }} axisLine={false} tickLine={false} tickFormatter={(value) => `R$${(value / 1000).toFixed(1)}k`} />
                <Tooltip formatter={(value) => [fmt(value)]} contentStyle={{ borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12 }} />
                <Area type="monotone" dataKey="Vendas" stroke={C.accent} strokeWidth={2.5} fill="url(#dashboard-sales)" />
                <Line type="monotone" dataKey="Meta" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>Vendas por Categoria</div>
          <div style={{ height: 190 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.categoryPie} innerRadius={45} outerRadius={72} dataKey="value" paddingAngle={3}>
                  {data.categoryPie.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`]} contentStyle={{ borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {data.categoryPie.map((category) => (
              <div key={category.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: category.color, flexShrink: 0 }} />
                <span style={{ flex: 1, color: C.textSec }}>{category.name}</span>
                <span style={{ fontWeight: 600 }}>{category.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>Ultimas Vendas</div>
        <Table
          headers={["Venda", "Cliente", "Itens", "Total", "Pagamento", "Horario"]}
          rows={data.recentSales.map((sale) => {
            const paymentStyle = payColor(sale.pay);
            return [
              <Td key="id">
                <span style={{ fontWeight: 600, color: C.accent }}>{sale.id}</span>
              </Td>,
              <Td key="client">{sale.client}</Td>,
              <Td key="items">{sale.items}</Td>,
              <Td key="total">
                <span style={{ fontWeight: 700 }}>{fmt(sale.total)}</span>
              </Td>,
              <Td key="pay">
                <Badge label={sale.pay} bg={paymentStyle.bg} text={paymentStyle.text} />
              </Td>,
              <Td key="time">
                <span style={{ color: C.textSec, display: "flex", alignItems: "center", gap: 4 }}>
                  <Clock size={12} />
                  {sale.time}
                </span>
              </Td>,
            ];
          })}
        />
      </Card>
    </div>
  );
}
