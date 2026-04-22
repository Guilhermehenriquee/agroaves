import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/service.js";
import { Badge, Card, ErrorCard, LoadingCard, SearchField, SectionHeader, Td } from "../components/ui.jsx";
import { CAT_LABELS, C, catColor, daysUntil, fmtDate, fmtQty } from "../lib/designSystem.js";

export function StockPage() {
  const [state, setState] = useState({ loading: true, error: "", products: [] });
  const [search, setSearch] = useState("");

  const loadStock = useCallback(async () => {
    try {
      const result = await api.getProducts();
      setState({ loading: false, error: "", products: result.products });
    } catch (error) {
      setState({ loading: false, error: error.message, products: [] });
    }
  }, []);

  useEffect(() => {
    void loadStock();
  }, [loadStock]);

  const products = useMemo(() => {
    return [...state.products]
      .filter((product) => `${product.name} ${product.brand}`.toLowerCase().includes(search.toLowerCase()))
      .sort((left, right) => {
        const leftDays = left.expiry ? daysUntil(left.expiry) : 9999;
        const rightDays = right.expiry ? daysUntil(right.expiry) : 9999;
        const leftLow = left.stock <= left.minStock ? -1 : 0;
        const rightLow = right.stock <= right.minStock ? -1 : 0;
        return leftDays + leftLow - (rightDays + rightLow);
      });
  }, [search, state.products]);

  function getRowStyle(product) {
    if (product.expiry && daysUntil(product.expiry) < 0) {
      return { background: "#fef2f2" };
    }
    if (product.expiry && daysUntil(product.expiry) <= 7) {
      return { background: "#fef3c7" };
    }
    if (product.stock <= product.minStock) {
      return { background: "#fff7ed" };
    }
    return {};
  }

  function getStatus(product) {
    if (product.expiry && daysUntil(product.expiry) < 0) {
      return <Badge label="VENCIDO" bg={C.dangerBg} text={C.danger} />;
    }
    if (product.expiry && daysUntil(product.expiry) <= 7) {
      return <Badge label={`Vence em ${daysUntil(product.expiry)}d`} bg={C.warningBg} text={C.warning} />;
    }
    if (product.expiry && daysUntil(product.expiry) <= 30) {
      return <Badge label={`Vence em ${daysUntil(product.expiry)}d`} bg="#fef9c3" text="#713f12" />;
    }
    if (product.stock <= product.minStock) {
      return <Badge label="Estoque Baixo" bg="#fff7ed" text="#c2410c" />;
    }
    return <Badge label="OK" bg={C.successBg} text={C.success} />;
  }

  function percentLevel(product) {
    return Math.min(100, Math.round((product.stock / Math.max(product.minStock * 3, product.stock)) * 100));
  }

  if (state.loading) {
    return <LoadingCard label="Carregando estoque..." />;
  }

  if (state.error) {
    return <ErrorCard message={state.error} onRetry={loadStock} />;
  }

  return (
    <div>
      <SectionHeader
        title="Controle de Estoque"
        subtitle="Alertas de validade e estoque minimo"
        action={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge label={`${state.products.filter((product) => product.expiry && daysUntil(product.expiry) < 0).length} vencidos`} bg={C.dangerBg} text={C.danger} size={13} />
            <Badge label={`${state.products.filter((product) => product.stock <= product.minStock).length} estoque baixo`} bg={C.warningBg} text={C.warning} size={13} />
          </div>
        }
      />

      <Card>
        <div style={{ marginBottom: 14 }}>
          <SearchField value={search} onChange={setSearch} placeholder="Buscar produto ou marca..." />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1.5px solid ${C.border}` }}>
                {["Produto", "Categoria", "Estoque", "Minimo", "Nivel", "Validade", "Status"].map((header) => (
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
                      whiteSpace: "nowrap",
                    }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const categoryStyle = catColor(product.cat);
                const percent = percentLevel(product);
                return (
                  <tr key={product.id} style={{ borderBottom: `1px solid ${C.border}`, ...getRowStyle(product) }}>
                    <Td>
                      <div style={{ fontWeight: 500 }}>{product.name}</div>
                      <div style={{ fontSize: 11, color: C.textSec }}>{product.brand} · {product.supplier}</div>
                    </Td>
                    <Td>
                      <Badge label={CAT_LABELS[product.cat]} bg={categoryStyle.bg} text={categoryStyle.text} />
                    </Td>
                    <Td>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{fmtQty(product.stock, product.unit)}</span>
                    </Td>
                    <Td>
                      <span style={{ color: C.textSec }}>{fmtQty(product.minStock, product.unit)}</span>
                    </Td>
                    <Td style={{ minWidth: 120 }}>
                      <div style={{ background: C.border, borderRadius: 4, height: 6, overflow: "hidden" }}>
                        <div style={{ width: `${percent}%`, height: "100%", background: percent < 30 ? C.dangerBg : percent < 60 ? "#fde68a" : C.accent, borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 10, color: C.textSec }}>{percent}%</span>
                    </Td>
                    <Td>
                      {product.expiry ? (
                        <span style={{ color: daysUntil(product.expiry) < 0 ? C.danger : daysUntil(product.expiry) <= 30 ? C.warning : C.textSec, fontWeight: daysUntil(product.expiry) <= 30 ? 600 : 400 }}>
                          {fmtDate(product.expiry)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td>{getStatus(product)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
