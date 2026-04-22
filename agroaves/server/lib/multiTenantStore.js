import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  addDays,
  buildMonthDates,
  buildWindowDates,
  categoryLabel,
  clampNumber,
  dateOnly,
  daysUntil,
  formatDatePt,
  formatTimePt,
  interpolateTemplate,
  nowIso,
  paymentLabel,
  safeTrim,
  saleNumberFromId,
  shortMonth,
  shortWeekday,
  toNumber,
  unique,
} from "./utils.js";
import { createSessionToken, verifyPassword } from "./security.js";
import {
  clientSeed,
  messageTemplateSeed,
  productSeed,
  saleSeed,
  seedStoresAndUsers,
  storeSeed,
  supplierSeed,
} from "./seed.js";
import { chooseDirectPrinter, listPrinters, printFiscalDocument } from "./printer.js";

const DATA_DIR = process.env.AGROAVES_DATA_DIR
  ? path.resolve(process.env.AGROAVES_DATA_DIR)
  : path.join(process.cwd(), "server", "data");
const AUTH_DB_PATH = path.join(DATA_DIR, "agroaves.db");
const STORE_DB_DIR = path.join(DATA_DIR, "stores");
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const FISCAL_SERIES = "001";
const DEFAULT_STORE_SLUG = storeSeed[0]?.slug ?? "agroaves-matriz";
const SERVER_PRINT_ENABLED = process.env.AGROAVES_ENABLE_DIRECT_PRINT === "true"
  || (process.env.NODE_ENV !== "production" && process.env.AGROAVES_ENABLE_DIRECT_PRINT !== "false");

function ensureDataPaths() {
  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(STORE_DB_DIR, { recursive: true });
}

