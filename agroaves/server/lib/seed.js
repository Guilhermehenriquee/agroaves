import { createSalt, hashPassword } from "./security.js";

function createTimestamp(daysAgo, hour, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

export const supplierSeed = [
  {
    name: "FrigoAvicola",
    cnpj: "11.222.333/0001-44",
    contact: "Roberto Mendes",
    phone: "(47) 3111-2233",
    email: "comercial@frigoavicola.com.br",
    category: "Racoes",
    supplies: "Racoes ensacadas e racao a granel",
    suppliedBrands: "NutriAves, AgroMix",
    pendingAmount: 0,
    lastOrderAt: createTimestamp(15, 10, 15),
  },
  {
    name: "AgroPrime",
    cnpj: "22.333.444/0001-55",
    contact: "Sandra Lima",
    phone: "(47) 3222-3344",
    email: "vendas@agroprime.com.br",
    category: "Graos",
    supplies: "Milho, soja, concentrados e racoes a granel",
    suppliedBrands: "Campo Forte, AgroPrime",
    pendingAmount: 1850,
    lastOrderAt: createTimestamp(10, 9, 30),
  },
  {
    name: "VetFarma",
    cnpj: "33.444.555/0001-66",
    contact: "Dr. Paulo Gomes",
    phone: "(47) 3333-4455",
    email: "pedidos@vetfarma.com.br",
    category: "Medicamentos",
    supplies: "Vacinas, vitaminas e medicamentos veterinarios",
    suppliedBrands: "BioVet",
    pendingAmount: 0,
    lastOrderAt: createTimestamp(4, 14, 5),
  },
  {
    name: "Aviario Sao Joao",
    cnpj: "44.555.666/0001-77",
    contact: "Jose Augusto",
    phone: "(47) 3444-5566",
    email: "jose@aviariosaojoao.com.br",
    category: "Aves",
    supplies: "Pintinhos, frangos e patos",
    suppliedBrands: "Sao Joao Premium",
    pendingAmount: 640,
    lastOrderAt: createTimestamp(2, 11, 40),
  },
  {
    name: "AgroEquip",
    cnpj: "55.666.777/0001-88",
    contact: "Fernanda Torres",
    phone: "(47) 3555-6677",
    email: "comercial@agroequip.com.br",
    category: "Utensilios",
    supplies: "Bebedouros, comedouros e equipamentos",
    suppliedBrands: "AgroMax",
    pendingAmount: 0,
    lastOrderAt: createTimestamp(18, 16, 10),
  },
];

export const productSeed = [
  { name: "Racao Frango Postura 20kg", category: "racoes", brand: "NutriAves", price: 89.9, cost: 65, stock: 45, unit: "saco", minStock: 10, expiry: "2026-08-15", supplierIndex: 0, barcode: "7890001001" },
  { name: "Racao Frango Corte 25kg", category: "racoes", brand: "NutriAves", price: 105, cost: 78, stock: 32, unit: "saco", minStock: 8, expiry: "2026-09-01", supplierIndex: 0, barcode: "7890001002" },
  { name: "Racao Crescimento a Granel", category: "racoes", brand: "NutriAves", price: 6.9, cost: 4.8, stock: 320.5, unit: "kg", minStock: 60, saleMode: "weight", weightUnit: "kg", expiry: "2026-10-20", supplierIndex: 0, barcode: "7890001005" },
  { name: "Milho Grao 60kg", category: "racoes", brand: "Campo Forte", price: 185, cost: 140, stock: 6, unit: "saco", minStock: 15, expiry: "2026-12-31", supplierIndex: 1, barcode: "7890001003" },
  { name: "Farelo de Soja 30kg", category: "racoes", brand: "Campo Forte", price: 95, cost: 72, stock: 8, unit: "saco", minStock: 10, expiry: "2026-10-15", supplierIndex: 1, barcode: "7890001004" },
  { name: "Vacina Newcastle", category: "medicamentos", brand: "BioVet", price: 45, cost: 28, stock: 24, unit: "unidade", minStock: 5, expiry: "2026-05-20", supplierIndex: 2, barcode: "7890002001" },
  { name: "Vermifugo Aves 500ml", category: "medicamentos", brand: "BioVet", price: 32.5, cost: 18, stock: 15, unit: "unidade", minStock: 5, expiry: "2026-07-20", supplierIndex: 2, barcode: "7890002002" },
  { name: "Antibiotico Po 100g", category: "medicamentos", brand: "BioVet", price: 58, cost: 35, stock: 3, unit: "unidade", minStock: 5, expiry: "2026-05-01", supplierIndex: 2, barcode: "7890002003" },
  { name: "Vitamina AD3E 1L", category: "medicamentos", brand: "BioVet", price: 42, cost: 25, stock: 18, unit: "unidade", minStock: 4, expiry: "2026-11-30", supplierIndex: 2, barcode: "7890002004" },
  { name: "Frango Caipira Femea 30d", category: "aves", brand: "Sao Joao Premium", price: 12, cost: 7.5, stock: 150, unit: "unidade", minStock: 20, expiry: null, supplierIndex: 3, barcode: "7890003001" },
  { name: "Pintinho de Corte 1 dia", category: "aves", brand: "Sao Joao Premium", price: 4.5, cost: 2.8, stock: 500, unit: "unidade", minStock: 50, expiry: null, supplierIndex: 3, barcode: "7890003002" },
  { name: "Pato Pekin 60 dias", category: "aves", brand: "Sao Joao Premium", price: 35, cost: 22, stock: 25, unit: "unidade", minStock: 5, expiry: null, supplierIndex: 3, barcode: "7890003003" },
  { name: "Bebedouro Nipple 2L", category: "utensilios", brand: "AgroMax", price: 28, cost: 15, stock: 40, unit: "unidade", minStock: 10, expiry: null, supplierIndex: 4, barcode: "7890004001" },
  { name: "Comedouro Tubular 5kg", category: "utensilios", brand: "AgroMax", price: 55, cost: 32, stock: 22, unit: "unidade", minStock: 8, expiry: null, supplierIndex: 4, barcode: "7890004002" },
  { name: "Termometro Digital", category: "utensilios", brand: "AgroMax", price: 35, cost: 18, stock: 4, unit: "unidade", minStock: 5, expiry: null, supplierIndex: 4, barcode: "7890004003" },
  { name: "Luva Descartavel cx/100", category: "utensilios", brand: "AgroMax", price: 22, cost: 12, stock: 30, unit: "caixa", minStock: 10, expiry: null, supplierIndex: 4, barcode: "7890004004" },
];

export const clientSeed = [
  { name: "Joao Pedro Silva", doc: "123.456.789-00", phone: "(47) 99123-4567", email: "joao@cliente.com", city: "Blumenau", creditLimit: 1000, clientType: "pf" },
  { name: "Maria Oliveira", doc: "234.567.890-11", phone: "(47) 98234-5678", email: "maria@cliente.com", city: "Gaspar", creditLimit: 500, clientType: "pf" },
  { name: "Carlos Producoes LTDA", doc: "45.678.901/0001-23", phone: "(47) 3412-5678", email: "compras@carlosproducoes.com", city: "Indaial", creditLimit: 3000, clientType: "pj" },
  { name: "Ana Luiza Ferreira", doc: "345.678.901-22", phone: "(47) 97345-6789", email: "ana@cliente.com", city: "Blumenau", creditLimit: 800, clientType: "pf" },
  { name: "Aviario Familia Ramos", doc: "56.789.012/0001-34", phone: "(47) 3567-8901", email: "ramos@aviario.com", city: "Timbo", creditLimit: 5000, clientType: "pj" },
  { name: "Pedro Henrique Costa", doc: "456.789.012-33", phone: "(47) 96456-7890", email: "pedro@cliente.com", city: "Pomerode", creditLimit: 500, clientType: "pf" },
  { name: "Granja Santa Clara", doc: "67.890.123/0001-45", phone: "(47) 3678-9012", email: "financeiro@granjasantaclara.com", city: "Benedito Novo", creditLimit: 8000, clientType: "pj" },
];

export const saleSeed = [
  { createdAt: createTimestamp(0, 14, 32), clientDoc: "123.456.789-00", paymentMethod: "pix", discountPercent: 0, amountPaid: 289.7, items: [{ barcode: "7890001001", quantity: 2 }, { barcode: "7890004001", quantity: 1 }] },
  { createdAt: createTimestamp(0, 13, 15), clientDoc: "234.567.890-11", paymentMethod: "dinheiro", discountPercent: 0, amountPaid: 89.9, items: [{ barcode: "7890001001", quantity: 1 }] },
  { createdAt: createTimestamp(0, 11, 42), clientDoc: null, paymentMethod: "cartao", discountPercent: 4, amountPaid: 499.2, items: [{ barcode: "7890002001", quantity: 4 }, { barcode: "7890002002", quantity: 2 }, { barcode: "7890004004", quantity: 5 }] },
  { createdAt: createTimestamp(0, 9, 20), clientDoc: "56.789.012/0001-34", paymentMethod: "fiado", discountPercent: 0, amountPaid: 0, items: [{ barcode: "7890001002", quantity: 8 }, { barcode: "7890003001", quantity: 20 }] },
  { createdAt: createTimestamp(0, 8, 45), clientDoc: "456.789.012-33", paymentMethod: "dinheiro", discountPercent: 0, amountPaid: 95, items: [{ barcode: "7890001004", quantity: 1 }] },
  { createdAt: createTimestamp(1, 16, 10), clientDoc: "345.678.901-22", paymentMethod: "pix", discountPercent: 0, amountPaid: 126, items: [{ barcode: "7890003001", quantity: 3 }, { barcode: "7890002004", quantity: 2 }] },
  { createdAt: createTimestamp(2, 10, 5), clientDoc: "67.890.123/0001-45", paymentMethod: "fiado", discountPercent: 3, amountPaid: 0, items: [{ barcode: "7890001003", quantity: 5 }, { barcode: "7890001004", quantity: 3 }] },
  { createdAt: createTimestamp(3, 15, 25), clientDoc: "45.678.901/0001-23", paymentMethod: "cartao", discountPercent: 5, amountPaid: 1168.5, items: [{ barcode: "7890001002", quantity: 6 }, { barcode: "7890002001", quantity: 4 }, { barcode: "7890004002", quantity: 3 }] },
  { createdAt: createTimestamp(6, 11, 50), clientDoc: "123.456.789-00", paymentMethod: "pix", discountPercent: 0, amountPaid: 177, items: [{ barcode: "7890003001", quantity: 6 }, { barcode: "7890004003", quantity: 3 }] },
  { createdAt: createTimestamp(9, 9, 10), clientDoc: "56.789.012/0001-34", paymentMethod: "fiado", discountPercent: 2, amountPaid: 0, items: [{ barcode: "7890003002", quantity: 120 }, { barcode: "7890004001", quantity: 8 }] },
  { createdAt: createTimestamp(15, 13, 40), clientDoc: "67.890.123/0001-45", paymentMethod: "cartao", discountPercent: 0, amountPaid: 875, items: [{ barcode: "7890001003", quantity: 3 }, { barcode: "7890002002", quantity: 10 }] },
  { createdAt: createTimestamp(21, 10, 0), clientDoc: "234.567.890-11", paymentMethod: "dinheiro", discountPercent: 0, amountPaid: 170, items: [{ barcode: "7890002004", quantity: 2 }, { barcode: "7890004002", quantity: 1 }, { barcode: "7890004004", quantity: 1 }] },
  { createdAt: createTimestamp(32, 17, 15), clientDoc: "45.678.901/0001-23", paymentMethod: "pix", discountPercent: 0, amountPaid: 1240, items: [{ barcode: "7890001002", quantity: 10 }, { barcode: "7890002001", quantity: 4 }] },
  { createdAt: createTimestamp(46, 14, 20), clientDoc: "345.678.901-22", paymentMethod: "dinheiro", discountPercent: 0, amountPaid: 118, items: [{ barcode: "7890002003", quantity: 1 }, { barcode: "7890002004", quantity: 1 }, { barcode: "7890004004", quantity: 1 }] },
  { createdAt: createTimestamp(63, 8, 50), clientDoc: "123.456.789-00", paymentMethod: "cartao", discountPercent: 0, amountPaid: 615, items: [{ barcode: "7890001001", quantity: 5 }, { barcode: "7890004002", quantity: 1 }, { barcode: "7890004001", quantity: 2 }] },
];

export const messageTemplateSeed = [
  {
    productBarcode: "7890001001",
    channel: "whatsapp",
    title: "Pos-venda Racao Postura",
    content: "Ola {{cliente}}, obrigado pela compra de {{produto}} da marca {{marca}}. Se precisar de reposicao ou manejo, fale com a AgroAves.",
  },
  {
    productBarcode: "7890002001",
    channel: "whatsapp",
    title: "Lembrete Vacina",
    content: "Ola {{cliente}}, sua compra de {{produto}} foi registrada. Se precisar de reforco do calendario vacinal, conte com a nossa equipe.",
  },
  {
    productBarcode: "7890003001",
    channel: "email",
    title: "Orientacoes de manejo",
    content: "Ola {{cliente}}, agradecemos a compra de {{produto}}. Se quiser orientacoes de manejo e alimentacao, responda esta mensagem.",
  },
];

export const storeSeed = [
  {
    name: "AgroAves Matriz",
    slug: "agroaves-matriz",
    cnpj: "12.345.678/0001-90",
    ie: "123456789",
    address: "Rodovia AgroAves, 1000 - Centro",
    city: "Blumenau - SC",
    user: {
      name: "Administrador",
      username: "admin",
      role: "Gerente",
      password: "agroaves123",
    },
  },
  {
    name: "AgroAves Filial Sul",
    slug: "agroaves-filial-sul",
    cnpj: "98.765.432/0001-10",
    ie: "987654321",
    address: "Avenida das Granjas, 500 - Centro",
    city: "Indaial - SC",
    user: {
      name: "Operador Filial",
      username: "filial",
      role: "Gerente",
      password: "agroaves123",
    },
  },
];

export function seedStoresAndUsers(db, timestamp) {
  const insertStore = db.prepare(`
    INSERT INTO stores (name, slug, cnpj, ie, address, city, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertUser = db.prepare(`
    INSERT INTO users (store_id, name, username, role, password_hash, salt, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const updateUserStore = db.prepare("UPDATE users SET store_id = ? WHERE id = ?");

  for (const storeDefinition of storeSeed) {
    let store = db.prepare("SELECT id FROM stores WHERE slug = ?").get(storeDefinition.slug);
    if (!store) {
      const result = insertStore.run(
        storeDefinition.name,
        storeDefinition.slug,
        storeDefinition.cnpj,
        storeDefinition.ie,
        storeDefinition.address,
        storeDefinition.city,
        timestamp,
      );
      store = { id: Number(result.lastInsertRowid) };
    }

    const existingUser = db.prepare("SELECT id, store_id FROM users WHERE username = ?").get(storeDefinition.user.username);
    if (!existingUser) {
      const salt = createSalt();
      const passwordHash = hashPassword(storeDefinition.user.password, salt);
      insertUser.run(
        store.id,
        storeDefinition.user.name,
        storeDefinition.user.username,
        storeDefinition.user.role,
        passwordHash,
        salt,
        timestamp,
      );
      continue;
    }

    if (!existingUser.store_id) {
      updateUserStore.run(store.id, existingUser.id);
    }
  }
}
