function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function fmtCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));
}

function fmtDateTime(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function buildItemsRows(document) {
  return document.items
    .map((item) => {
      return `
        <tr>
          <td>${escapeHtml(item.product)}</td>
          <td>${escapeHtml(item.brand)}</td>
          <td style="text-align:right">${item.quantity}</td>
          <td style="text-align:right">${fmtCurrency(item.unitPrice)}</td>
          <td style="text-align:right">${fmtCurrency(item.lineTotal)}</td>
        </tr>
      `;
    })
    .join("");
}

function buildPrintHtml(document, { autoPrint = true } = {}) {
  return `<!doctype html>
  <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(document.documentTypeLabel)} ${escapeHtml(document.documentNumberDisplay)}</title>
      <style>
        body { font-family: Consolas, 'Courier New', monospace; margin: 0; background: #fff; color: #111; }
        .page { width: 80mm; margin: 0 auto; padding: 12px; }
        .center { text-align: center; }
        .section { border-top: 1px dashed #999; padding-top: 10px; margin-top: 10px; }
        .muted { color: #555; font-size: 11px; }
        .strong { font-weight: 700; }
        .row { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th, td { padding: 4px 0; border-bottom: 1px dashed #ddd; vertical-align: top; }
        th { text-align: left; }
        .totals .row { font-size: 12px; }
        .total-row { font-size: 14px; font-weight: 700; }
        .screen-actions { display: flex; justify-content: center; padding: 10px; }
        .screen-actions button { border: 1px solid #ddd; border-radius: 8px; background: #111; color: #fff; padding: 8px 14px; cursor: pointer; font-family: Arial, sans-serif; }
        @media print {
          body { margin: 0; }
          .page { width: auto; margin: 0; }
          .screen-actions { display: none; }
        }
      </style>
    </head>
    <body>
      ${autoPrint ? "" : '<div class="screen-actions"><button onclick="window.print()">Imprimir comprovante</button></div>'}
      <div class="page">
        <div class="center">
          <div class="strong">${escapeHtml(document.issuer.name)}</div>
          <div class="muted">CNPJ: ${escapeHtml(document.issuer.cnpj)} · IE: ${escapeHtml(document.issuer.ie)}</div>
          <div class="muted">${escapeHtml(document.issuer.address)} · ${escapeHtml(document.issuer.city)}</div>
        </div>

        <div class="section">
          <div class="center strong">${escapeHtml(document.documentTypeLabel)} ${escapeHtml(document.documentNumberDisplay)}</div>
          <div class="row"><span>Serie</span><span>${escapeHtml(document.series)}</span></div>
          <div class="row"><span>Venda</span><span>${escapeHtml(document.saleNumber)}</span></div>
          <div class="row"><span>Emissao</span><span>${escapeHtml(fmtDateTime(document.issuedAt))}</span></div>
          <div class="row"><span>Status</span><span>${escapeHtml(document.status)}</span></div>
        </div>

        <div class="section">
          <div class="strong">Destinatario</div>
          <div class="muted">${escapeHtml(document.recipient.name)}</div>
          <div class="muted">${escapeHtml(document.recipient.doc || "Consumidor final")}</div>
          <div class="muted">${escapeHtml(document.recipient.phone || "")}</div>
        </div>

        <div class="section">
          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Marca</th>
                <th style="text-align:right">Qtd</th>
                <th style="text-align:right">Unit</th>
                <th style="text-align:right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${buildItemsRows(document)}
            </tbody>
          </table>
        </div>

        <div class="section totals">
          <div class="row"><span>Subtotal</span><span>${fmtCurrency(document.financial.subtotal)}</span></div>
          <div class="row"><span>Desconto</span><span>${fmtCurrency(document.financial.discountValue)}</span></div>
          <div class="row total-row"><span>Total</span><span>${fmtCurrency(document.financial.total)}</span></div>
          <div class="row"><span>Pagamento</span><span>${escapeHtml(document.paymentLabel)}</span></div>
          <div class="row"><span>Valor pago</span><span>${fmtCurrency(document.financial.amountPaid)}</span></div>
          <div class="row"><span>Troco</span><span>${fmtCurrency(document.financial.changeDue)}</span></div>
        </div>

        <div class="section center">
          <div class="muted">${escapeHtml(document.legalNotice)}</div>
        </div>
      </div>
      ${autoPrint ? `<script>
        window.onload = function () {
          setTimeout(function () {
            window.focus();
            window.print();
          }, 250);
        };
      </script>` : ""}
    </body>
  </html>`;
}

export function openFiscalPrint(document, existingWindow = null, options = {}) {
  const printWindow = existingWindow && !existingWindow.closed
    ? existingWindow
    : window.open("", "_blank", "width=480,height=760");

  if (!printWindow) {
    return false;
  }

  printWindow.document.open();
  printWindow.document.write(buildPrintHtml(document, options));
  printWindow.document.close();
  return true;
}
