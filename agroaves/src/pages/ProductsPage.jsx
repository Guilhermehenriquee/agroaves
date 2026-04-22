import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Edit2, Plus, Trash2 } from "lucide-react";
import { api } from "../api/service.js";
import { Badge, Btn, Card, ErrorCard, Input, LoadingCard, Modal, SearchField, SectionHeader, Select, Table, Td } from "../components/ui.jsx";
import { CAT_LABELS, C, catColor, daysUntil, fmt, fmtDate, fmtQty } from "../lib/designSystem.js";

const EMPTY_FORM = {
  name: "",
  cat: "racoes",
  brand: "",
  price: "",
  cost: "",
  stock: "",
  unit: "unidade",
  saleMode: "unit",
  weightUnit: "kg",
  minStock: "",
  expiry: "",
  supplierId: "",
  barcode: "",
};

export function ProductsPage({ onDataChanged }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    void loadResources();
  }, []);

  async function loadResources() {
    try {
      setLoading(true);
      const [productResult, supplierResult] = await Promise.all([api.getProducts(), api.getSuppliers()]);
      setProducts(productResult.products);
      setSuppliers(supplierResult.suppliers);
      setError("");
    } catch (currentError) {
      setError(currentError.message);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return products.filter((product) => {
      return (
        (category === "all" || product.cat === category) &&
        `${product.name} ${product.brand} ${product.barcode}`.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [category, products, search]);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModal(true);
  }

  function openEdit(product) {
    setEditing(product.id);
    setForm({
      ...product,
      price: product.price,
      cost: product.cost,
      stock: product.stock,
      minStock: product.minStock,
      saleMode: product.saleMode ?? (["kg", "g"].includes(product.unit) ? "weight" : "unit"),
      weightUnit: product.weightUnit || (["kg", "g"].includes(product.unit) ? product.unit : "kg"),
      supplierId: product.supplierId ?? "",
      expiry: product.expiry ? String(product.expiry).slice(0, 10) : "",
    });
    setModal(true);
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveProduct() {
    await api.saveProduct({
      ...form,
      id: editing,
      supplierId: form.supplierId ? Number(form.supplierId) : null,
      unit: form.saleMode === "weight" ? form.weightUnit : form.unit,
    });

    setModal(false);
    setForm(EMPTY_FORM);
    await loadResources();
    onDataChanged?.();
  }

  async function removeProduct(id) {
    if (!window.confirm("Excluir produto?")) {
      return;
    }

    await api.deleteProduct(id);
    await loadResources();
    onDataChanged?.();
  }

  if (loading) {
    return <LoadingCard label="Carregando produtos..." />;
  }

  if (error) {
    return <ErrorCard message={error} onRetry={loadResources} />;
  }

  return (
    <div>
      <SectionHeader title="Produtos" subtitle={`${products.length} cadastrados no banco`} action={<Btn icon={Plus} onClick={openAdd}>Novo Produto</Btn>} />

      <Card>
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <SearchField value={search} onChange={setSearch} placeholder="Buscar produto, marca ou codigo..." />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["all", "racoes", "medicamentos", "aves", "utensilios"].map((current) => (
              <button
                key={current}
                onClick={() => setCategory(current)}
                style={{
                  padding: "7px 14px",
                  borderRadius: 8,
                  border: `1.5px solid ${category === current ? C.accent : C.borderMed}`,
                  background: category === current ? `${C.accent}18` : "transparent",
                  color: category === current ? C.accent : C.textSec,
                  fontWeight: category === current ? 600 : 400,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {current === "all" ? "Todos" : CAT_LABELS[current]}
              </button>
            ))}
          </div>
        </div>

        <Table
          headers={["Produto", "Categoria", "Preco", "Custo", "Estoque", "Unidade", "Validade", "Acoes"]}
          rows={filtered.map((product) => {
            const categoryStyle = catColor(product.cat);
            const expiration = product.expiry ? daysUntil(product.expiry) : null;
            const lowStock = product.stock <= product.minStock;

            return [
              <Td key="name">
                <div style={{ fontWeight: 500 }}>{product.name}</div>
                <div style={{ fontSize: 11, color: C.textSec }}>
                  Marca: {product.brand} · Cod: {product.barcode}
                </div>
              </Td>,
              <Td key="category">
                <Badge label={CAT_LABELS[product.cat]} bg={categoryStyle.bg} text={categoryStyle.text} />
              </Td>,
              <Td key="price">
                <div>{fmt(product.price)}</div>
                <div style={{ fontSize: 11, color: C.textSec }}>
                  {product.saleMode === "weight" ? `por ${product.weightUnit || product.unit}` : "preco unitario"}
                </div>
              </Td>,
              <Td key="cost">
                <span style={{ color: C.textSec }}>{fmt(product.cost)}</span>
              </Td>,
              <Td key="stock">
                <span style={{ fontWeight: 600, color: lowStock ? C.danger : C.text }}>{fmtQty(product.stock, product.unit)}</span>
                {lowStock ? <AlertTriangle size={12} color={C.danger} style={{ marginLeft: 4 }} /> : null}
              </Td>,
              <Td key="unit">
                <div>{product.unit}</div>
                <div style={{ fontSize: 11, color: C.textSec }}>
                  {product.saleMode === "weight" ? "Venda por peso" : "Venda padrao"}
                </div>
              </Td>,
              <Td key="expiry">
                {expiration === null ? (
                  "â€”"
                ) : (
                  <span style={{ color: expiration < 0 ? C.danger : expiration < 30 ? C.warning : C.textSec, fontWeight: expiration < 30 ? 600 : 400 }}>
                    {expiration < 0 ? "VENCIDO" : expiration === 0 ? "Hoje" : fmtDate(product.expiry)}
                  </span>
                )}
              </Td>,
              <Td key="actions">
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn variant="ghost" size="sm" icon={Edit2} onClick={() => openEdit(product)} />
                  <Btn variant="ghost" size="sm" icon={Trash2} onClick={() => removeProduct(product.id)} />
                </div>
              </Td>,
            ];
          })}
        />
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Editar Produto" : "Novo Produto"}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <div style={{ gridColumn: "1/-1" }}>
            <Input label="Nome do Produto *" value={form.name} onChange={(event) => updateForm("name", event.target.value)} />
          </div>
          <Select label="Categoria *" value={form.cat} onChange={(event) => updateForm("cat", event.target.value)}>
            <option value="racoes">Racoes</option>
            <option value="medicamentos">Medicamentos</option>
            <option value="aves">Aves</option>
            <option value="utensilios">Utensilios</option>
          </Select>
          <Input label="Marca *" value={form.brand} onChange={(event) => updateForm("brand", event.target.value)} />
          <Select label="Tipo de venda *" value={form.saleMode} onChange={(event) => updateForm("saleMode", event.target.value)}>
            <option value="unit">Padrao</option>
            <option value="weight">Por peso</option>
          </Select>
          {form.saleMode === "weight" ? (
            <Select label="Peso em *" value={form.weightUnit} onChange={(event) => updateForm("weightUnit", event.target.value)}>
              <option value="kg">kg</option>
              <option value="g">g</option>
            </Select>
          ) : (
            <Select label="Unidade *" value={form.unit} onChange={(event) => updateForm("unit", event.target.value)}>
              <option value="unidade">unidade</option>
              <option value="saco">saco</option>
              <option value="litro">litro</option>
              <option value="caixa">caixa</option>
            </Select>
          )}
          <Select label="Fornecedor" value={form.supplierId} onChange={(event) => updateForm("supplierId", event.target.value)}>
            <option value="">Selecione</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </Select>
          <Input
            label={`Preco de Venda (R$) *${form.saleMode === "weight" ? ` por ${form.weightUnit}` : ""}`}
            type="number"
            step="0.01"
            value={form.price}
            onChange={(event) => updateForm("price", event.target.value)}
          />
          <Input label="Custo (R$)" type="number" step="0.01" value={form.cost} onChange={(event) => updateForm("cost", event.target.value)} />
          <Input
            label={`Estoque Atual${form.saleMode === "weight" ? ` (${form.weightUnit})` : ""}`}
            type="number"
            step={form.saleMode === "weight" ? "0.001" : "1"}
            value={form.stock}
            onChange={(event) => updateForm("stock", event.target.value)}
          />
          <Input
            label={`Estoque Minimo${form.saleMode === "weight" ? ` (${form.weightUnit})` : ""}`}
            type="number"
            step={form.saleMode === "weight" ? "0.001" : "1"}
            value={form.minStock}
            onChange={(event) => updateForm("minStock", event.target.value)}
          />
          <Input label="Validade" type="date" value={form.expiry} onChange={(event) => updateForm("expiry", event.target.value)} />
          <div style={{ gridColumn: "1/-1" }}>
            <Input label="Codigo de Barras" value={form.barcode} onChange={(event) => updateForm("barcode", event.target.value)} />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
          <Btn variant="outline" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn onClick={saveProduct} icon={Check}>Salvar</Btn>
        </div>
      </Modal>
    </div>
  );
}
