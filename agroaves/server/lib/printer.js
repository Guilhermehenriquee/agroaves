import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";

const DATA_DIR = process.env.AGROAVES_DATA_DIR
  ? path.resolve(process.env.AGROAVES_DATA_DIR)
  : path.join(process.cwd(), "server", "data");

function runPowerShell(command) {
  return new Promise((resolve, reject) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", command],
      { windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr?.trim() || error.message));
          return;
        }

        resolve(stdout.trim());
      },
    );
  });
}

function escapePowerShell(value) {
  return String(value ?? "").replaceAll("'", "''");
}

function isVirtualPrinter(printer) {
  const name = `${printer.name} ${printer.driverName}`.toLowerCase();
  return ["pdf", "onenote", "fax", "xps", "microsoft print", "send to"].some((token) => name.includes(token));
}

function padRight(value, size) {
  const text = String(value ?? "");
  return text.length >= size ? text.slice(0, size) : `${text}${" ".repeat(size - text.length)}`;
}

function padLeft(value, size) {
  const text = String(value ?? "");
  return text.length >= size ? text.slice(0, size) : `${" ".repeat(size - text.length)}${text}`;
}

function money(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));
}

function dateTime(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function buildReceiptLines(document) {
  const lines = [];
  lines.push(document.issuer.name);
  lines.push(`CNPJ ${document.issuer.cnpj}  IE ${document.issuer.ie}`);
  lines.push(document.issuer.address);
  lines.push(document.issuer.city);
  lines.push("----------------------------------------");
  lines.push(`${document.documentTypeLabel} ${document.documentNumberDisplay}`);
  lines.push(`Serie ${document.series}  Venda ${document.saleNumber}`);
  lines.push(`Emissao ${dateTime(document.issuedAt)}`);
  lines.push(`Cliente ${document.recipient.name}`);
  lines.push(`Doc ${document.recipient.doc || "Consumidor Final"}`);
  lines.push("----------------------------------------");
  lines.push("Produto");
  lines.push("Marca                Qtd   Unit   Total");

  for (const item of document.items) {
    lines.push(item.product);
    lines.push(
      `${padRight(item.brand, 18)} ${padLeft(item.quantity, 4)} ${padLeft(money(item.unitPrice), 7)} ${padLeft(money(item.lineTotal), 8)}`,
    );
  }

  lines.push("----------------------------------------");
  lines.push(`${padRight("Subtotal", 24)}${padLeft(money(document.financial.subtotal), 16)}`);
  lines.push(`${padRight("Desconto", 24)}${padLeft(money(document.financial.discountValue), 16)}`);
  lines.push(`${padRight("Total", 24)}${padLeft(money(document.financial.total), 16)}`);
  lines.push(`${padRight("Pagamento", 24)}${padLeft(document.paymentLabel, 16)}`);
  lines.push(`${padRight("Valor pago", 24)}${padLeft(money(document.financial.amountPaid), 16)}`);
  lines.push(`${padRight("Troco", 24)}${padLeft(money(document.financial.changeDue), 16)}`);
  lines.push("----------------------------------------");
  lines.push(document.legalNotice);
  lines.push("");
  lines.push("");

  return lines.join(os.EOL);
}

export async function listPrinters() {
  const output = await runPowerShell(
    "Get-Printer | Select-Object Name,Default,Type,DriverName | ConvertTo-Json -Compress",
  );
  const parsed = output ? JSON.parse(output) : [];
  const printers = Array.isArray(parsed) ? parsed : [parsed];

  return printers.map((printer) => ({
    name: printer.Name,
    default: Boolean(printer.Default),
    type: printer.Type,
    driverName: printer.DriverName,
    virtual: isVirtualPrinter({
      name: printer.Name,
      driverName: printer.DriverName,
    }),
  }));
}

export function chooseDirectPrinter(printers, configuredPrinterName) {
  if (configuredPrinterName) {
    const configured = printers.find((printer) => printer.name === configuredPrinterName);
    return configured && !configured.virtual ? configured : null;
  }

  const defaultPrinter = printers.find((printer) => printer.default && !printer.virtual);
  if (defaultPrinter) {
    return defaultPrinter;
  }

  return printers.find((printer) => !printer.virtual) ?? null;
}

export async function printFiscalDocument(document, printerName) {
  const printDir = path.join(DATA_DIR, "print-jobs");
  mkdirSync(printDir, { recursive: true });
  const fileName = `fiscal-${document.documentNumberDisplay.replaceAll(".", "-")}.txt`;
  const filePath = path.join(printDir, fileName);
  writeFileSync(filePath, buildReceiptLines(document), "utf8");

  const safePath = escapePowerShell(filePath);
  const safePrinter = escapePowerShell(printerName);
  await runPowerShell(`Get-Content -LiteralPath '${safePath}' | Out-Printer -Name '${safePrinter}'`);

  return {
    printerName,
    filePath,
  };
}
