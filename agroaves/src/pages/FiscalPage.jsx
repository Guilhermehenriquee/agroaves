import { useEffect, useState } from "react";
import { CheckCircle, Printer, RefreshCw, Save, Server, Settings2 } from "lucide-react";
import { api } from "../api/service.js";
import { Badge, Btn, Card, EmptyState, ErrorCard, LoadingCard, SectionHeader, Select, Table, Td } from "../components/ui.jsx";
import { C, fmt, fmtDate } from "../lib/designSystem.js";
import { openFiscalPrint } from "../lib/fiscalPrint.js";

const EMPTY_SETTINGS = {
  autoPrintEnabled: false,
  printerName: "",
  printers: [],
  suggestedPrinter: "",
};

export function FiscalPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [documents, setDocuments] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [settings, setSettings] = useState(EMPTY_SETTINGS);
  const [infoMessage, setInfoMessage] = useState("");

  useEffect(() => {
    void loadFiscal();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setSelectedDocument(null);
      return;
    }

    void loadDocument(selectedId);
  }, [selectedId]);

  async function loadFiscal() {
    try {
      setLoading(true);
      const [fiscalResult, settingsResult] = await Promise.all([
        api.getFiscalDocuments(),
        api.getFiscalPrintSettings(),
      ]);
      setDocuments(fiscalResult.documents);
      setSelectedId((current) => current ?? fiscalResult.documents[0]?.id ?? null);
      setSettings(settingsResult);
      setError("");
      setInfoMessage("");
    } catch (currentError) {
      setError(currentError.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadDocument(id) {
    try {
      const result = await api.getFiscalDocument(id);
      setSelectedDocument(result.document);
    } catch (currentError) {
      setError(currentError.message);
    }
  }

  function printBrowser() {
    if (selectedDocument) {
      openFiscalPrint(selectedDocument);
    }
  }

  async function printDirect() {
    if (!selectedId) {
      return;
    }

    try {
      const result = await api.printFiscalDocumentDirect(selectedId);
      setInfoMessage(`Nota enviada para ${result.printerName}.`);
      setSelectedDocument(result.document);
      const fiscalResult = await api.getFiscalDocuments();
      setDocuments(fiscalResult.documents);
    } catch (currentError) {
      setError(currentError.message);
    }
  }

  async function saveSettings() {
    try {
      const result = await api.saveFiscalPrintSettings({
        autoPrintEnabled: settings.autoPrintEnabled,
        printerName: settings.printerName,
      });
      setSettings(result);
      setInfoMessage("Configuracao de impressao direta salva.");
      setError("");
    } catch (currentError) {
      setError(currentError.message);
    }
  }

  if (loading) {
    return <LoadingCard label="Carregando modulo fiscal..." />;
  }

  if (error) {
    return <ErrorCard message={error} onRetry={loadFiscal} />;
  }

  return (
    <div>
      <SectionHeader
        title="Fiscal"
        subtitle="Documentos fiscais gerados automaticamente a cada venda"
        action={
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="outline" icon={RefreshCw} onClick={loadFiscal}>Atualizar</Btn>
            <Btn variant="outline" icon={Printer} onClick={printBrowser} disabled={!selectedDocument}>Impressao Visual</Btn>
            <Btn icon={Server} onClick={printDirect} disabled={!selectedDocument}>Imprimir Direto</Btn>
          </div>
        }
      />

      {infoMessage ? (
        <div style={{ marginBottom: 16, padding: "10px 12px", borderRadius: 10, background: C.successBg, color: C.success, fontSize: 13 }}>
          {infoMessage}
        </div>
      ) : null}

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <Settings2 size={18} color={C.accent} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Impressao Direta</div>
            <div style={{ fontSize: 12, color: C.textSec }}>
              Configure a impressora local para a nota sair direto do servidor sem popup do navegador.
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 16, alignItems: "end" }}>
          <Select
            label="Impressao automatica nas vendas"
            value={String(settings.autoPrintEnabled)}
            onChange={(event) => setSettings((current) => ({ ...current, autoPrintEnabled: event.target.value === "true" }))}
          >
            <option value="false">Desativada</option>
            <option value="true">Ativada</option>
          </Select>

          <Select
            label="Impressora"
            value={settings.printerName}
            onChange={(event) => setSettings((current) => ({ ...current, printerName: event.target.value }))}
          >
            <option value="">Usar impressora sugerida</option>
            {settings.printers.map((printer) => (
              <option key={printer.name} value={printer.name} disabled={printer.virtual}>
                {printer.name}{printer.default ? " (padrao)" : ""}{printer.virtual ? " - virtual" : ""}
              </option>
            ))}
          </Select>

          <Btn icon={Save} onClick={saveSettings}>Salvar</Btn>
        </div>

        <div style={{ marginTop: 14, fontSize: 12, color: C.textSec, lineHeight: 1.55 }}>
          Impressora sugerida: <strong style={{ color: C.text }}>{settings.suggestedPrinter || "nenhuma impressora fisica detectada"}</strong>
        </div>
        {settings.accessError ? (
          <div style={{ marginTop: 10, fontSize: 12, color: C.warning }}>
            Nao foi possivel consultar as impressoras locais: {settings.accessError}
          </div>
        ) : null}
      </Card>

      {documents.length === 0 ? (
        <EmptyState title="Nenhuma nota encontrada" description="Assim que uma venda for concluida no PDV, a nota fiscal interna aparecera aqui para reimpressao." />
      ) : (
        <>
          <Card style={{ marginBottom: 16 }}>
            <Table
              headers={["Documento", "Venda", "Destinatario", "Tipo", "Total", "Emissao", "Impressao", ""]}
              rows={documents.map((document) => [
                <Td key="document">
                  <div style={{ fontWeight: 700, color: C.accent }}>{document.documentNumberDisplay}</div>
                  <div style={{ fontSize: 11, color: C.textSec }}>Serie {document.series}</div>
                </Td>,
                <Td key="sale">{document.saleNumber}</Td>,
                <Td key="recipient">
                  <div style={{ fontWeight: 500 }}>{document.recipientName}</div>
                  <div style={{ fontSize: 11, color: C.textSec }}>{document.recipientDoc || "Consumidor Final"}</div>
                </Td>,
                <Td key="type">
                  <Badge label={document.documentTypeLabel} bg={document.documentType === "nfe" ? C.infoBg : C.successBg} text={document.documentType === "nfe" ? C.info : C.success} />
                </Td>,
                <Td key="total">{fmt(document.total)}</Td>,
                <Td key="issued">{fmtDate(document.issuedAt)}</Td>,
                <Td key="print">
                  {document.lastPrintedAt ? (
                    <div style={{ fontSize: 11, color: C.textSec }}>
                      {fmtDate(document.lastPrintedAt)}
                      <div>{document.printerName || "servidor local"}</div>
                    </div>
                  ) : document.printError ? (
                    <span style={{ color: C.warning, fontSize: 11 }}>{document.printError}</span>
                  ) : (
                    <span style={{ color: C.textSec, fontSize: 11 }}>Aguardando</span>
                  )}
                </Td>,
                <Td key="action">
                  <Btn variant={selectedId === document.id ? "primary" : "outline"} size="sm" onClick={() => setSelectedId(document.id)}>
                    Ver
                  </Btn>
                </Td>,
              ])}
            />
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
            <Card>
              {selectedDocument ? (
                <>
                  <div style={{ textAlign: "center", paddingBottom: 18, borderBottom: `1px solid ${C.border}`, marginBottom: 20 }}>
                    <CheckCircle size={46} color={C.success} style={{ marginBottom: 12 }} />
                    <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>
                      {selectedDocument.documentTypeLabel} {selectedDocument.documentNumberDisplay}
                    </div>
                    <div style={{ fontSize: 14, color: C.textSec, marginTop: 6 }}>
                      Venda {selectedDocument.saleNumber} · Serie {selectedDocument.series} · {fmtDate(selectedDocument.issuedAt)}
                    </div>
                  </div>

                  <div style={{ maxWidth: 520, margin: "0 auto" }}>
                    <div style={{ border: `1px dashed ${C.borderMed}`, borderRadius: 12, padding: 20, fontFamily: "monospace", fontSize: 12, lineHeight: 2 }}>
                      <div style={{ textAlign: "center", fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{selectedDocument.issuer.name}</div>
                      <div style={{ textAlign: "center", color: C.textSec, marginBottom: 12 }}>
                        CNPJ: {selectedDocument.issuer.cnpj} · IE: {selectedDocument.issuer.ie}
                      </div>
                      <div style={{ textAlign: "center", color: C.textSec, marginBottom: 12 }}>
                        {selectedDocument.issuer.address} · {selectedDocument.issuer.city}
                      </div>
                      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}><span>{selectedDocument.documentTypeLabel} Nº</span><span>{selectedDocument.documentNumberDisplay}</span></div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}><span>Serie:</span><span>{selectedDocument.series}</span></div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}><span>Destinatario:</span><span>{selectedDocument.recipient.name}</span></div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}><span>Documento:</span><span>{selectedDocument.recipient.doc || "Consumidor Final"}</span></div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}><span>Pagamento:</span><span>{selectedDocument.paymentLabel}</span></div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginTop: 8, fontSize: 14 }}><span>TOTAL:</span><span>{fmt(selectedDocument.financial.total)}</span></div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "center" }}>
                      <Btn icon={Printer} variant="outline" onClick={printBrowser}>Impressao Visual</Btn>
                      <Btn icon={Server} onClick={printDirect}>Impressao Direta</Btn>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ color: C.textSec }}>Selecione um documento para visualizar.</div>
              )}
            </Card>

            <Card>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Observacoes</div>
              <div style={{ display: "grid", gap: 10, fontSize: 13, color: C.textSec, lineHeight: 1.55 }}>
                <div>A cada venda o sistema gera automaticamente um documento fiscal interno.</div>
                <div>Se a impressao direta estiver ativa e houver impressora fisica configurada, a nota sai automaticamente a cada venda.</div>
                <div>A impressao visual pelo navegador continua disponivel como fallback.</div>
                <div>Para NF-e ou NFC-e com validade fiscal oficial, ainda sera necessario integrar certificado digital e SEFAZ.</div>
              </div>

              {selectedDocument ? (
                <>
                  <div style={{ fontSize: 14, fontWeight: 700, margin: "22px 0 12px" }}>Itens da Nota</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {selectedDocument.items.map((item, index) => (
                      <div key={`${item.product}-${index}`} style={{ background: C.bg, borderRadius: 10, padding: "10px 12px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{item.product}</div>
                        <div style={{ fontSize: 12, color: C.textSec }}>{item.brand}</div>
                        <div style={{ fontSize: 12, color: C.textSec }}>
                          {item.quantity} {item.unit} · {fmt(item.unitPrice)} · {fmt(item.lineTotal)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}`, fontSize: 12, color: C.textSec }}>
                    {selectedDocument.legalNotice}
                  </div>
                </>
              ) : null}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