function ensureColumn(db, tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  if (!columns.some((column) => column.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function tableExists(db, tableName) {
  return Boolean(
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(tableName),
  );
}

function listColumns(db, tableName) {
  if (!tableExists(db, tableName)) {
    return [];
  }

  return db.prepare(`PRAGMA table_info(${tableName})`).all().map((column) => column.name);
}

function countRows(db, tableName) {
  if (!tableExists(db, tableName)) {
    return 0;
  }

  return Number(db.prepare(`SELECT COUNT(*) AS total FROM ${tableName}`).get().total);
}

function fiscalTypeForClientType(clientType) {
  return clientType === "pj" ? "nfe" : "nfce";
}

function fiscalTypeLabel(documentType) {
  return documentType === "nfe" ? "NF-e" : "NFC-e";
}

function formatFiscalNumber(documentNumber) {
  const raw = String(documentNumber).padStart(6, "0");
  return `${raw.slice(0, 3)}.${raw.slice(3)}`;
}

function normalizeQuantity(value, fallback = 0) {
  const parsed = toNumber(value, fallback);
  const rounded = Math.round(parsed * 1000) / 1000;
  return rounded >= 0 ? rounded : 0;
}

function mapProduct(row) {
  const inferredWeightUnit = row.weight_unit ?? (["kg", "g"].includes(row.unit) ? row.unit : "");
  const inferredSaleMode = row.sale_mode ?? (inferredWeightUnit ? "weight" : "unit");
  return {
    id: row.id,
    name: row.name,
    cat: row.category,
    supplies: row.supplies ?? "",
    suppliedBrands: row.supplied_brands ?? "",
    brand: row.brand,
    price: Number(row.price),
    cost: Number(row.cost),
    stock: Number(row.stock),
    unit: row.unit,
    minStock: Number(row.min_stock),
    saleMode: inferredSaleMode,
    weightUnit: inferredWeightUnit,
    expiry: row.expiry,
    supplierId: row.supplier_id,
    supplier: row.supplier_name ?? "Sem fornecedor",
    barcode: row.barcode,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapClient(row) {
  return {
    id: row.id,
    name: row.name,
    doc: row.doc,
    phone: row.phone,
    email: row.email,
    city: row.city,
    fiado: Number(row.open_credit),
    limit: Number(row.credit_limit),
    lastPurchase: row.last_purchase_at ? formatDatePt(row.last_purchase_at) : "—",
    lastPurchaseAt: row.last_purchase_at,
    type: row.client_type,
    active: Boolean(row.active ?? 1),
  };
}

function mapSupplier(row) {
  return {
    id: row.id,
    name: row.name,
    cnpj: row.cnpj,
    contact: row.contact,
    phone: row.phone,
    email: row.email,
    cat: row.category,
    lastOrder: row.last_order_at ? formatDatePt(row.last_order_at) : "—",
    lastOrderAt: row.last_order_at,
    pending: Number(row.pending_amount),
    active: Boolean(row.active ?? 1),
  };
}

function mapRecentSale(row) {
  return {
    id: row.sale_number,
    client: row.client_name ?? "Consumidor Final",
    items: Number(row.items_count),
    total: Number(row.total),
    pay: paymentLabel(row.payment_method),
    time: formatTimePt(row.created_at),
    createdAt: row.created_at,
  };
}

function mapFiscalSummary(row) {
  return {
    id: row.id,
    saleId: row.sale_id,
    saleNumber: row.sale_number,
    documentType: row.doc_type,
    documentTypeLabel: fiscalTypeLabel(row.doc_type),
    documentNumber: row.document_number,
    documentNumberDisplay: formatFiscalNumber(row.document_number),
    series: row.series,
    recipientName: row.recipient_name ?? row.client_name ?? "Consumidor Final",
    recipientDoc: row.recipient_doc ?? row.client_doc ?? "",
    total: Number(row.total),
    paymentMethod: row.payment_method,
    paymentLabel: paymentLabel(row.payment_method),
    issuedAt: row.issued_at,
    status: row.status,
    printerName: row.printer_name ?? "",
    lastPrintedAt: row.last_printed_at,
    printError: row.print_error ?? "",
  };
}

function calculateMeta(position, period) {
  if (period === "week") {
    const targets = [1500, 1500, 1500, 1500, 2000, 2500, 1000];
    return targets[position] ?? 1500;
  }

  const targets = [42000, 45000, 50000, 48000, 46000, 52000, 40000];
  return targets[position] ?? 45000;
}

function buildChartSeries(facts, period) {
  if (period === "week") {
    return buildWindowDates(7).map((date, index) => {
      const key = dateOnly(date.toISOString());
      const total = facts
        .filter((item) => dateOnly(item.createdAt) === key)
        .reduce((sum, item) => sum + item.lineTotal, 0);

      return {
        name: shortWeekday(date),
        Vendas: total,
        Meta: calculateMeta(index, "week"),
      };
    });
  }

  return buildMonthDates(7).map((month, index) => {
    const targetMonth = month.getMonth();
    const targetYear = month.getFullYear();
    const total = facts
      .filter((item) => {
        const createdAt = new Date(item.createdAt);
        return createdAt.getMonth() === targetMonth && createdAt.getFullYear() === targetYear;
      })
      .reduce((sum, item) => sum + item.lineTotal, 0);

    return {
      name: shortMonth(month),
      Vendas: total,
      Meta: calculateMeta(index, "month"),
    };
  });
}

function buildCategoryShare(facts) {
  const totals = facts.reduce((map, item) => {
    map.set(item.category, (map.get(item.category) ?? 0) + item.lineTotal);
    return map;
  }, new Map());

  const grandTotal = [...totals.values()].reduce((sum, value) => sum + value, 0);
  if (grandTotal === 0) {
    return [];
  }

  const palette = {
    racoes: "#2a7a3a",
    aves: "#2563eb",
    medicamentos: "#D4880C",
    utensilios: "#7c3aed",
  };

  return [...totals.entries()]
    .map(([category, value]) => ({
      name: categoryLabel(category),
      value: Math.round((value / grandTotal) * 100),
      color: palette[category] ?? "#64748b",
    }))
    .sort((left, right) => right.value - left.value);
}

function buildBrandSales(facts) {
  return [...facts.reduce((map, item) => {
    map.set(item.brand, (map.get(item.brand) ?? 0) + item.lineTotal);
    return map;
  }, new Map()).entries()]
    .map(([name, total]) => ({ name, total }))
    .sort((left, right) => right.total - left.total);
}

function buildTopProducts(facts) {
  const grouped = new Map();

  for (const item of facts) {
    const current = grouped.get(item.productId);
    if (current) {
      current.quantity += item.quantity;
      current.revenue += item.lineTotal;
    } else {
      grouped.set(item.productId, {
        id: item.productId,
        name: item.productName,
        cat: item.category,
        unit: item.unit,
        brand: item.brand,
        quantity: item.quantity,
        revenue: item.lineTotal,
        price: item.unitPrice,
        cost: item.productCost,
      });
    }
  }

  return [...grouped.values()]
    .sort((left, right) => right.revenue - left.revenue)
    .slice(0, 5)
    .map((item) => ({
      ...item,
      margin: item.price > 0 ? Math.round(((item.price - item.cost) / item.price) * 100) : 0,
    }));
}

function matchesBrand(item, brand) {
  return !brand || brand === "all" || item.brand === brand;
}

function filterFactsByPeriod(facts, period) {
  const now = new Date();
  const days = period === "week" ? 6 : 210;
  const threshold = addDays(now, -days);
  threshold.setHours(0, 0, 0, 0);
  return facts.filter((item) => new Date(item.createdAt) >= threshold);
}

function mapIssuer(storeRecord) {
  return {
    name: storeRecord.name,
    cnpj: storeRecord.cnpj ?? "",
    ie: storeRecord.ie ?? "",
    address: storeRecord.address ?? "",
    city: storeRecord.city ?? "",
  };
}

function ensureAuthSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      cnpj TEXT,
      ie TEXT,
      address TEXT,
      city TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id INTEGER,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (store_id) REFERENCES stores(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  ensureColumn(db, "users", "store_id", "INTEGER");
}

function ensureTenantSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      cnpj TEXT,
      contact TEXT,
      phone TEXT,
      email TEXT,
      category TEXT,
      supplies TEXT,
      supplied_brands TEXT,
      pending_amount REAL NOT NULL DEFAULT 0,
      last_order_at TEXT,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      brand TEXT NOT NULL,
      price REAL NOT NULL,
      cost REAL NOT NULL,
      stock REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL,
      min_stock REAL NOT NULL DEFAULT 0,
      sale_mode TEXT NOT NULL DEFAULT 'unit',
      weight_unit TEXT,
      expiry TEXT,
      supplier_id INTEGER,
      barcode TEXT UNIQUE,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      doc TEXT UNIQUE,
      phone TEXT,
      email TEXT,
      city TEXT,
      credit_limit REAL NOT NULL DEFAULT 0,
      client_type TEXT NOT NULL,
      open_credit REAL NOT NULL DEFAULT 0,
      last_purchase_at TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_number TEXT NOT NULL UNIQUE,
      client_id INTEGER,
      payment_method TEXT NOT NULL,
      discount_percent REAL NOT NULL DEFAULT 0,
      discount_value REAL NOT NULL DEFAULT 0,
      subtotal REAL NOT NULL,
      total REAL NOT NULL,
      amount_paid REAL NOT NULL DEFAULT 0,
      change_due REAL NOT NULL DEFAULT 0,
      note TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      line_total REAL NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS message_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL UNIQUE,
      channel TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS message_dispatches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      client_id INTEGER,
      product_id INTEGER NOT NULL,
      channel TEXT NOT NULL,
      recipient TEXT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (client_id) REFERENCES clients(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS fiscal_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL UNIQUE,
      doc_type TEXT NOT NULL,
      document_number INTEGER NOT NULL UNIQUE,
      series TEXT NOT NULL DEFAULT '001',
      recipient_name TEXT,
      recipient_doc TEXT,
      recipient_email TEXT,
      recipient_phone TEXT,
      status TEXT NOT NULL,
      issued_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS manual_message_dispatches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      audience_type TEXT NOT NULL,
      audience_label TEXT NOT NULL,
      channel TEXT NOT NULL,
      recipient TEXT,
      recipient_name TEXT NOT NULL,
      client_id INTEGER,
      supplier_id INTEGER,
      product_id INTEGER,
      brand TEXT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `);

  ensureColumn(db, "suppliers", "supplies", "TEXT");
  ensureColumn(db, "suppliers", "supplied_brands", "TEXT");
  ensureColumn(db, "suppliers", "active", "INTEGER NOT NULL DEFAULT 1");
  ensureColumn(db, "products", "sale_mode", "TEXT NOT NULL DEFAULT 'unit'");
  ensureColumn(db, "products", "weight_unit", "TEXT");
  ensureColumn(db, "clients", "active", "INTEGER NOT NULL DEFAULT 1");
  ensureColumn(db, "fiscal_documents", "printer_name", "TEXT");
  ensureColumn(db, "fiscal_documents", "last_printed_at", "TEXT");
  ensureColumn(db, "fiscal_documents", "print_error", "TEXT");

  db.prepare(`
    UPDATE products
    SET sale_mode = CASE
      WHEN unit IN ('kg', 'g') THEN 'weight'
      ELSE 'unit'
    END
    WHERE sale_mode IS NULL OR sale_mode = ''
  `).run();
  db.prepare(`
    UPDATE products
    SET weight_unit = unit
    WHERE (weight_unit IS NULL OR weight_unit = '') AND unit IN ('kg', 'g')
  `).run();
}

function copyTableData(sourceDb, targetDb, tableName, preferredColumns) {
  const sourceColumns = new Set(listColumns(sourceDb, tableName));
  const targetColumns = new Set(listColumns(targetDb, tableName));
  const columns = preferredColumns.filter((column) => sourceColumns.has(column) && targetColumns.has(column));

  if (columns.length === 0) {
    return;
  }

  const orderClause = columns.includes("id") ? " ORDER BY id" : "";
  const rows = sourceDb.prepare(`SELECT ${columns.join(", ")} FROM ${tableName}${orderClause}`).all();
  if (rows.length === 0) {
    return;
  }

  const placeholders = columns.map(() => "?").join(", ");
  const insert = targetDb.prepare(`
    INSERT INTO ${tableName} (${columns.join(", ")})
    VALUES (${placeholders})
  `);

  for (const row of rows) {
    insert.run(...columns.map((column) => row[column]));
  }
}

function migrateLegacyOperationalData(sourceDb, targetDb) {
  if (!tableExists(sourceDb, "products") || countRows(sourceDb, "products") === 0) {
    return false;
  }

  const tableDefinitions = [
    {
      table: "suppliers",
      columns: ["id", "name", "cnpj", "contact", "phone", "email", "category", "supplies", "supplied_brands", "pending_amount", "last_order_at", "active"],
    },
    {
      table: "products",
      columns: ["id", "name", "category", "brand", "price", "cost", "stock", "unit", "min_stock", "sale_mode", "weight_unit", "expiry", "supplier_id", "barcode", "active", "created_at", "updated_at"],
    },
    {
      table: "clients",
      columns: ["id", "name", "doc", "phone", "email", "city", "credit_limit", "client_type", "open_credit", "last_purchase_at", "active", "created_at", "updated_at"],
    },
    {
      table: "sales",
      columns: ["id", "sale_number", "client_id", "payment_method", "discount_percent", "discount_value", "subtotal", "total", "amount_paid", "change_due", "note", "created_at"],
    },
    {
      table: "sale_items",
      columns: ["id", "sale_id", "product_id", "quantity", "unit_price", "line_total"],
    },
    {
      table: "message_templates",
      columns: ["id", "product_id", "channel", "title", "content", "active", "created_at", "updated_at"],
    },
    {
      table: "message_dispatches",
      columns: ["id", "sale_id", "client_id", "product_id", "channel", "recipient", "title", "content", "status", "created_at"],
    },
    {
      table: "fiscal_documents",
      columns: ["id", "sale_id", "doc_type", "document_number", "series", "recipient_name", "recipient_doc", "recipient_email", "recipient_phone", "status", "issued_at", "created_at", "printer_name", "last_printed_at", "print_error"],
    },
    {
      table: "app_settings",
      columns: ["key", "value", "updated_at"],
    },
    {
      table: "manual_message_dispatches",
      columns: ["id", "audience_type", "audience_label", "channel", "recipient", "recipient_name", "client_id", "supplier_id", "product_id", "brand", "title", "content", "status", "created_at"],
    },
  ];

  targetDb.exec("BEGIN");
  try {
    for (const definition of tableDefinitions) {
      copyTableData(sourceDb, targetDb, definition.table, definition.columns);
    }
    targetDb.exec("COMMIT");
    return true;
  } catch (error) {
    targetDb.exec("ROLLBACK");
    throw error;
  }
}

function seedTenantDatabase(db, timestamp) {
  if (countRows(db, "products") > 0) {
    return;
  }

  const insertSupplier = db.prepare(`
    INSERT INTO suppliers (name, cnpj, contact, phone, email, category, supplies, supplied_brands, pending_amount, last_order_at, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  const supplierIds = supplierSeed.map((supplier) => {
    const result = insertSupplier.run(
      supplier.name,
      supplier.cnpj,
      supplier.contact,
      supplier.phone,
      supplier.email,
      supplier.category,
      supplier.supplies ?? "",
      supplier.suppliedBrands ?? "",
      supplier.pendingAmount,
      supplier.lastOrderAt,
    );
    return Number(result.lastInsertRowid);
  });

  const insertProduct = db.prepare(`
    INSERT INTO products
      (name, category, brand, price, cost, stock, unit, min_stock, sale_mode, weight_unit, expiry, supplier_id, barcode, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);
  const productIdsByBarcode = new Map();
  for (const product of productSeed) {
    const result = insertProduct.run(
      product.name,
      product.category,
      product.brand,
      product.price,
      product.cost,
      product.stock,
      product.unit,
      product.minStock,
      product.saleMode ?? "unit",
      product.weightUnit ?? null,
      product.expiry,
      supplierIds[product.supplierIndex],
      product.barcode,
      timestamp,
      timestamp,
    );
    productIdsByBarcode.set(product.barcode, Number(result.lastInsertRowid));
  }

  const insertClient = db.prepare(`
    INSERT INTO clients
      (name, doc, phone, email, city, credit_limit, client_type, open_credit, last_purchase_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?)
  `);
  const clientIdsByDoc = new Map();
  for (const client of clientSeed) {
    const result = insertClient.run(
      client.name,
      client.doc,
      client.phone,
      client.email,
      client.city,
      client.creditLimit,
      client.clientType,
      timestamp,
      timestamp,
    );
    clientIdsByDoc.set(client.doc, Number(result.lastInsertRowid));
  }

  const insertSale = db.prepare(`
    INSERT INTO sales
      (sale_number, client_id, payment_method, discount_percent, discount_value, subtotal, total, amount_paid, change_due, note, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const updateSaleNumber = db.prepare("UPDATE sales SET sale_number = ? WHERE id = ?");
  const insertSaleItem = db.prepare(`
    INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, line_total)
    VALUES (?, ?, ?, ?, ?)
  `);
  const updateClient = db.prepare(`
    UPDATE clients
    SET open_credit = open_credit + ?, last_purchase_at = ?, updated_at = ?
    WHERE id = ?
  `);

  for (const sale of saleSeed) {
    const saleItems = sale.items.map((item) => {
      const product = productSeed.find((entry) => entry.barcode === item.barcode);
      return {
        ...item,
        productId: productIdsByBarcode.get(item.barcode),
        product,
        lineTotal: product.price * item.quantity,
      };
    });

    const subtotal = saleItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const discountValue = subtotal * (sale.discountPercent / 100);
    const total = subtotal - discountValue;
    const amountPaid = sale.paymentMethod === "fiado" ? 0 : sale.amountPaid || total;
    const changeDue = sale.paymentMethod === "dinheiro" ? Math.max(0, amountPaid - total) : 0;
    const clientId = sale.clientDoc ? clientIdsByDoc.get(sale.clientDoc) ?? null : null;
    const saleInsert = insertSale.run(
      "TEMP",
      clientId,
      sale.paymentMethod,
      sale.discountPercent,
      discountValue,
      subtotal,
      total,
      amountPaid,
      changeDue,
      "",
      sale.createdAt,
    );
    const saleId = Number(saleInsert.lastInsertRowid);
    updateSaleNumber.run(saleNumberFromId(saleId), saleId);

    for (const item of saleItems) {
      insertSaleItem.run(saleId, item.productId, item.quantity, item.product.price, item.lineTotal);
    }

    if (clientId) {
      updateClient.run(sale.paymentMethod === "fiado" ? total : 0, sale.createdAt, sale.createdAt, clientId);
    }
  }

  const insertTemplate = db.prepare(`
    INSERT INTO message_templates (product_id, channel, title, content, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1, ?, ?)
  `);
  for (const template of messageTemplateSeed) {
    insertTemplate.run(
      productIdsByBarcode.get(template.productBarcode),
      template.channel,
      template.title,
      template.content,
      timestamp,
      timestamp,
    );
  }
}

function getNextFiscalNumber(db) {
  const row = db.prepare("SELECT COALESCE(MAX(document_number), 0) + 1 AS next FROM fiscal_documents").get();
  return Number(row.next);
}

function getSetting(db, key, fallback = null) {
  const row = db.prepare("SELECT value FROM app_settings WHERE key = ?").get(key);
  return row ? row.value : fallback;
}

function setSetting(db, key, value) {
  const timestampValue = nowIso();
  db.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(key, value, timestampValue);
}

function getSaleHeaderForFiscal(db, saleId) {
  return db.prepare(`
    SELECT
      sales.id,
      sales.sale_number,
      sales.client_id,
      sales.payment_method,
      sales.subtotal,
      sales.discount_value,
      sales.total,
      sales.amount_paid,
      sales.change_due,
      sales.created_at,
      clients.name AS client_name,
      clients.doc AS client_doc,
      clients.email AS client_email,
      clients.phone AS client_phone,
      clients.client_type AS client_type
    FROM sales
    LEFT JOIN clients ON clients.id = sales.client_id
    WHERE sales.id = ?
  `).get(saleId);
}

function getFiscalDocumentRow(db, id) {
  return db.prepare(`
    SELECT
      fiscal_documents.*,
      sales.sale_number,
      sales.total,
      sales.subtotal,
      sales.discount_value,
      sales.amount_paid,
      sales.change_due,
      sales.payment_method,
      clients.name AS client_name,
      clients.doc AS client_doc
    FROM fiscal_documents
    INNER JOIN sales ON sales.id = fiscal_documents.sale_id
    LEFT JOIN clients ON clients.id = sales.client_id
    WHERE fiscal_documents.id = ?
  `).get(id);
}

function createFiscalDocumentForSale(db, saleId, issuedAt) {
  const existing = db.prepare("SELECT id FROM fiscal_documents WHERE sale_id = ?").get(saleId);
  if (existing) {
    return Number(existing.id);
  }

  const sale = getSaleHeaderForFiscal(db, saleId);
  if (!sale) {
    throw new Error("Venda nao encontrada para emissao fiscal.");
  }

  const documentNumber = getNextFiscalNumber(db);
  const timestampValue = issuedAt ?? sale.created_at;
  db.prepare(`
    INSERT INTO fiscal_documents
      (sale_id, doc_type, document_number, series, recipient_name, recipient_doc, recipient_email, recipient_phone, status, issued_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    saleId,
    fiscalTypeForClientType(sale.client_type),
    documentNumber,
    FISCAL_SERIES,
    sale.client_name ?? "Consumidor Final",
    sale.client_doc ?? "",
    sale.client_email ?? "",
    sale.client_phone ?? "",
    "emitida",
    timestampValue,
    timestampValue,
  );

  return Number(db.prepare("SELECT id FROM fiscal_documents WHERE sale_id = ?").get(saleId).id);
}

function backfillFiscalDocuments(db) {
  const pending = db.prepare(`
    SELECT sales.id, sales.created_at
    FROM sales
    LEFT JOIN fiscal_documents ON fiscal_documents.sale_id = sales.id
    WHERE fiscal_documents.id IS NULL
    ORDER BY sales.id
  `).all();

  for (const sale of pending) {
    createFiscalDocumentForSale(db, sale.id, sale.created_at);
  }
}

function buildUserPayload(row) {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    role: row.role,
    storeId: Number(row.store_id),
    storeName: row.store_name,
    storeSlug: row.store_slug,
    storeCity: row.store_city,
    store: {
      id: Number(row.store_id),
      name: row.store_name,
      slug: row.store_slug,
      city: row.store_city,
    },
  };
}

function createStore() {
  ensureDataPaths();
  const authDb = new DatabaseSync(AUTH_DB_PATH);
  authDb.exec("PRAGMA foreign_keys = ON;");
  ensureAuthSchema(authDb);

  const timestamp = nowIso();
  seedStoresAndUsers(authDb, timestamp);

  const defaultStore = authDb.prepare("SELECT * FROM stores WHERE slug = ?").get(DEFAULT_STORE_SLUG)
    ?? authDb.prepare("SELECT * FROM stores ORDER BY id LIMIT 1").get();

  if (defaultStore) {
    authDb.prepare("UPDATE users SET store_id = ? WHERE store_id IS NULL").run(defaultStore.id);
  }

  const tenantDbCache = new Map();

  function getStoreRecordById(storeId) {
    if (!storeId) {
      return defaultStore ?? null;
    }

    return authDb.prepare("SELECT * FROM stores WHERE id = ?").get(storeId) ?? null;
  }

  function getTenantDb(storeRecord) {
    if (!storeRecord) {
      throw new Error("Loja nao encontrada para este usuario.");
    }

    const cached = tenantDbCache.get(storeRecord.id);
    if (cached) {
      return cached;
    }

    const dbPath = path.join(STORE_DB_DIR, `${storeRecord.slug}.db`);
    const tenantDb = new DatabaseSync(dbPath);
    tenantDb.exec("PRAGMA foreign_keys = ON;");
    ensureTenantSchema(tenantDb);
    tenantDbCache.set(storeRecord.id, tenantDb);
    return tenantDb;
  }

  function initializeTenantStore(storeRecord) {
    const tenantDb = getTenantDb(storeRecord);
    if (countRows(tenantDb, "products") === 0) {
      const migrated = storeRecord.slug === defaultStore?.slug
        ? migrateLegacyOperationalData(authDb, tenantDb)
        : false;

      if (!migrated) {
        seedTenantDatabase(tenantDb, timestamp);
      }
    }

    backfillFiscalDocuments(tenantDb);
    return tenantDb;
  }

  const allStores = authDb.prepare("SELECT * FROM stores ORDER BY id").all();
  for (const storeRecord of allStores) {
    initializeTenantStore(storeRecord);
  }

  function getStoreContext(storeId) {
    const storeRecord = getStoreRecordById(storeId);
    if (!storeRecord) {
      throw new Error("Usuario sem loja vinculada.");
    }

    return {
      store: storeRecord,
      db: initializeTenantStore(storeRecord),
    };
  }

  function getProductById(storeId, id) {
    const { db } = getStoreContext(storeId);
    const row = db.prepare(`
      SELECT products.*, suppliers.name AS supplier_name
      FROM products
      LEFT JOIN suppliers ON suppliers.id = products.supplier_id
      WHERE products.id = ?
    `).get(id);

    return row ? mapProduct(row) : null;
  }

  function getClientById(storeId, id) {
    const { db } = getStoreContext(storeId);
    const row = db.prepare("SELECT * FROM clients WHERE id = ?").get(id);
    return row ? mapClient(row) : null;
  }

  function getSupplierById(storeId, id) {
    const { db } = getStoreContext(storeId);
    const row = db.prepare("SELECT * FROM suppliers WHERE id = ?").get(id);
    return row ? mapSupplier(row) : null;
  }

  function getSalesFacts(storeId) {
    const { db } = getStoreContext(storeId);
    return db.prepare(`
      SELECT
        sale_items.sale_id AS saleId,
        sales.sale_number AS saleNumber,
        sales.payment_method AS paymentMethod,
        sales.client_id AS clientId,
        sales.created_at AS createdAt,
        sale_items.product_id AS productId,
        products.name AS productName,
        products.category AS category,
        products.brand AS brand,
        products.unit AS unit,
        products.cost AS productCost,
        sale_items.quantity AS quantity,
        sale_items.unit_price AS unitPrice,
        sale_items.line_total AS lineTotal,
        clients.name AS clientName
      FROM sale_items
      INNER JOIN sales ON sales.id = sale_items.sale_id
      INNER JOIN products ON products.id = sale_items.product_id
      LEFT JOIN clients ON clients.id = sales.client_id
    `).all().map((row) => ({
      ...row,
      quantity: Number(row.quantity),
      unitPrice: Number(row.unitPrice),
      lineTotal: Number(row.lineTotal),
      productCost: Number(row.productCost),
    }));
  }

  function listClientPurchasedProducts(db, clientId, limit = 12) {
    return db.prepare(`
      SELECT
        products.id,
        products.name,
        products.brand,
        products.unit,
        products.sale_mode,
        products.weight_unit,
        SUM(sale_items.quantity) AS total_quantity,
        COUNT(DISTINCT sale_items.sale_id) AS purchase_count,
        MAX(sales.created_at) AS last_bought_at
      FROM sale_items
      INNER JOIN sales ON sales.id = sale_items.sale_id
      INNER JOIN products ON products.id = sale_items.product_id
      WHERE sales.client_id = ?
      GROUP BY products.id
      ORDER BY last_bought_at DESC
      LIMIT ?
    `).all(clientId, limit).map((row) => ({
      id: row.id,
      name: row.name,
      brand: row.brand,
      unit: row.unit,
      saleMode: row.sale_mode ?? (["kg", "g"].includes(row.unit) ? "weight" : "unit"),
      weightUnit: row.weight_unit ?? (["kg", "g"].includes(row.unit) ? row.unit : ""),
      totalQuantity: Number(row.total_quantity),
      purchaseCount: Number(row.purchase_count),
      lastBoughtAt: row.last_bought_at,
      lastBought: formatDatePt(row.last_bought_at),
    }));
  }

  function getClientPurchases(storeId, clientId) {
    const { db } = getStoreContext(storeId);
    return {
      purchases: db.prepare(`
        SELECT sale_number, total, payment_method, created_at
        FROM sales
        WHERE client_id = ?
        ORDER BY created_at DESC
        LIMIT 5
      `).all(clientId).map((row) => ({
        id: row.sale_number,
        total: Number(row.total),
        pay: paymentLabel(row.payment_method),
        time: formatTimePt(row.created_at),
        createdAt: row.created_at,
      })),
      products: listClientPurchasedProducts(db, clientId),
    };
  }

  function listRecentSales(storeId, limit = 5) {
    const { db } = getStoreContext(storeId);
    return db.prepare(`
      SELECT
        sales.sale_number,
        sales.total,
        sales.payment_method,
        sales.created_at,
        COALESCE(clients.name, 'Consumidor Final') AS client_name,
        COALESCE(SUM(sale_items.quantity), 0) AS items_count
      FROM sales
      LEFT JOIN clients ON clients.id = sales.client_id
      LEFT JOIN sale_items ON sale_items.sale_id = sales.id
      GROUP BY sales.id
      ORDER BY sales.created_at DESC
      LIMIT ?
    `).all(limit).map(mapRecentSale);
  }

  function listMessageTemplates(storeId) {
    const { db } = getStoreContext(storeId);
    return db.prepare(`
      SELECT
        message_templates.*,
        products.name AS product_name,
        products.brand AS brand,
        products.category AS category
      FROM message_templates
      INNER JOIN products ON products.id = message_templates.product_id
      WHERE products.active = 1
      ORDER BY products.name
    `).all().map((row) => ({
      id: row.id,
      productId: row.product_id,
      product: row.product_name,
      brand: row.brand,
      category: row.category,
      channel: row.channel,
      title: row.title,
      content: row.content,
      active: Boolean(row.active),
      updatedAt: row.updated_at,
    }));
  }

  function listDispatches(storeId, limit = 10) {
    const { db } = getStoreContext(storeId);
    const automatic = db.prepare(`
      SELECT
        message_dispatches.*,
        products.name AS product_name,
        products.brand AS brand,
        clients.name AS client_name
      FROM message_dispatches
      INNER JOIN products ON products.id = message_dispatches.product_id
      LEFT JOIN clients ON clients.id = message_dispatches.client_id
      ORDER BY message_dispatches.created_at DESC
      LIMIT ?
    `).all(limit).map((row) => ({
      id: `auto-${row.id}`,
      source: "Automatica",
      audience: "Pos-venda por produto",
      product: row.product_name,
      brand: row.brand,
      client: row.client_name ?? "Consumidor Final",
      contactName: row.client_name ?? "Consumidor Final",
      channel: row.channel,
      recipient: row.recipient,
      title: row.title,
      content: row.content,
      status: row.status,
      createdAt: row.created_at,
    }));

    const manual = db.prepare(`
      SELECT
        manual_message_dispatches.*,
        clients.name AS client_name,
        suppliers.name AS supplier_name,
        products.name AS product_name,
        products.brand AS product_brand
      FROM manual_message_dispatches
      LEFT JOIN clients ON clients.id = manual_message_dispatches.client_id
      LEFT JOIN suppliers ON suppliers.id = manual_message_dispatches.supplier_id
      LEFT JOIN products ON products.id = manual_message_dispatches.product_id
      ORDER BY manual_message_dispatches.created_at DESC
      LIMIT ?
    `).all(limit).map((row) => ({
      id: `manual-${row.id}`,
      source: "Manual",
      audience: row.audience_label,
      product: row.product_name ?? "",
      brand: row.brand ?? row.product_brand ?? "",
      client: row.client_name ?? row.supplier_name ?? row.recipient_name,
      contactName: row.recipient_name,
      channel: row.channel,
      recipient: row.recipient,
      title: row.title,
      content: row.content,
      status: row.status,
      createdAt: row.created_at,
    }));

    return [...automatic, ...manual]
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
      .slice(0, limit);
  }

  function recipientForChannel(channel, row) {
    return channel === "email" ? safeTrim(row.email) : safeTrim(row.phone);
  }

  function resolveCampaignRecipients(db, payload) {
    const audienceType = payload.audienceType;
    const product = payload.productId
      ? db.prepare("SELECT id, name, brand FROM products WHERE id = ?").get(payload.productId)
      : null;
    const brand = safeTrim(payload.brand) || product?.brand || "";
    const offerText = safeTrim(payload.offerText);

    if (audienceType === "client") {
      const client = db.prepare("SELECT * FROM clients WHERE id = ? AND active = 1").get(payload.clientId);
      if (!client) {
        throw new Error("Cliente nao encontrado para envio da mensagem.");
      }

      return [{
        audienceLabel: `Cliente: ${client.name}`,
        recipient: recipientForChannel(payload.channel, client),
        recipientName: client.name,
        clientId: client.id,
        supplierId: null,
        productId: product?.id ?? null,
        brand,
        variables: {
          cliente: client.name,
          fornecedor: "",
          produto: product?.name ?? "",
          marca: brand,
          oferta: offerText,
        },
      }];
    }

    if (audienceType === "supplier") {
      const supplier = db.prepare("SELECT * FROM suppliers WHERE id = ? AND active = 1").get(payload.supplierId);
      if (!supplier) {
        throw new Error("Fornecedor nao encontrado para envio da mensagem.");
      }

      return [{
        audienceLabel: `Fornecedor: ${supplier.name}`,
        recipient: recipientForChannel(payload.channel, supplier),
        recipientName: supplier.name,
        clientId: null,
        supplierId: supplier.id,
        productId: product?.id ?? null,
        brand: brand || safeTrim(supplier.supplied_brands),
        variables: {
          cliente: "",
          fornecedor: supplier.name,
          produto: product?.name ?? safeTrim(supplier.supplies),
          marca: brand || safeTrim(supplier.supplied_brands),
          oferta: offerText,
        },
      }];
    }

    if (audienceType === "brand-buyers") {
      if (!brand) {
        throw new Error("Selecione uma marca para disparar a mensagem.");
      }

      return db.prepare(`
        SELECT DISTINCT clients.*
        FROM clients
        INNER JOIN sales ON sales.client_id = clients.id
        INNER JOIN sale_items ON sale_items.sale_id = sales.id
        INNER JOIN products ON products.id = sale_items.product_id
        WHERE clients.active = 1 AND products.brand = ?
        ORDER BY clients.name
      `).all(brand).map((client) => ({
        audienceLabel: `Clientes que compraram a marca ${brand}`,
        recipient: recipientForChannel(payload.channel, client),
        recipientName: client.name,
        clientId: client.id,
        supplierId: null,
        productId: product?.id ?? null,
        brand,
        variables: {
          cliente: client.name,
          fornecedor: "",
          produto: product?.name ?? "",
          marca: brand,
          oferta: offerText,
        },
      }));
    }

    if (audienceType === "product-buyers") {
      if (!product) {
        throw new Error("Selecione um produto para disparar a mensagem.");
      }

      return db.prepare(`
        SELECT DISTINCT clients.*
        FROM clients
        INNER JOIN sales ON sales.client_id = clients.id
        INNER JOIN sale_items ON sale_items.sale_id = sales.id
        WHERE clients.active = 1 AND sale_items.product_id = ?
        ORDER BY clients.name
      `).all(product.id).map((client) => ({
        audienceLabel: `Clientes que compraram ${product.name}`,
        recipient: recipientForChannel(payload.channel, client),
        recipientName: client.name,
        clientId: client.id,
        supplierId: null,
        productId: product.id,
        brand: product.brand,
        variables: {
          cliente: client.name,
          fornecedor: "",
          produto: product.name,
          marca: product.brand,
          oferta: offerText,
        },
      }));
    }

    throw new Error("Tipo de publico alvo invalido para envio de mensagem.");
  }

  function sendDirectMessage(storeId, payload) {
    const { db } = getStoreContext(storeId);
    const title = safeTrim(payload.title);
    const content = safeTrim(payload.content);
    if (!title || !content) {
      throw new Error("Titulo e conteudo da mensagem sao obrigatorios.");
    }

    const recipients = resolveCampaignRecipients(db, payload);
    const createdAt = nowIso();
    const insertDispatch = db.prepare(`
      INSERT INTO manual_message_dispatches
        (audience_type, audience_label, channel, recipient, recipient_name, client_id, supplier_id, product_id, brand, title, content, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const created = [];
    let skippedCount = 0;
    for (const recipient of recipients) {
      if (!recipient.recipient) {
        skippedCount += 1;
        continue;
      }

      const finalTitle = interpolateTemplate(title, recipient.variables);
      const finalContent = interpolateTemplate(content, recipient.variables);
      insertDispatch.run(
        payload.audienceType,
        recipient.audienceLabel,
        payload.channel,
        recipient.recipient,
        recipient.recipientName,
        recipient.clientId,
        recipient.supplierId,
        recipient.productId,
        recipient.brand || null,
        finalTitle,
        finalContent,
        "gerada",
        createdAt,
      );

      created.push({
        audience: recipient.audienceLabel,
        recipient: recipient.recipient,
        recipientName: recipient.recipientName,
        channel: payload.channel,
      });
    }

    if (created.length === 0) {
      throw new Error("Nenhum destinatario com telefone ou e-mail disponivel para esse disparo.");
    }

    return {
      createdCount: created.length,
      skippedCount,
      dispatches: created,
      history: listDispatches(storeId),
    };
  }

  function createDispatchesForSale(db, { saleId, clientId, purchasedItems, createdAt }) {
    if (!clientId) {
      return [];
    }

    const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(clientId);
    if (!client) {
      return [];
    }

    const templates = db.prepare(`
      SELECT message_templates.*, products.name AS product_name, products.brand AS brand
      FROM message_templates
      INNER JOIN products ON products.id = message_templates.product_id
      WHERE message_templates.active = 1
    `).all();
    const templatesByProduct = new Map(templates.map((template) => [template.product_id, template]));
    const insertDispatch = db.prepare(`
      INSERT INTO message_dispatches
        (sale_id, client_id, product_id, channel, recipient, title, content, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const created = [];
    for (const item of purchasedItems) {
      const template = templatesByProduct.get(item.productId);
      if (!template) {
        continue;
      }

      const recipient = template.channel === "email" ? client.email : client.phone;
      if (!recipient) {
        continue;
      }

      const content = interpolateTemplate(template.content, {
        cliente: client.name,
        produto: item.productName,
        marca: item.brand,
        quantidade: String(item.quantity),
      });

      insertDispatch.run(
        saleId,
        clientId,
        item.productId,
        template.channel,
        recipient,
        template.title,
        content,
        "gerada",
        createdAt,
      );

      created.push({
        productId: item.productId,
        product: item.productName,
        channel: template.channel,
        recipient,
      });
    }

    return created;
  }

  function listProducts(storeId) {
    const { db } = getStoreContext(storeId);
    return db.prepare(`
      SELECT products.*, suppliers.name AS supplier_name
      FROM products
      LEFT JOIN suppliers ON suppliers.id = products.supplier_id
      WHERE products.active = 1
      ORDER BY products.name
    `).all().map(mapProduct);
  }

  function listAllBrands(storeId) {
    const { db } = getStoreContext(storeId);
    return unique(
      db.prepare("SELECT brand FROM products WHERE active = 1 ORDER BY brand").all().map((row) => row.brand),
    );
  }

  function saveProduct(storeId, id, payload) {
    const { db } = getStoreContext(storeId);
    const name = safeTrim(payload.name);
    const brand = safeTrim(payload.brand);
    if (!name || !brand) {
      throw new Error("Nome e marca do produto sao obrigatorios.");
    }

    const timestampValue = nowIso();
    const saleMode = payload.saleMode === "weight" ? "weight" : "unit";
    const weightUnit = saleMode === "weight" ? (safeTrim(payload.weightUnit) || safeTrim(payload.unit) || "kg") : null;
    const unit = saleMode === "weight" ? weightUnit : (safeTrim(payload.unit) || "unidade");
    const fields = [
      name,
      payload.cat,
      brand,
      toNumber(payload.price),
      toNumber(payload.cost),
      normalizeQuantity(payload.stock),
      unit,
      normalizeQuantity(payload.minStock),
      saleMode,
      weightUnit,
      payload.expiry || null,
      payload.supplierId || null,
      safeTrim(payload.barcode) || null,
      timestampValue,
    ];

    if (id) {
      db.prepare(`
        UPDATE products
        SET name = ?, category = ?, brand = ?, price = ?, cost = ?, stock = ?, unit = ?, min_stock = ?, sale_mode = ?, weight_unit = ?, expiry = ?, supplier_id = ?, barcode = ?, updated_at = ?
        WHERE id = ?
      `).run(...fields, id);
      return getProductById(storeId, id);
    }

    const result = db.prepare(`
      INSERT INTO products
        (name, category, brand, price, cost, stock, unit, min_stock, sale_mode, weight_unit, expiry, supplier_id, barcode, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(...fields, timestampValue);
    return getProductById(storeId, Number(result.lastInsertRowid));
  }

  function deactivateProduct(storeId, id) {
    const { db } = getStoreContext(storeId);
    db.prepare("UPDATE products SET active = 0, updated_at = ? WHERE id = ?").run(nowIso(), id);
  }

  function listClients(storeId) {
    const { db } = getStoreContext(storeId);
    return db.prepare("SELECT * FROM clients WHERE active = 1 ORDER BY name").all().map(mapClient);
  }

  function saveClient(storeId, id, payload) {
    const { db } = getStoreContext(storeId);
    const name = safeTrim(payload.name);
    if (!name) {
      throw new Error("Nome do cliente e obrigatorio.");
    }

    const timestampValue = nowIso();
    const fields = [
      name,
      safeTrim(payload.doc),
      safeTrim(payload.phone),
      safeTrim(payload.email),
      safeTrim(payload.city),
      toNumber(payload.limit, 500),
      payload.type || "pf",
      timestampValue,
    ];

    if (id) {
      db.prepare(`
        UPDATE clients
        SET name = ?, doc = ?, phone = ?, email = ?, city = ?, credit_limit = ?, client_type = ?, updated_at = ?
        WHERE id = ?
      `).run(...fields, id);
      return getClientById(storeId, id);
    }

    const result = db.prepare(`
      INSERT INTO clients
        (name, doc, phone, email, city, credit_limit, client_type, open_credit, last_purchase_at, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, 1, ?, ?)
    `).run(
      ...fields.slice(0, 7),
      timestampValue,
      timestampValue,
    );

    return getClientById(storeId, Number(result.lastInsertRowid));
  }

  function deactivateClient(storeId, id) {
    const { db } = getStoreContext(storeId);
    db.prepare("UPDATE clients SET active = 0, updated_at = ? WHERE id = ?").run(nowIso(), id);
  }

  function listSuppliers(storeId) {
    const { db } = getStoreContext(storeId);
    return db.prepare("SELECT * FROM suppliers WHERE active = 1 ORDER BY name").all().map(mapSupplier);
  }

  function saveSupplier(storeId, id, payload) {
    const { db } = getStoreContext(storeId);
    const name = safeTrim(payload.name);
    if (!name) {
      throw new Error("Nome do fornecedor e obrigatorio.");
    }

    const fields = [
      name,
      safeTrim(payload.cnpj),
      safeTrim(payload.contact),
      safeTrim(payload.phone),
      safeTrim(payload.email),
      safeTrim(payload.cat),
      safeTrim(payload.supplies),
      safeTrim(payload.suppliedBrands),
    ];

    if (id) {
      db.prepare(`
        UPDATE suppliers
        SET name = ?, cnpj = ?, contact = ?, phone = ?, email = ?, category = ?, supplies = ?, supplied_brands = ?
        WHERE id = ?
      `).run(...fields, id);
      return getSupplierById(storeId, id);
    }

    const result = db.prepare(`
      INSERT INTO suppliers (name, cnpj, contact, phone, email, category, supplies, supplied_brands, pending_amount, last_order_at, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, 1)
    `).run(
      ...fields,
    );

    return getSupplierById(storeId, Number(result.lastInsertRowid));
  }

  function deactivateSupplier(storeId, id) {
    const { db } = getStoreContext(storeId);
    db.prepare("UPDATE suppliers SET active = 0 WHERE id = ?").run(id);
  }

  function getDashboard(storeId) {
    const products = listProducts(storeId);
    const clients = listClients(storeId);
    const facts = getSalesFacts(storeId);
    const todayKey = dateOnly(new Date().toISOString());
    const salesToday = facts.filter((item) => dateOnly(item.createdAt) === todayKey);
    const openCreditClients = clients.filter((client) => client.fiado > 0);
    const lowStock = products.filter((product) => product.stock <= product.minStock);
    const expiring = products.filter((product) => product.expiry && daysUntil(product.expiry) <= 30);
    const totalOpenCredit = openCreditClients.reduce((sum, client) => sum + client.fiado, 0);
    const salesTodayTotal = salesToday.reduce((sum, item) => sum + item.lineTotal, 0);
    const salesCount = unique(salesToday.map((item) => item.saleId)).length;
    const averageTicket = salesCount > 0 ? salesTodayTotal / salesCount : 0;

    return {
      dateLabel: new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(new Date()),
      metrics: {
        salesToday: salesTodayTotal,
        openCreditClients: openCreditClients.length,
        totalOpenCredit,
        lowStockCount: lowStock.length,
        expiringCount: expiring.length,
        averageTicket,
      },
      alerts: {
        lowStock,
        expiring,
      },
      notifications: lowStock.length + expiring.length,
      recentSales: listRecentSales(storeId),
      salesWeek: buildChartSeries(filterFactsByPeriod(facts, "week"), "week"),
      categoryPie: buildCategoryShare(filterFactsByPeriod(facts, "month")),
    };
  }

  function getReports(storeId, period = "week", brand = "all") {
    const facts = filterFactsByPeriod(getSalesFacts(storeId), period).filter((item) => matchesBrand(item, brand));
    const saleIds = unique(facts.map((item) => item.saleId));
    const clientsServed = unique(facts.map((item) => item.clientId)).length;
    const total = facts.reduce((sum, item) => sum + item.lineTotal, 0);

    return {
      brands: listAllBrands(storeId),
      activeBrand: brand,
      period,
      summary: {
        totalSales: total,
        saleCount: saleIds.length,
        averageTicket: saleIds.length > 0 ? total / saleIds.length : 0,
        clientsServed,
      },
      trend: buildChartSeries(facts, period),
      categoryPie: buildCategoryShare(facts),
      brandSales: buildBrandSales(filterFactsByPeriod(getSalesFacts(storeId), period)),
      topProducts: buildTopProducts(facts),
    };
  }

  function getMessagesDashboard(storeId) {
    return {
      templates: listMessageTemplates(storeId),
      dispatches: listDispatches(storeId),
      brands: listAllBrands(storeId),
    };
  }

  function listFiscalDocuments(storeId, limit = 30) {
    const { db } = getStoreContext(storeId);
    return db.prepare(`
      SELECT
        fiscal_documents.*,
        sales.sale_number,
        sales.total,
        sales.payment_method,
        clients.name AS client_name,
        clients.doc AS client_doc
      FROM fiscal_documents
      INNER JOIN sales ON sales.id = fiscal_documents.sale_id
      LEFT JOIN clients ON clients.id = sales.client_id
      ORDER BY fiscal_documents.issued_at DESC
      LIMIT ?
    `).all(limit).map(mapFiscalSummary);
  }

  function getFiscalDocument(storeId, id) {
    const { db, store } = getStoreContext(storeId);
    const row = getFiscalDocumentRow(db, id);
    if (!row) {
      return null;
    }

    const items = db.prepare(`
      SELECT
        sale_items.quantity,
        sale_items.unit_price,
        sale_items.line_total,
        products.name AS product_name,
        products.brand AS brand,
        products.unit AS unit
      FROM sale_items
      INNER JOIN products ON products.id = sale_items.product_id
      WHERE sale_items.sale_id = ?
      ORDER BY sale_items.id
    `).all(row.sale_id).map((item) => ({
      product: item.product_name,
      brand: item.brand,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      lineTotal: Number(item.line_total),
      unit: item.unit,
    }));

    return {
      ...mapFiscalSummary(row),
      issuer: mapIssuer(store),
      recipient: {
        name: row.recipient_name ?? row.client_name ?? "Consumidor Final",
        doc: row.recipient_doc ?? row.client_doc ?? "",
        email: row.recipient_email ?? "",
        phone: row.recipient_phone ?? "",
      },
      financial: {
        subtotal: Number(row.subtotal),
        discountValue: Number(row.discount_value),
        total: Number(row.total),
        amountPaid: Number(row.amount_paid),
        changeDue: Number(row.change_due),
      },
      items,
      legalNotice: "Impressao automatica via navegador. Para NF-e/NFC-e fiscal valida juridicamente, integre certificado digital e SEFAZ.",
    };
  }

  async function getFiscalPrintSettings(storeId) {
    const { db } = getStoreContext(storeId);
    if (!SERVER_PRINT_ENABLED) {
      return {
        autoPrintEnabled: false,
        printerName: "",
        printers: [],
        suggestedPrinter: "",
        accessError: "Impressao direta do servidor desativada neste ambiente hospedado.",
      };
    }

    let printers = [];
    let accessError = "";
    try {
      printers = await listPrinters();
    } catch (error) {
      accessError = error instanceof Error ? error.message : "Nao foi possivel consultar as impressoras locais.";
    }

    return {
      autoPrintEnabled: getSetting(db, "fiscal_auto_print_enabled", "false") === "true",
      printerName: getSetting(db, "fiscal_printer_name", "") || "",
      printers,
      suggestedPrinter: chooseDirectPrinter(printers, getSetting(db, "fiscal_printer_name", ""))?.name ?? "",
      accessError,
    };
  }

  async function saveFiscalPrintSettings(storeId, payload) {
    const { db } = getStoreContext(storeId);
    if (!SERVER_PRINT_ENABLED) {
      setSetting(db, "fiscal_auto_print_enabled", "false");
      setSetting(db, "fiscal_printer_name", "");
      return getFiscalPrintSettings(storeId);
    }

    if (payload.autoPrintEnabled) {
      const available = await getFiscalPrintSettings(storeId);
      const printer = chooseDirectPrinter(available.printers, payload.printerName);
      if (!printer) {
        throw new Error("Nao foi encontrada uma impressora fisica disponivel para ativar a impressao direta.");
      }
    }

    setSetting(db, "fiscal_auto_print_enabled", payload.autoPrintEnabled ? "true" : "false");
    setSetting(db, "fiscal_printer_name", safeTrim(payload.printerName));
    return getFiscalPrintSettings(storeId);
  }

  async function printFiscalDocumentDirect(storeId, id) {
    if (!SERVER_PRINT_ENABLED) {
      throw new Error("Impressao direta do servidor desativada neste ambiente hospedado.");
    }

    const { db } = getStoreContext(storeId);
    const document = getFiscalDocument(storeId, id);
    if (!document) {
      throw new Error("Documento fiscal nao encontrado.");
    }

    const settings = await getFiscalPrintSettings(storeId);
    const printer = chooseDirectPrinter(settings.printers, settings.printerName);
    if (!printer) {
      throw new Error("Nenhuma impressora fisica configurada para impressao direta.");
    }

    const printResult = await printFiscalDocument(document, printer.name);
    const printedAt = nowIso();
    db.prepare(`
      UPDATE fiscal_documents
      SET printer_name = ?, last_printed_at = ?, print_error = NULL
      WHERE id = ?
    `).run(printResult.printerName, printedAt, id);

    return {
      success: true,
      printerName: printResult.printerName,
      printedAt,
      document: getFiscalDocument(storeId, id),
    };
  }

  function saveMessageTemplate(storeId, id, payload) {
    const { db } = getStoreContext(storeId);
    const timestampValue = nowIso();
    const active = payload.active ? 1 : 0;

    if (id) {
      db.prepare(`
        UPDATE message_templates
        SET product_id = ?, channel = ?, title = ?, content = ?, active = ?, updated_at = ?
        WHERE id = ?
      `).run(
        payload.productId,
        payload.channel,
        safeTrim(payload.title),
        safeTrim(payload.content),
        active,
        timestampValue,
        id,
      );
    } else {
      db.prepare(`
        INSERT INTO message_templates (product_id, channel, title, content, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        payload.productId,
        payload.channel,
        safeTrim(payload.title),
        safeTrim(payload.content),
        active,
        timestampValue,
        timestampValue,
      );
    }

    return listMessageTemplates(storeId);
  }

  async function createSale(storeId, payload) {
    const { db } = getStoreContext(storeId);
    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      throw new Error("A venda precisa ter ao menos um item.");
    }

    const shouldPrintVia = payload.printVia !== false;
    const rawProducts = payload.items.map((item) => {
      const product = getProductById(storeId, item.id);
      if (!product) {
        throw new Error("Produto invalido na venda.");
      }

      const quantity = product.saleMode === "weight"
        ? Math.max(0.001, normalizeQuantity(item.qty, 0))
        : Math.max(1, Math.round(toNumber(item.qty, 1)));
      if (quantity <= 0) {
        throw new Error(`Quantidade invalida para ${product.name}.`);
      }
      if (product.stock + 0.0001 < quantity) {
        throw new Error(`Estoque insuficiente para ${product.name}.`);
      }

      return {
        productId: product.id,
        productName: product.name,
        brand: product.brand,
        quantity,
        unitPrice: product.price,
        lineTotal: product.price * quantity,
      };
    });

    const discountPercent = clampNumber(payload.discountPercent ?? 0, 0, 100);
    const subtotal = rawProducts.reduce((sum, item) => sum + item.lineTotal, 0);
    const discountValue = subtotal * (discountPercent / 100);
    const total = subtotal - discountValue;
    const amountPaid = payload.paymentMethod === "fiado" ? 0 : Math.max(toNumber(payload.amountPaid, total), total);
    const changeDue = payload.paymentMethod === "dinheiro" ? Math.max(0, amountPaid - total) : 0;
    const createdAt = nowIso();

    let fiscalDocumentId = null;
    db.exec("BEGIN");
    try {
      const saleInsert = db.prepare(`
        INSERT INTO sales
          (sale_number, client_id, payment_method, discount_percent, discount_value, subtotal, total, amount_paid, change_due, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        "TEMP",
        payload.clientId || null,
        payload.paymentMethod,
        discountPercent,
        discountValue,
        subtotal,
        total,
        amountPaid,
        changeDue,
        safeTrim(payload.note),
        createdAt,
      );

      const saleId = Number(saleInsert.lastInsertRowid);
      const saleNumber = saleNumberFromId(saleId);
      db.prepare("UPDATE sales SET sale_number = ? WHERE id = ?").run(saleNumber, saleId);

      const insertItem = db.prepare(`
        INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, line_total)
        VALUES (?, ?, ?, ?, ?)
      `);
      const updateStock = db.prepare("UPDATE products SET stock = stock - ?, updated_at = ? WHERE id = ?");

      for (const item of rawProducts) {
        insertItem.run(saleId, item.productId, item.quantity, item.unitPrice, item.lineTotal);
        updateStock.run(item.quantity, createdAt, item.productId);
      }

      if (payload.clientId) {
        db.prepare(`
          UPDATE clients
          SET open_credit = open_credit + ?, last_purchase_at = ?, updated_at = ?
          WHERE id = ?
        `).run(payload.paymentMethod === "fiado" ? total : 0, createdAt, createdAt, payload.clientId);
      }

      const generatedMessages = createDispatchesForSale(db, {
        saleId,
        clientId: payload.clientId || null,
        purchasedItems: rawProducts,
        createdAt,
      });

      fiscalDocumentId = createFiscalDocumentForSale(db, saleId, createdAt);
      db.exec("COMMIT");

      let directPrint = {
        attempted: false,
        success: false,
        printerName: "",
        error: "",
      };

      try {
        const settings = await getFiscalPrintSettings(storeId);
        if (settings.autoPrintEnabled && shouldPrintVia) {
          directPrint.attempted = true;
          const directResult = await printFiscalDocumentDirect(storeId, fiscalDocumentId);
          directPrint = {
            attempted: true,
            success: true,
            printerName: directResult.printerName,
            printedAt: directResult.printedAt,
            error: "",
          };
        }
      } catch (printError) {
        db.prepare("UPDATE fiscal_documents SET print_error = ? WHERE id = ?").run(
          printError instanceof Error ? printError.message : "Falha ao enviar a nota para a impressora.",
          fiscalDocumentId,
        );
        directPrint = {
          attempted: true,
          success: false,
          printerName: "",
          error: printError instanceof Error ? printError.message : "Falha ao imprimir.",
        };
      }

      return {
        saleId,
        saleNumber,
        total,
        printVia: shouldPrintVia,
        generatedMessages,
        fiscalDocument: getFiscalDocument(storeId, fiscalDocumentId),
        directPrint,
      };
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  function login(username, password) {
    const row = authDb.prepare(`
      SELECT
        users.*,
        stores.name AS store_name,
        stores.slug AS store_slug,
        stores.city AS store_city
      FROM users
      LEFT JOIN stores ON stores.id = users.store_id
      WHERE users.username = ?
    `).get(username);

    if (!row || !verifyPassword(password, row.salt, row.password_hash)) {
      return null;
    }

    const token = createSessionToken();
    const createdAt = nowIso();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

    authDb.prepare("INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)").run(
      token,
      row.id,
      createdAt,
      expiresAt,
    );

    return {
      token,
      user: buildUserPayload(row),
    };
  }

  function getUserFromToken(token) {
    if (!token) {
      return null;
    }

    const row = authDb.prepare(`
      SELECT
        users.id,
        users.name,
        users.username,
        users.role,
        users.store_id,
        stores.name AS store_name,
        stores.slug AS store_slug,
        stores.city AS store_city,
        sessions.expires_at
      FROM sessions
      INNER JOIN users ON users.id = sessions.user_id
      LEFT JOIN stores ON stores.id = users.store_id
      WHERE sessions.token = ?
    `).get(token);

    if (!row) {
      return null;
    }

    if (new Date(row.expires_at) < new Date()) {
      authDb.prepare("DELETE FROM sessions WHERE token = ?").run(token);
      return null;
    }

    return buildUserPayload(row);
  }

  function logout(token) {
    if (token) {
      authDb.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    }
  }

  return {
    listProducts,
    listAllBrands,
    saveProduct,
    deactivateProduct,
    listClients,
    getClientById,
    saveClient,
    deactivateClient,
    getClientPurchases,
    listSuppliers,
    saveSupplier,
    deactivateSupplier,
    getDashboard,
    getReports,
    getMessagesDashboard,
    listFiscalDocuments,
    getFiscalDocument,
    getFiscalPrintSettings,
    saveFiscalPrintSettings,
    printFiscalDocumentDirect,
    saveMessageTemplate,
    sendDirectMessage,
    createSale,
    login,
    logout,
    getUserFromToken,
  };
}

export const store = createStore();
