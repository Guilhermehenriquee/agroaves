import { useEffect, useMemo, useState } from "react";
import { Banknote, Check, CheckCircle, CreditCard, Smartphone, User, X } from "lucide-react";
import { api } from "../api/service.js";
import { Badge, Btn, Card, ErrorCard, Input, LoadingCard, Modal, SearchField, SectionHeader, Select } from "../components/ui.jsx";
import { CAT_LABELS, C, catColor, fmt, fmtQty } from "../lib/designSystem.js";
import { openFiscalPrint } from "../lib/fiscalPrint.js";

const CATEGORY_OPTIONS = ["all", "racoes", "medicamentos", "aves", "utensilios"];
const PRINT_OPTIONS = [
  { value: "true", label: "Sim, imprimir via" },
  { value: "false", label: "Nao imprimir agora" },
];

function stepForProduct(product) {
  return product.saleMode === "weight" ? "0.001" : "1";
}

function defaultQuickQuantity(product) {
  return product.saleMode === "weight" ? "0.250" : "1";
}

function normalizeProductQuantity(product, value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  if (product.saleMode === "weight") {
    return Math.round(parsed * 1000) / 1000;
  }

  return Math.max(1, Math.round(parsed));
}

export function PdvPage({ onDataChanged }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [cart, setCart] = useState([]);
  const [quickValues, setQuickValues] = useState({});
  const [payModal, setPayModal] = useState(false);
  const [payType, setPayType] = useState("dinheiro");
  const [amountPaid, setAmountPaid] = useState("");
  const [clientId, setClientId] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [printVia, setPrintVia] = useState("true");
  const [finalized, setFinalized] = useState(null);
  const [submitError, setSubmitError] = useState("");
  const [printWarning, setPrintWarning] = useState("");

  useEffect(() => {
    void loadResources();
  }, []);

  async function loadResources() {
    try {
      setLoading(true);
      const [productResult, clientResult] = await Promise.all([api.getProducts(), api.getClients()]);
      setProducts(productResult.products);
      setClients(clientResult.clients);
      setError("");
    } catch (currentError) {
      setError(currentError.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      return (
        (category === "all" || product.cat === category) &&
        `${product.name} ${product.brand} ${product.barcode}`.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [category, products, search]);

  function getQuickValue(product) {
    return quickValues[product.id] ?? defaultQuickQuantity(product);
  }

  function updateQuickValue(productId, value) {
    setQuickValues((current) => ({ ...current, [productId]: value }));
  }

  function addItem(product, rawQuantity = getQuickValue(product)) {
    const quantity = normalizeProductQuantity(product, rawQuantity);
    if (quantity <= 0) {
      setSubmitError(`Informe uma quantidade valida para ${product.name}.`);
      return;
    }

    setSubmitError("");
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      const currentQty = existing?.qty ?? 0;
      const nextQty = Math.min(product.stock, currentQty + quantity);
      if (nextQty <= 0) {
        return current;
      }

      if (existing) {
        return current.map((item) => (item.id === product.id ? { ...item, qty: nextQty } : item));
      }

      return [...current, { ...product, qty: nextQty }];
    });
    updateQuickValue(product.id, defaultQuickQuantity(product));
  }

  function removeItem(id) {
    setCart((current) => current.filter((item) => item.id !== id));
  }

  function updateQty(id, rawQuantity) {
    const product = products.find((entry) => entry.id === id);
    if (!product) {
      return;
    }

    const quantity = normalizeProductQuantity(product, rawQuantity);
    if (quantity <= 0) {
      removeItem(id);
      return;
    }

    setCart((current) => current.map((item) => (item.id === id ? { ...item, qty: Math.min(product.stock, quantity) } : item)));
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discountValue = subtotal * (discountPercent / 100);
  const total = subtotal - discountValue;
  const changeDue = amountPaid ? Math.max(0, Number(amountPaid) - total) : 0;
  const shouldPrintVia = printVia === "true";

  function openPaymentModal() {
    setSubmitError("");
    setPrintWarning("");
    setPayModal(true);
  }

  function closePaymentModal() {
    setSubmitError("");
    setPrintWarning("");
    setPayModal(false);
  }

  async function finalizeSale() {
    try {
      setSubmitError("");
      setPrintWarning("");

      const result = await api.createSale({
        clientId: clientId ? Number(clientId) : null,
        paymentMethod: payType,
        amountPaid: amountPaid ? Number(amountPaid) : total,
        discountPercent,
        printVia: shouldPrintVia,
        items: cart.map((item) => ({ id: item.id, qty: item.qty })),
      });

      if (shouldPrintVia && result.sale.fiscalDocument && !result.sale.directPrint?.success) {
        const printed = openFiscalPrint(result.sale.fiscalDocument);
        if (!printed) {
          setPrintWarning("A nota foi gerada, mas o navegador bloqueou a janela de impressao.");
        } else if (result.sale.directPrint?.error) {
          setPrintWarning(`Impressao direta falhou: ${result.sale.directPrint.error}. A impressao visual foi aberta como alternativa.`);
        }
      } else if (result.sale.directPrint?.success) {
        setPrintWarning(`Nota enviada direto para a impressora ${result.sale.directPrint.printerName}.`);
      }

      setFinalized(result.sale);
      setPayModal(false);
      setCart([]);
      setAmountPaid("");
      setClientId("");
      setDiscountPercent(0);
      setPrintVia("true");
      await loadResources();
      onDataChanged?.();
      setTimeout(() => setFinalized(null), 2600);
    } catch (currentError) {
      setSubmitError(currentError.message);
    }
  }

  if (loading) {
    return <LoadingCard label="Carregando PDV..." />;
  }

  if (error) {
    return <ErrorCard message={error} onRetry={loadResources} />;
  }

  return (
    <div>
      <SectionHeader title="PDV - Ponto de Venda" subtitle="Balcao de atendimento, venda persistida, nota automatica e suporte a peso" />

      {finalized ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: C.card, borderRadius: 20, padding: 48, textAlign: "center", minWidth: 320 }}>
            <CheckCircle size={64} color={C.success} style={{ marginBottom: 16 }} />
            <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>Venda Finalizada!</div>
            <div style={{ fontSize: 15, color: C.textSec, marginTop: 8 }}>{finalized.saleNumber} · {fmt(finalized.total)}</div>
            {finalized.fiscalDocument ? (
              <div style={{ marginTop: 8, fontSize: 13, color: C.textSec }}>
                {finalized.fiscalDocument.documentTypeLabel} {finalized.fiscalDocument.documentNumberDisplay} gerada automaticamente.
              </div>
            ) : null}
            {finalized.printVia === false ? (
              <div style={{ marginTop: 8, fontSize: 13, color: C.textSec }}>
                Via fiscal gerada sem impressao nesta venda.
              </div>
            ) : null}
            {finalized.directPrint?.success ? (
              <div style={{ marginTop: 8, fontSize: 13, color: C.success }}>
                Impressao direta enviada para {finalized.directPrint.printerName}.
              </div>
            ) : null}
            {finalized.generatedMessages.length > 0 ? (
              <div style={{ marginTop: 10, fontSize: 13, color: C.success }}>
                {finalized.generatedMessages.length} mensagem(ns) gerada(s) automaticamente.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, height: "calc(100vh - 180px)" }}>
        <Card style={{ overflow: "hidden", display: "flex", flexDirection: "column", padding: 0 }}>
          <div style={{ padding: "16px 18px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ marginBottom: 12 }}>
              <SearchField value={search} onChange={setSearch} placeholder="Buscar ou ler codigo de barras..." />
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CATEGORY_OPTIONS.map((current) => (
                <button
                  key={current}
                  onClick={() => setCategory(current)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 20,
                    border: `1.5px solid ${category === current ? C.accent : C.borderMed}`,
                    background: category === current ? C.accent : "transparent",
                    color: category === current ? "#fff" : C.textSec,
                    fontSize: 12,
                    cursor: "pointer",
                    fontWeight: category === current ? 600 : 400,
                  }}
                >
                  {current === "all" ? "Todos" : CAT_LABELS[current]}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: 10, alignContent: "start" }}>
            {filteredProducts.map((product) => {
              const categoryStyle = catColor(product.cat);
              const inCart = cart.find((item) => item.id === product.id);
              return (
                <div
                  key={product.id}
                  style={{
                    border: `2px solid ${inCart ? C.accent : C.border}`,
                    borderRadius: 10,
                    padding: "12px 10px",
                    background: inCart ? `${C.accent}08` : C.card,
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {inCart ? (
                    <div style={{ position: "absolute", top: 6, right: 6, background: C.accent, color: "#fff", borderRadius: 20, minWidth: 18, height: 18, padding: "0 5px", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {fmtQty(inCart.qty)}
                    </div>
                  ) : null}
                  <div style={{ fontSize: 11, marginBottom: 2 }}>
                    <Badge label={CAT_LABELS[product.cat]} bg={categoryStyle.bg} text={categoryStyle.text} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.text, lineHeight: 1.3 }}>{product.name}</div>
                  <div style={{ fontSize: 11, color: C.textSec }}>{product.brand}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.accent }}>
                    {fmt(product.price)}
                    <span style={{ fontSize: 11, color: C.textSec, marginLeft: 4 }}>
                      / {product.saleMode === "weight" ? (product.weightUnit || product.unit) : product.unit}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: C.textSec }}>
                    Estq: {fmtQty(product.stock, product.unit)}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 6, marginTop: "auto" }}>
                    <input
                      type="number"
                      min={product.saleMode === "weight" ? "0.001" : "1"}
                      step={stepForProduct(product)}
                      value={getQuickValue(product)}
                      onChange={(event) => updateQuickValue(product.id, event.target.value)}
                      style={{
                        width: "100%",
                        border: `1px solid ${C.borderMed}`,
                        borderRadius: 8,
                        padding: "7px 8px",
                        fontSize: 12,
                      }}
                    />
                    <button
                      onClick={() => addItem(product)}
                      style={{
                        border: "none",
                        borderRadius: 8,
                        background: C.accent,
                        color: "#fff",
                        padding: "7px 10px",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Adicionar
                    </button>
                  </div>
                  <div style={{ fontSize: 10, color: C.textSec }}>
                    {product.saleMode === "weight" ? `Informe o peso em ${product.weightUnit || product.unit}.` : "Informe a quantidade."}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Carrinho</span>
            {cart.length > 0 ? (
              <button onClick={() => setCart([])} style={{ background: "none", border: "none", color: C.textSec, cursor: "pointer", fontSize: 12 }}>
                Limpar
              </button>
            ) : null}
          </div>

          {cart.length === 0 ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.textSec, fontSize: 13 }}>
              Adicione produtos →
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
              {cart.map((item) => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 4px", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: C.textSec }}>{item.brand}</div>
                    <div style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>
                      {fmt(item.price)} / {item.saleMode === "weight" ? (item.weightUnit || item.unit) : item.unit}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    <input
                      type="number"
                      min={item.saleMode === "weight" ? "0.001" : "1"}
                      step={stepForProduct(item)}
                      value={item.qty}
                      onChange={(event) => updateQty(item.id, event.target.value)}
                      style={{
                        width: 82,
                        border: `1px solid ${C.borderMed}`,
                        borderRadius: 6,
                        padding: "4px 6px",
                        fontSize: 12,
                        textAlign: "right",
                      }}
                    />
                    <span style={{ fontSize: 10, color: C.textSec }}>{item.saleMode === "weight" ? item.weightUnit || item.unit : item.unit}</span>
                  </div>
                  <div style={{ minWidth: 72, textAlign: "right", fontSize: 12, fontWeight: 600 }}>{fmt(item.price * item.qty)}</div>
                  <button onClick={() => removeItem(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textSec }}>
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}` }}>
            {submitError ? (
              <div style={{ marginBottom: 10, padding: "10px 12px", borderRadius: 10, background: C.dangerBg, color: C.danger, fontSize: 13 }}>
                {submitError}
              </div>
            ) : null}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: C.textSec }}>Subtotal</span>
              <span style={{ fontSize: 12 }}>{fmt(subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: C.textSec }}>Desconto</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input type="number" min="0" max="100" value={discountPercent} onChange={(event) => setDiscountPercent(Number(event.target.value))} style={{ width: 44, border: `1px solid ${C.borderMed}`, borderRadius: 6, padding: "2px 6px", fontSize: 12, textAlign: "right" }} />
                <span style={{ fontSize: 12 }}>%</span>
                <span style={{ fontSize: 12, color: C.danger }}>-{fmt(discountValue)}</span>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>Total</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: C.accent }}>{fmt(total)}</span>
            </div>
            <button disabled={cart.length === 0} onClick={openPaymentModal} style={{ width: "100%", background: cart.length === 0 ? "#e5e7eb" : C.accent, color: cart.length === 0 ? C.textSec : "#fff", border: "none", borderRadius: 10, padding: 13, fontWeight: 700, fontSize: 15, cursor: cart.length === 0 ? "not-allowed" : "pointer" }}>
              Finalizar Venda
            </button>
          </div>
        </Card>
      </div>

      <Modal open={payModal} onClose={closePaymentModal} title="Finalizar Venda" width={480}>
        <Select label="Cliente (opcional, mas necessario para disparar mensagens)" value={clientId} onChange={(event) => setClientId(event.target.value)}>
          <option value="">Selecione o cliente</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name} - Fiado: {fmt(client.fiado)}
            </option>
          ))}
        </Select>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: C.textSec, marginBottom: 8, fontWeight: 500 }}>Forma de Pagamento</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              ["dinheiro", "Dinheiro", Banknote],
              ["pix", "Pix", Smartphone],
              ["cartao", "Cartao", CreditCard],
              ["fiado", "Fiado", User],
            ].map(([value, label, Icon]) => (
              <button
                key={value}
                onClick={() => setPayType(value)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  border: `2px solid ${payType === value ? C.accent : C.borderMed}`,
                  borderRadius: 10,
                  background: payType === value ? `${C.accent}12` : "transparent",
                  cursor: "pointer",
                  fontWeight: payType === value ? 600 : 400,
                  fontSize: 13,
                  color: payType === value ? C.accent : C.text,
                }}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {payType === "dinheiro" ? (
          <>
            <Input label="Valor recebido (R$)" type="number" step="0.01" value={amountPaid} onChange={(event) => setAmountPaid(event.target.value)} />
            {Number(amountPaid) > 0 ? (
              <div style={{ background: C.successBg, borderRadius: 8, padding: "10px 14px", marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, color: C.success, fontWeight: 600 }}>Troco</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: C.success }}>{fmt(changeDue)}</span>
              </div>
            ) : null}
          </>
        ) : null}

        {payType === "fiado" && !clientId ? (
          <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, background: C.warningBg, color: C.warning, fontSize: 13 }}>
            Para registrar venda fiado, selecione o cliente.
          </div>
        ) : null}

        <Select label="Imprimir via" value={printVia} onChange={(event) => setPrintVia(event.target.value)}>
          {PRINT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <div style={{ marginTop: -4, marginBottom: 16, fontSize: 12, color: C.textSec, lineHeight: 1.5 }}>
          Quando marcado, a venda tenta imprimir a via automaticamente. Se estiver desmarcado, a nota fiscal continua sendo gerada e salva no sistema sem abrir impressao.
        </div>

        {submitError ? (
          <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, background: C.dangerBg, color: C.danger, fontSize: 13 }}>
            {submitError}
          </div>
        ) : null}

        {printWarning ? (
          <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, background: C.warningBg, color: C.warning, fontSize: 13 }}>
            {printWarning}
          </div>
        ) : null}

        <div style={{ background: C.bg, borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Total a pagar</span>
            <span style={{ fontWeight: 800, fontSize: 18, color: C.accent }}>{fmt(total)}</span>
          </div>
        </div>

        <div style={{ fontSize: 12, color: C.textSec, marginBottom: 16, lineHeight: 1.5 }}>
          Ao confirmar a venda, o sistema gera o documento fiscal automaticamente e so tenta imprimir se a opcao "Imprimir via" estiver ativa.
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant="outline" onClick={closePaymentModal} style={{ flex: 1 }}>Cancelar</Btn>
          <Btn onClick={finalizeSale} icon={Check} style={{ flex: 2, justifyContent: "center" }} disabled={payType === "fiado" && !clientId}>
            Confirmar Venda
          </Btn>
        </div>
      </Modal>
    </div>
  );
}
