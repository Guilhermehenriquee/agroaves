import { useEffect, useState } from "react";
import { Check, CheckCircle, DollarSign, Edit2, MessageSquare, Plus, Trash2, Truck } from "lucide-react";
import { api } from "../api/service.js";
import { Badge, Btn, Card, ErrorCard, Input, LoadingCard, Modal, SectionHeader, Table, Td, TextArea, Select } from "../components/ui.jsx";
import { C, fmt } from "../lib/designSystem.js";

const EMPTY_SUPPLIER = {
  name: "",
  cnpj: "",
  contact: "",
  phone: "",
  email: "",
  cat: "",
  supplies: "",
  suppliedBrands: "",
};

const EMPTY_MESSAGE = {
  channel: "whatsapp",
  title: "",
  content: "",
  brand: "",
};

export function SuppliersPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [suppliers, setSuppliers] = useState([]);
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_SUPPLIER);
  const [messageModal, setMessageModal] = useState(false);
  const [messageTarget, setMessageTarget] = useState(null);
  const [messageForm, setMessageForm] = useState(EMPTY_MESSAGE);

  useEffect(() => {
    void loadSuppliers();
  }, []);

  async function loadSuppliers() {
    try {
      setLoading(true);
      const result = await api.getSuppliers();
      setSuppliers(result.suppliers);
      setError("");
    } catch (currentError) {
      setError(currentError.message);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_SUPPLIER);
    setModal(true);
  }

  function openEdit(supplier) {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name,
      cnpj: supplier.cnpj,
      contact: supplier.contact,
      phone: supplier.phone,
      email: supplier.email,
      cat: supplier.cat,
      supplies: supplier.supplies,
      suppliedBrands: supplier.suppliedBrands,
    });
    setModal(true);
  }

  async function saveSupplier() {
    await api.saveSupplier({ ...form, id: editingId });
    setForm(EMPTY_SUPPLIER);
    setEditingId(null);
    setModal(false);
    await loadSuppliers();
  }

  async function removeSupplier(id) {
    if (!window.confirm("Excluir fornecedor?")) {
      return;
    }

    await api.deleteSupplier(id);
    await loadSuppliers();
  }

  function openMessage(supplier) {
    setMessageTarget(supplier);
    setMessageForm({
      channel: "whatsapp",
      title: "Contato com fornecedor {{fornecedor}}",
      content: "Ola {{fornecedor}}, precisamos falar sobre {{produto}} da marca {{marca}}. Por favor, entre em contato com a loja.",
      brand: supplier.suppliedBrands,
    });
    setMessageModal(true);
  }

  async function sendMessage() {
    await api.sendMessage({
      audienceType: "supplier",
      supplierId: messageTarget.id,
      channel: messageForm.channel,
      title: messageForm.title,
      content: messageForm.content,
      brand: messageForm.brand,
    });
    setMessageModal(false);
    setMessageTarget(null);
    setMessageForm(EMPTY_MESSAGE);
  }

  if (loading) {
    return <LoadingCard label="Carregando fornecedores..." />;
  }

  if (error) {
    return <ErrorCard message={error} onRetry={loadSuppliers} />;
  }

  return (
    <div>
      <SectionHeader title="Fornecedores" subtitle={`${suppliers.length} cadastrados`} action={<Btn icon={Plus} onClick={openCreate}>Novo Fornecedor</Btn>} />

      <Card>
        <Table
          headers={["Fornecedor", "CNPJ", "Contato", "Telefone", "Fornecem", "Marcas", "Categoria", "Ultimo Pedido", "A Pagar", ""]}
          rows={suppliers.map((supplier) => [
            <Td key="name"><div style={{ fontWeight: 600 }}>{supplier.name}</div></Td>,
            <Td key="cnpj"><span style={{ fontFamily: "monospace", fontSize: 12 }}>{supplier.cnpj}</span></Td>,
            <Td key="contact">{supplier.contact}</Td>,
            <Td key="phone">{supplier.phone}</Td>,
            <Td key="supplies"><span style={{ color: C.textSec }}>{supplier.supplies || "—"}</span></Td>,
            <Td key="brands"><span style={{ color: C.textSec }}>{supplier.suppliedBrands || "—"}</span></Td>,
            <Td key="cat"><Badge label={supplier.cat} bg={C.infoBg} text={C.info} /></Td>,
            <Td key="last">{supplier.lastOrder}</Td>,
            <Td key="pending"><span style={{ fontWeight: 600, color: supplier.pending > 0 ? C.danger : C.success }}>{supplier.pending > 0 ? fmt(supplier.pending) : "—"}</span></Td>,
            <Td key="actions">
              <div style={{ display: "flex", gap: 6 }}>
                <Btn variant="ghost" size="sm" icon={MessageSquare} onClick={() => openMessage(supplier)} />
                <Btn variant="ghost" size="sm" icon={Edit2} onClick={() => openEdit(supplier)} />
                <Btn variant="ghost" size="sm" icon={Trash2} onClick={() => removeSupplier(supplier.id)} />
              </div>
            </Td>,
          ])}
        />
      </Card>

      <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14 }}>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Truck color="#7c3aed" />
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{suppliers.length}</div>
              <div style={{ fontSize: 12, color: C.textSec }}>Total de Fornecedores</div>
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <DollarSign color={C.danger} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(suppliers.reduce((sum, supplier) => sum + supplier.pending, 0))}</div>
              <div style={{ fontSize: 12, color: C.textSec }}>A Pagar (total)</div>
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <CheckCircle color={C.success} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{suppliers.filter((supplier) => supplier.pending === 0).length}</div>
              <div style={{ fontSize: 12, color: C.textSec }}>Pedidos em dia</div>
            </div>
          </div>
        </Card>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editingId ? "Editar Fornecedor" : "Novo Fornecedor"}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <div style={{ gridColumn: "1/-1" }}>
            <Input label="Razao Social *" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </div>
          <Input label="CNPJ" value={form.cnpj} onChange={(event) => setForm((current) => ({ ...current, cnpj: event.target.value }))} />
          <Input label="Nome do Contato" value={form.contact} onChange={(event) => setForm((current) => ({ ...current, contact: event.target.value }))} />
          <Input label="Telefone" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
          <Input label="E-mail" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
          <div style={{ gridColumn: "1/-1" }}>
            <Input label="Categoria de Produtos" value={form.cat} onChange={(event) => setForm((current) => ({ ...current, cat: event.target.value }))} />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <TextArea label="O que fornecem" rows={3} value={form.supplies} onChange={(event) => setForm((current) => ({ ...current, supplies: event.target.value }))} />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <Input label="Marcas que fornecem" value={form.suppliedBrands} onChange={(event) => setForm((current) => ({ ...current, suppliedBrands: event.target.value }))} />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="outline" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn icon={Check} onClick={saveSupplier}>Salvar</Btn>
        </div>
      </Modal>

      <Modal open={messageModal} onClose={() => setMessageModal(false)} title={`Mensagem para ${messageTarget?.name ?? ""}`}>
        <Select label="Canal" value={messageForm.channel} onChange={(event) => setMessageForm((current) => ({ ...current, channel: event.target.value }))}>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">E-mail</option>
          <option value="sms">SMS</option>
        </Select>
        <Input label="Marca (opcional)" value={messageForm.brand} onChange={(event) => setMessageForm((current) => ({ ...current, brand: event.target.value }))} />
        <Input label="Titulo" value={messageForm.title} onChange={(event) => setMessageForm((current) => ({ ...current, title: event.target.value }))} />
        <TextArea label="Conteudo" rows={5} value={messageForm.content} onChange={(event) => setMessageForm((current) => ({ ...current, content: event.target.value }))} />
        <div style={{ marginBottom: 16, fontSize: 12, color: C.textSec, lineHeight: 1.5 }}>
          Variaveis disponiveis: {"{{fornecedor}}"}, {"{{produto}}"} e {"{{marca}}"}.
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="outline" onClick={() => setMessageModal(false)}>Cancelar</Btn>
          <Btn icon={Check} onClick={sendMessage}>Gerar Disparo</Btn>
        </div>
      </Modal>
    </div>
  );
}
