const API_BASE = (import.meta.env.VITE_API_BASE ?? "/api").replace(/\/$/, "");

let tokenGetter = () => null;

export function registerTokenGetter(getter) {
  tokenGetter = getter;
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers ?? {});
  headers.set("Content-Type", "application/json");

  const token = options.token ?? tokenGetter();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error ?? "Erro ao comunicar com a API.");
    error.status = response.status;
    throw error;
  }

  return payload;
}

export const api = {
  login(username, password) {
    return request("/auth/login", {
      method: "POST",
      body: { username, password },
      token: null,
    });
  },
  me(token) {
    return request("/auth/me", { token });
  },
  logout() {
    return request("/auth/logout", { method: "POST" });
  },
  getDashboard() {
    return request("/dashboard");
  },
  getProducts() {
    return request("/products");
  },
  saveProduct(product) {
    if (product.id) {
      return request(`/products/${product.id}`, { method: "POST", body: product });
    }

    return request("/products", { method: "POST", body: product });
  },
  deleteProduct(id) {
    return request(`/products/${id}/delete`, { method: "POST" });
  },
  getClients() {
    return request("/clients");
  },
  saveClient(client) {
    if (client.id) {
      return request(`/clients/${client.id}`, { method: "POST", body: client });
    }

    return request("/clients", { method: "POST", body: client });
  },
  deleteClient(id) {
    return request(`/clients/${id}/delete`, { method: "POST" });
  },
  getClientPurchases(id) {
    return request(`/clients/${id}/purchases`);
  },
  getSuppliers() {
    return request("/suppliers");
  },
  saveSupplier(supplier) {
    if (supplier.id) {
      return request(`/suppliers/${supplier.id}`, { method: "POST", body: supplier });
    }

    return request("/suppliers", { method: "POST", body: supplier });
  },
  deleteSupplier(id) {
    return request(`/suppliers/${id}/delete`, { method: "POST" });
  },
  getReports(period, brand) {
    return request(`/reports?period=${period}&brand=${encodeURIComponent(brand)}`);
  },
  getMessages() {
    return request("/messages");
  },
  getFiscalDocuments() {
    return request("/fiscal");
  },
  getFiscalDocument(id) {
    return request(`/fiscal/${id}`);
  },
  getFiscalPrintSettings() {
    return request("/fiscal/settings");
  },
  saveFiscalPrintSettings(payload) {
    return request("/fiscal/settings/save", { method: "POST", body: payload });
  },
  printFiscalDocumentDirect(id) {
    return request(`/fiscal/${id}/print`, { method: "POST" });
  },
  saveMessageTemplate(template) {
    if (template.id) {
      return request(`/messages/templates/${template.id}`, { method: "POST", body: template });
    }

    return request("/messages/templates", { method: "POST", body: template });
  },
  sendMessage(payload) {
    return request("/messages/send", { method: "POST", body: payload });
  },
  createSale(payload) {
    return request("/sales", { method: "POST", body: payload });
  },
};
