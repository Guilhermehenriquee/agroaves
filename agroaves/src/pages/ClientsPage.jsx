import { useEffect, useState } from "react";
import { Check, Edit2, Eye, MessageSquare, Plus, Trash2 } from "lucide-react";
import { api } from "../api/service.js";
import { Badge, Btn, Card, ErrorCard, Input, LoadingCard, Modal, SearchField, SectionHeader, Select, Table, Td, TextArea } from "../components/ui.jsx";
import { C, fmt, fmtQty } from "../lib/designSystem.js";

const EMPTY_CLIENT = {
  name: "",
  doc: "",
  phone: "",
  email: "",
  city: "",
  limit: 500,
  type: "pf",
};

const EMPTY_MESSAGE = {
  channel: "whatsapp",
  title: "",
  content: "",
  productId: "",
  offerText: "",
};

export function ClientsPage({ onDataChanged }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [detailModal, setDetailModal] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [purchaseProfile, setPurchaseProfile] = useState({ purchases: [], products: [] });
  const [form, setForm] = useState(EMPTY_CLIENT);
  const [messageModal, setMessageModal] = useState(false);
  const [messageTarget, setMessageTarget] = useState(null);
  const [messageProducts, setMessageProducts] = useState([]);
  const [messageForm, setMessageForm] = useState(EMPTY_MESSAGE);

  useEffect(() => {
    void loadClients();
  }, []);

  async function loadClients() {
    try {
      setLoading(true);
      const result = await api.getClients();
      setClients(result.clients);
      setError("");
    } catch (currentError) {
      setError(currentError.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadClientProfile(clientId) {
    const result = await api.getClientPurchases(clientId);
    return result;
  }

  const filtered = clients.filter((client) => {
    return `${client.name} ${client.doc}`.toLowerCase().includes(search.toLowerCase());
  });

  async function openDetail(client) {
    setSelected(client);
    setDetailModal(true);
    const result = await loadClientProfile(client.id);
    setPurchaseProfile(result);
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_CLIENT);
    setAddModal(true);
  }

  function openEdit(client) {
    setEditingId(client.id);
    setForm({
      name: client.name,
      doc: client.doc,
      phone: client.phone,
      email: client.email,
      city: client.city,
      limit: client.limit,
      type: client.type,
    });
    setAddModal(true);
  }

  async function saveClient() {
    await api.saveClient({ ...form, id: editingId });
    setAddModal(false);
    setEditingId(null);
    setForm(EMPTY_CLIENT);
    await loadClients();
    onDataChanged?.();
  }

  async function removeClient(id) {
    if (!window.confirm("Excluir cliente?")) {
      return;
    }

    await api.deleteClient(id);
    await loadClients();
    onDataChanged?.();
  }

  async function openMessage(client, product = null) {
    const result = await loadClientProfile(client.id);
    setMessageTarget(client);
    setMessageProducts(result.products);
    setMessageForm({
      channel: "whatsapp",
      title: product ? "Oferta especial para {{produto}}" : "Contato da AgroAves para {{cliente}}",
      content: product
        ? "Ola {{cliente}}, o item {{produto}} da marca {{marca}} entrou em oferta: {{oferta}}. Se quiser reservar, fale com a loja."
        : "Ola {{cliente}}, estamos entrando em contato para falar sobre produtos, ofertas e reposicao. Se precisar, responda esta mensagem.",
      productId: product ? String(product.id) : "",
      offerText: "",
    });
    setMessageModal(true);
  }

  async function sendMessage() {
    const selectedProduct = messageProducts.find((product) => String(product.id) === messageForm.productId);
    await api.sendMessage({
      audienceType: "client",
      clientId: messageTarget.id,
      channel: messageForm.channel,
      title: messageForm.title,
      content: messageForm.content,
      productId: selectedProduct ? selectedProduct.id : null,
      brand: selectedProduct?.brand ?? "",
      offerText: messageForm.offerText,
    });
    setMessageModal(false);
    setMessageTarget(null);
    setMessageProducts([]);
    setMessageForm(EMPTY_MESSAGE);
  }

  if (loading) {
    return <LoadingCard label="Carregando clientes..." />;
  }

  if (error) {
    return <ErrorCard message={error} onRetry={loadClients} />;
  }

  return (
    <div>
      <SectionHeader
        title="Clientes"
        subtitle={`${clients.filter((client) => client.fiado > 0).length} com fiado em aberto`}
        action={<Btn icon={Plus} onClick={openCreate}>Novo Cliente</Btn>}
      />

      <Card>
        <div style={{ marginBottom: 14 }}>
          <SearchField value={search} onChange={setSearch} placeholder="Buscar por nome ou CPF/CNPJ..." />
        </div>
        <Table
          headers={["Cliente", "Documento", "Telefone", "Cidade", "Fiado", "Limite", "Ultima Compra", ""]}
          rows={filtered.map((client) => [
            <Td key="name">
              <div style={{ fontWeight: 500 }}>{client.name}</div>
              <Badge label={client.type === "pj" ? "Pessoa Juridica" : "Pessoa Fisica"} bg={client.type === "pj" ? C.infoBg : C.successBg} text={client.type === "pj" ? C.info : C.success} size={10} />
            </Td>,
            <Td key="doc">
              <span style={{ fontFamily: "monospace", fontSize: 12 }}>{client.doc}</span>
            </Td>,
            <Td key="phone">{client.phone}</Td>,
            <Td key="city">{client.city}</Td>,
            <Td key="fiado">
              <span style={{ fontWeight: 700, color: client.fiado > 0 ? C.danger : C.success }}>{client.fiado > 0 ? fmt(client.fiado) : "—"}</span>
            </Td>,
            <Td key="limit">
              <span style={{ color: C.textSec }}>{fmt(client.limit)}</span>
            </Td>,
            <Td key="last">{client.lastPurchase}</Td>,
            <Td key="action">
              <div style={{ display: "flex", gap: 6 }}>
                <Btn variant="ghost" size="sm" icon={MessageSquare} onClick={() => openMessage(client)} />
                <Btn variant="ghost" size="sm" icon={Eye} onClick={() => openDetail(client)} />
                <Btn variant="ghost" size="sm" icon={Edit2} onClick={() => openEdit(client)} />
                <Btn variant="ghost" size="sm" icon={Trash2} onClick={() => removeClient(client.id)} />
              </div>
            </Td>,
          ])}
        />
      </Card>

      <Modal open={detailModal} onClose={() => setDetailModal(false)} title={selected?.name}>
        {selected ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[
                ["Documento", selected.doc],
                [selected.type === "pj" ? "CNPJ" : "CPF", selected.doc],
                ["Telefone", selected.phone],
                ["Cidade", selected.city],
                ["E-mail", selected.email || "—"],
                ["Ultima compra", selected.lastPurchase],
              ].map(([label, value]) => (
                <div key={label} style={{ background: C.bg, borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: C.textSec, fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 500, marginTop: 3 }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1, background: selected.fiado > 0 ? C.dangerBg : C.successBg, borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: selected.fiado > 0 ? C.danger : C.success, fontWeight: 500 }}>Fiado em Aberto</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: selected.fiado > 0 ? C.danger : C.success }}>{fmt(selected.fiado)}</div>
              </div>
              <div style={{ flex: 1, background: C.infoBg, borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 11, color: C.info, fontWeight: 500 }}>Limite de Credito</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.info }}>{fmt(selected.limit)}</div>
              </div>
            </div>

            <div style={{ background: C.bg, borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Ultimas Compras</div>
              {purchaseProfile.purchases.length === 0 ? (
                <div style={{ fontSize: 13, color: C.textSec }}>Nenhuma compra encontrada.</div>
              ) : (
                purchaseProfile.purchases.map((purchase) => (
                  <div key={purchase.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
                    <span style={{ color: C.textSec }}>{purchase.id} — {purchase.time} — {purchase.pay}</span>
                    <span style={{ fontWeight: 600 }}>{fmt(purchase.total)}</span>
                  </div>
                ))
              )}
            </div>

            <div style={{ background: C.bg, borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Produtos ja comprados</div>
              {purchaseProfile.products.length === 0 ? (
                <div style={{ fontSize: 13, color: C.textSec }}>Nenhum produto encontrado no historico.</div>
              ) : (
                purchaseProfile.products.map((product) => (
                  <div key={product.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{product.name}</div>
                      <div style={{ fontSize: 11, color: C.textSec }}>
                        {product.brand} · {product.purchaseCount} compra(s) · {fmtQty(product.totalQuantity, product.unit)}
                      </div>
                    </div>
                    <Btn variant="outline" size="sm" onClick={() => openMessage(selected, product)}>Ofertar</Btn>
                  </div>
                ))
              )}
            </div>
          </>
        ) : null}
      </Modal>

      <Modal open={addModal} onClose={() => setAddModal(false)} title={editingId ? "Editar Cliente" : "Novo Cliente"}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <div style={{ gridColumn: "1/-1" }}>
            <Input label="Nome completo *" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </div>
          <Select label="Tipo" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}>
            <option value="pf">Pessoa Fisica</option>
            <option value="pj">Pessoa Juridica</option>
          </Select>
          <Input label={form.type === "pf" ? "CPF" : "CNPJ"} value={form.doc} onChange={(event) => setForm((current) => ({ ...current, doc: event.target.value }))} />
          <Input label="Telefone" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
          <Input label="E-mail" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
          <Input label="Cidade" value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} />
          <div style={{ gridColumn: "1/-1" }}>
            <Input label="Limite de credito (R$)" type="number" value={form.limit} onChange={(event) => setForm((current) => ({ ...current, limit: Number(event.target.value) }))} />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="outline" onClick={() => setAddModal(false)}>Cancelar</Btn>
          <Btn icon={Check} onClick={saveClient}>Salvar</Btn>
        </div>
      </Modal>

      <Modal open={messageModal} onClose={() => setMessageModal(false)} title={`Mensagem para ${messageTarget?.name ?? ""}`}>
        <Select label="Canal" value={messageForm.channel} onChange={(event) => setMessageForm((current) => ({ ...current, channel: event.target.value }))}>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">E-mail</option>
          <option value="sms">SMS</option>
        </Select>
        <Select label="Produto comprado (opcional)" value={messageForm.productId} onChange={(event) => setMessageForm((current) => ({ ...current, productId: event.target.value }))}>
          <option value="">Mensagem geral</option>
          {messageProducts.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} - {product.brand}
            </option>
          ))}
        </Select>
        <Input label="Oferta / condicao especial" value={messageForm.offerText} onChange={(event) => setMessageForm((current) => ({ ...current, offerText: event.target.value }))} />
        <Input label="Titulo" value={messageForm.title} onChange={(event) => setMessageForm((current) => ({ ...current, title: event.target.value }))} />
        <TextArea label="Conteudo" rows={5} value={messageForm.content} onChange={(event) => setMessageForm((current) => ({ ...current, content: event.target.value }))} />
        <div style={{ marginBottom: 16, fontSize: 12, color: C.textSec, lineHeight: 1.5 }}>
          Variaveis disponiveis: {"{{cliente}}"}, {"{{produto}}"}, {"{{marca}}"} e {"{{oferta}}"}.
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="outline" onClick={() => setMessageModal(false)}>Cancelar</Btn>
          <Btn icon={Check} onClick={sendMessage}>Gerar Disparo</Btn>
        </div>
      </Modal>
    </div>
  );
}
