import { useCallback, useEffect, useState } from "react";
import { DollarSign, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api/service.js";
import { Badge, Card, ErrorCard, KpiCard, LoadingCard, SectionHeader, Select, Table, Td } from "../components/ui.jsx";
import { C, catColor, categoryLabel, fmt } from "../lib/designSystem.js";

export function ReportsPage() {
  const [period, setPeriod] = useState("week");
  const [brand, setBrand] = useState("all");
  const [state, setState] = useState({ loading: true, error: "", data: null });

  const loadReports = useCallback(async () => {
    try {
      setState((current) => ({ ...current, loading: true, error: "" }));
      const data = await api.getReports(period, brand);
      setState({ loading: false, error: "", data });
    } catch (error) {
      setState({ loading: false, error: error.message, data: null });
    }
  }, [brand, period]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  if (state.loading) {
    return <LoadingCard label="Carregando relatorios..." />;
  }

  if (state.error) {
    return <ErrorCard message={state.error} onRetry={loadReports} />;
  }

  const { data } = state;

  return (
    <div>
      <SectionHeader
        title="Relatorios"
        subtitle="Analise de vendas, desempenho por marca e produtos"
        action={
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                ["week", "Esta Semana"],
                ["month", "Ultimos Meses"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setPeriod(value)}
                  style={{
                    padding: "7px 16px",
                    borderRadius: 8,
                    border: `1.5px solid ${period === value ? C.accent : C.borderMed}`,
                    background: period === value ? C.accent : "transparent",
                    color: period === value ? "#fff" : C.textSec,
                    fontWeight: period === value ? 600 : 400,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div style={{ minWidth: 210 }}>
              <Select label="Marca" value={brand} onChange={(event) => setBrand(event.target.value)}>
                <option value="all">Todas as marcas</option>
                {data.brands.map((currentBrand) => (
                  <option key={currentBrand} value={currentBrand}>
                    {currentBrand}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 16 }}>
        <KpiCard icon={DollarSign} label="Total do Periodo" value={fmt(data.summary.totalSales)} color={C.accent} />
        <KpiCard icon={ShoppingCart} label="Vendas Realizadas" value={data.summary.saleCount} color="#2563eb" />
        <KpiCard icon={TrendingUp} label="Ticket Medio" value={fmt(data.summary.averageTicket)} color="#7c3aed" />
        <KpiCard icon={Users} label="Clientes Atendidos" value={data.summary.clientsServed} color={C.success} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16, marginBottom: 16 }}>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>Evolucao de Vendas</div>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="report-sales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.accent} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.textSec }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: C.textSec }} axisLine={false} tickLine={false} tickFormatter={(value) => `R$${(value / 1000).toFixed(1)}k`} />
                <Tooltip formatter={(value) => [fmt(value)]} contentStyle={{ borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12 }} />
                <Area type="monotone" dataKey="Vendas" stroke={C.accent} strokeWidth={2.5} fill="url(#report-sales)" />
                <Line type="monotone" dataKey="Meta" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>Vendas por Categoria</div>
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.categoryPie} innerRadius={50} outerRadius={78} dataKey="value" paddingAngle={3} label={({ value }) => `${value}%`} labelLine={false}>
                  {data.categoryPie.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`]} contentStyle={{ borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
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

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Vendas por Marca</div>
            <div style={{ fontSize: 12, color: C.textSec }}>
              Filtro atual: {brand === "all" ? "todas as marcas" : brand}
            </div>
          </div>
          {brand !== "all" ? <Badge label={`Marca selecionada: ${brand}`} bg={C.infoBg} text={C.info} /> : null}
        </div>
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.brandSales}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.textSec }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: C.textSec }} axisLine={false} tickLine={false} tickFormatter={(value) => `R$${(value / 1000).toFixed(1)}k`} />
              <Tooltip formatter={(value) => [fmt(value)]} contentStyle={{ borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12 }} />
              <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                {data.brandSales.map((entry) => (
                  <Cell key={entry.name} fill={brand === "all" || brand === entry.name ? C.accent : "#d4d4d8"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>Produtos Mais Vendidos</div>
        <Table
          headers={["#", "Produto", "Categoria", "Qtd Vendida", "Receita", "Margem"]}
          rows={data.topProducts.map((product, index) => {
            const categoryStyle = catColor(product.cat);
            return [
              <Td key="index"><span style={{ fontWeight: 700, color: C.accent, fontSize: 16 }}>#{index + 1}</span></Td>,
              <Td key="name">
                <span style={{ fontWeight: 500 }}>{product.name}</span>
                <div style={{ fontSize: 11, color: C.textSec }}>{product.brand}</div>
              </Td>,
              <Td key="category"><Badge label={categoryLabel(product.cat)} bg={categoryStyle.bg} text={categoryStyle.text} /></Td>,
              <Td key="quantity">{product.quantity} {product.unit}</Td>,
              <Td key="revenue"><span style={{ fontWeight: 600 }}>{fmt(product.revenue)}</span></Td>,
              <Td key="margin"><span style={{ color: product.margin > 30 ? C.success : C.warning, fontWeight: 600 }}>{product.margin}%</span></Td>,
            ];
          })}
        />
      </Card>
    </div>
  );
}
