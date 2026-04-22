import { useEffect, useState } from "react";
import { Check, MessageSquare, Plus, SendHorizontal } from "lucide-react";
import { api } from "../api/service.js";
import { Badge, Btn, Card, ErrorCard, Input, LoadingCard, Modal, SectionHeader, Select, Table, Td, TextArea } from "../components/ui.jsx";
import { C, MESSAGE_CHANNEL_LABELS, fmtDate, CAT_LABELS } from "../lib/designSystem.js";

const EMPTY_TEMPLATE = {
  productId: "",
  channel: "whatsapp",
  title: "",
  content: "",
  active: true,
};

const EMPTY_CAMPAIGN = {
  audienceType: "client",
  clientId: "",
  supplierId: "",
  productId: "",
  brand: "",
  offerText: "",
  channel: "whatsapp",
  title: "",
  content: "",
};

export function MessagesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [templates, setTemplates] = useState([]);
  const [dispatches, setDispatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [brands, setBrands] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_TEMPLATE);
  const [editingId, setEditingId] = useState(null);
  const [campaignForm, setCampaignForm] = useState(EMPTY_CAMPAIGN);
  const [campaignSummary, setCampaignSummary] = useState("");

  useEffect(() => {
    void loadResources();
  }, []);

  async function loadResources() {
    try {
      setLoading(true);
      const [messageResult, productResult, clientResult, supplierResult] = await Promise.all([
        api.getMessages(),
        api.getProducts(),
        api.getClients(),
        api.getSuppliers(),
      ]);
      setTemplates(messageResult.templates);
      setDispatches(messageResult.dispatches);
      setProducts(productResult.products);
      setClients(clientResult.clients);
      setSuppliers(supplierResult.suppliers);
      setBrands(messageResult.brands ?? productResult.brands ?? []);
      setError("");
    } catch (currentError) {
      setError(currentError.message);
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_TEMPLATE);
    setModal(true);
  }

  function openEdit(template) {
    setEditingId(template.id);
    setForm({
      productId: String(template.productId),
      channel: template.channel,
      title: template.title,
      content: template.content,
      active: template.active,
    });
    setModal(true);
  }

  async function saveTemplate() {
    const result = await api.saveMessageTemplate({
      ...form,
      id: editingId,
      productId: Number(form.productId),
    });
    setTemplates(result.templates);
    setModal(false);
    setEditingId(null);
    setForm(EMPTY_TEMPLATE);
    const messageResult = await api.getMessages();
    setDispatches(messageResult.dispatches);
    setBrands(messageResult.brands ?? brands);
  }

  async function sendCampaign() {
    const result = await api.sendMessage({
      ...campaignForm,
      clientId: campaignForm.clientId ? Number(campaignForm.clientId) : null,
      supplierId: campaignForm.supplierId ? Number(campaignForm.supplierId) : null,
      productId: campaignForm.productId ? Number(campaignForm.productId) : null,
    });
    setDispatches(result.history);
    setCampaignSummary(`${result.createdCount} disparo(s) gerado(s)${result.skippedCount ? ` e ${result.skippedCount} contato(s) sem destino valido` : ""}.`);
    setCampaignForm(EMPTY_CAMPAIGN);
  }

  if (loading) {
    return <LoadingCard label="Carregando automacoes de mensagens..." />;
  }

  if (error) {
    return <ErrorCard message={error} onRetry={loadResources} />;
  }

  return (
    <div>
      <SectionHeader title="Mensagens" subtitle="Disparo automatico e direto por clientes, fornecedores, marcas e compras" action={<Btn icon={Plus} onClick={openAdd}>Nova Automacao</Btn>} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14, marginBottom: 16 }}>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <MessageSquare color={C.accent} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{templates.length}</div>
              <div style={{ fontSize: 12, color: C.textSec }}>Templates cadastrados</div>
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <SendHorizontal color={C.success} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{dispatches.length}</div>
              <div style={{ fontSize: 12, color: C.textSec }}>Ultimos disparos gerados</div>
            </div>
          </div>
        </Card>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>Central de Disparo</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <Select
            label="Publico"
            value={campaignForm.audienceType}
            onChange={(event) => setCampaignForm((current) => ({
              ...current,
              audienceType: event.target.value,
              clientId: "",
              supplierId: "",
              productId: "",
              brand: "",
            }))}
          >
            <option value="client">Cliente especifico</option>
            <option value="supplier">Fornecedor especifico</option>
            <option value="brand-buyers">Clientes por marca comprada</option>
            <option value="product-buyers">Clientes por produto comprado</option>
          </Select>
          <Select label="Canal" value={campaignForm.channel} onChange={(event) => setCampaignForm((current) => ({ ...current, channel: event.target.value }))}>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">E-mail</option>
            <option value="sms">SMS</option>
          </Select>

          {campaignForm.audienceType === "client" ? (
            <div style={{ gridColumn: "1/-1" }}>
              <Select label="Cliente" value={campaignForm.clientId} onChange={(event) => setCampaignForm((current) => ({ ...current, clientId: event.target.value }))}>
                <option value="">Selecione</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          {campaignForm.audienceType === "supplier" ? (
            <div style={{ gridColumn: "1/-1" }}>
              <Select label="Fornecedor" value={campaignForm.supplierId} onChange={(event) => setCampaignForm((current) => ({ ...current, supplierId: event.target.value }))}>
                <option value="">Selecione</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          {campaignForm.audienceType === "brand-buyers" ? (
            <div style={{ gridColumn: "1/-1" }}>
              <Select label="Marca" value={campaignForm.brand} onChange={(event) => setCampaignForm((current) => ({ ...current, brand: event.target.value }))}>
                <option value="">Selecione</option>
                {brands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          {campaignForm.audienceType === "product-buyers" ? (
            <div style={{ gridColumn: "1/-1" }}>
              <Select label="Produto comprado" value={campaignForm.productId} onChange={(event) => setCampaignForm((current) => ({ ...current, productId: event.target.value }))}>
                <option value="">Selecione</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} — {product.brand}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          {["client", "supplier"].includes(campaignForm.audienceType) ? (
            <div style={{ gridColumn: "1/-1" }}>
              <Select label="Produto relacionado (opcional)" value={campaignForm.productId} onChange={(event) => setCampaignForm((current) => ({ ...current, productId: event.target.value }))}>
                <option value="">Nao vincular produto</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} — {product.brand}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          <div style={{ gridColumn: "1/-1" }}>
            <Input label="Oferta / observacao" value={campaignForm.offerText} onChange={(event) => setCampaignForm((current) => ({ ...current, offerText: event.target.value }))} />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <Input label="Titulo" value={campaignForm.title} onChange={(event) => setCampaignForm((current) => ({ ...current, title: event.target.value }))} />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <TextArea label="Conteudo" rows={5} value={campaignForm.content} onChange={(event) => setCampaignForm((current) => ({ ...current, content: event.target.value }))} />
          </div>
        </div>
        {campaignSummary ? (
          <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, background: C.successBg, color: C.success, fontSize: 13 }}>
            {campaignSummary}
          </div>
        ) : null}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Btn icon={Check} onClick={sendCampaign}>Gerar Disparo</Btn>
        </div>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>Templates por Produto</div>
        <Table
          headers={["Produto", "Canal", "Status", "Mensagem", ""]}
          rows={templates.map((template) => [
            <Td key="product">
              <div style={{ fontWeight: 600 }}>{template.product}</div>
              <div style={{ fontSize: 11, color: C.textSec }}>{template.brand} · {CAT_LABELS[template.category]}</div>
            </Td>,
            <Td key="channel"><Badge label={MESSAGE_CHANNEL_LABELS[template.channel] ?? template.channel} bg={C.infoBg} text={C.info} /></Td>,
            <Td key="status"><Badge label={template.active ? "Ativa" : "Inativa"} bg={template.active ? C.successBg : C.warningBg} text={template.active ? C.success : C.warning} /></Td>,
            <Td key="message"><span style={{ color: C.textSec }}>{template.content.slice(0, 90)}...</span></Td>,
            <Td key="action"><Btn variant="ghost" size="sm" onClick={() => openEdit(template)}>Editar</Btn></Td>,
          ])}
        />
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>Ultimos Disparos Gerados</div>
          <Table
            headers={["Contato", "Origem", "Canal", "Destino", "Status", "Gerado em"]}
            rows={dispatches.map((dispatch) => [
              <Td key="client">
                <div style={{ fontWeight: 600 }}>{dispatch.contactName ?? dispatch.client}</div>
                <div style={{ fontSize: 11, color: C.textSec }}>{dispatch.source}</div>
              </Td>,
              <Td key="origin">
                <div>{dispatch.audience}</div>
                {dispatch.product ? <div style={{ fontSize: 11, color: C.textSec }}>{dispatch.product}{dispatch.brand ? ` · ${dispatch.brand}` : ""}</div> : null}
              </Td>,
              <Td key="channel"><Badge label={MESSAGE_CHANNEL_LABELS[dispatch.channel] ?? dispatch.channel} bg={C.infoBg} text={C.info} /></Td>,
              <Td key="recipient">{dispatch.recipient}</Td>,
              <Td key="status"><Badge label={dispatch.status} bg={C.successBg} text={C.success} /></Td>,
              <Td key="created">{fmtDate(dispatch.createdAt)}</Td>,
            ])}
          />
        </Card>

        <Card>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 16 }}>Variaveis disponiveis</div>
          <div style={{ display: "grid", gap: 10, fontSize: 13, color: C.textSec }}>
            <div><strong style={{ color: C.text }}>{"{{cliente}}"}</strong> nome do cliente.</div>
            <div><strong style={{ color: C.text }}>{"{{fornecedor}}"}</strong> nome do fornecedor.</div>
            <div><strong style={{ color: C.text }}>{"{{produto}}"}</strong> produto relacionado.</div>
            <div><strong style={{ color: C.text }}>{"{{marca}}"}</strong> marca do produto.</div>
            <div><strong style={{ color: C.text }}>{"{{oferta}}"}</strong> oferta ou condicao especial.</div>
          </div>
        </Card>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editingId ? "Editar Automacao" : "Nova Automacao"}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <div style={{ gridColumn: "1/-1" }}>
            <Select label="Produto" value={form.productId} onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value }))}>
              <option value="">Selecione um produto</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} — {product.brand}
                </option>
              ))}
            </Select>
          </div>
          <Select label="Canal" value={form.channel} onChange={(event) => setForm((current) => ({ ...current, channel: event.target.value }))}>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">E-mail</option>
            <option value="sms">SMS</option>
          </Select>
          <Select label="Status" value={String(form.active)} onChange={(event) => setForm((current) => ({ ...current, active: event.target.value === "true" }))}>
            <option value="true">Ativa</option>
            <option value="false">Inativa</option>
          </Select>
          <div style={{ gridColumn: "1/-1" }}>
            <Input label="Titulo da mensagem" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <TextArea label="Conteudo" rows={5} value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="outline" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn icon={Check} onClick={saveTemplate}>Salvar</Btn>
        </div>
      </Modal>
    </div>
  );
}
