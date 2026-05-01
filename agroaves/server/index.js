import { createReadStream, existsSync, statSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { URL } from "node:url";
import { store } from "./lib/store.js";

const PORT = Number(process.env.PORT ?? 4000);
const DIST_DIR = path.join(process.cwd(), "dist");
const INDEX_HTML = path.join(DIST_DIR, "index.html");
const API_CORS_ORIGIN = process.env.AGROAVES_CORS_ORIGIN ?? "*";

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": API_CORS_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
  });
  response.end(message);
}

function sendFile(response, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  response.writeHead(200, {
    "Content-Type": CONTENT_TYPES[extension] ?? "application/octet-stream",
  });
  createReadStream(filePath).pipe(response);
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf-8"));
}

function getToken(request) {
  const authHeader = request.headers.authorization ?? "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

function requireAuth(request, response) {
  const user = store.getUserFromToken(getToken(request));
  if (!user) {
    sendJson(response, 401, { error: "Sessao expirada ou invalida." });
    return null;
  }

  return user;
}

function routeMatch(pathname, pattern) {
  const pathParts = pathname.split("/").filter(Boolean);
  const patternParts = pattern.split("/").filter(Boolean);

  if (pathParts.length !== patternParts.length) {
    return null;
  }

  const params = {};
  for (let index = 0; index < patternParts.length; index += 1) {
    const currentPattern = patternParts[index];
    const currentPath = pathParts[index];

    if (currentPattern.startsWith(":")) {
      params[currentPattern.slice(1)] = currentPath;
      continue;
    }

    if (currentPattern !== currentPath) {
      return null;
    }
  }

  return params;
}

function tryServeStatic(request, response, pathname) {
  if (!["GET", "HEAD"].includes(request.method ?? "GET")) {
    return false;
  }

  if (pathname.startsWith("/api") || pathname === "/healthz") {
    return false;
  }

  if (!existsSync(INDEX_HTML)) {
    return false;
  }

  const cleanPath = pathname === "/" ? "/index.html" : pathname;
  const requestedPath = path.normalize(path.join(DIST_DIR, cleanPath));
  const safePath = requestedPath.startsWith(DIST_DIR) ? requestedPath : INDEX_HTML;

  if (existsSync(safePath) && statSync(safePath).isFile()) {
    sendFile(response, safePath);
    return true;
  }

  if (!path.extname(cleanPath)) {
    sendFile(response, INDEX_HTML);
    return true;
  }

  return false;
}

const server = http.createServer(async (request, response) => {
  if (!request.url) {
    sendJson(response, 404, { error: "Rota nao encontrada." });
    return;
  }

  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);
  const { pathname } = url;

  if (pathname === "/healthz") {
    sendJson(response, 200, { ok: true, service: "agroaves" });
    return;
  }

  try {
    if (pathname === "/api/auth/login" && request.method === "POST") {
      const body = await readJsonBody(request);
      const session = store.login(body.username, body.password);
      if (!session) {
        sendJson(response, 401, { error: "Usuario ou senha invalidos." });
        return;
      }

      sendJson(response, 200, session);
      return;
    }

    if (pathname === "/api/auth/me" && request.method === "GET") {
      const user = requireAuth(request, response);
      if (!user) {
        return;
      }
      sendJson(response, 200, { user });
      return;
    }

    if (pathname === "/api/auth/logout" && request.method === "POST") {
      store.logout(getToken(request));
      sendJson(response, 200, { success: true });
      return;
    }

    if (pathname.startsWith("/api")) {
      const user = requireAuth(request, response);
      if (!user) {
        return;
      }

      if (pathname === "/api/dashboard" && request.method === "GET") {
        sendJson(response, 200, store.getDashboard(user.storeId));
        return;
      }

      if (pathname === "/api/products" && request.method === "GET") {
        sendJson(response, 200, {
          products: store.listProducts(user.storeId),
          brands: store.listAllBrands(user.storeId),
        });
        return;
      }

      if (pathname === "/api/products" && request.method === "POST") {
        const body = await readJsonBody(request);
        sendJson(response, 201, { product: store.saveProduct(user.storeId, null, body) });
        return;
      }

      const productParams = routeMatch(pathname, "/api/products/:id");
      if (productParams && ["PUT", "POST"].includes(request.method ?? "GET")) {
        const body = await readJsonBody(request);
        sendJson(response, 200, { product: store.saveProduct(user.storeId, Number(productParams.id), body) });
        return;
      }

      if (productParams && request.method === "DELETE") {
        store.deactivateProduct(user.storeId, Number(productParams.id));
        sendJson(response, 200, { success: true });
        return;
      }

      const productDeleteParams = routeMatch(pathname, "/api/products/:id/delete");
      if (productDeleteParams && request.method === "POST") {
        store.deactivateProduct(user.storeId, Number(productDeleteParams.id));
        sendJson(response, 200, { success: true });
        return;
      }

      if (pathname === "/api/clients" && request.method === "GET") {
        sendJson(response, 200, { clients: store.listClients(user.storeId) });
        return;
      }

      if (pathname === "/api/clients" && request.method === "POST") {
        const body = await readJsonBody(request);
        sendJson(response, 201, { client: store.saveClient(user.storeId, null, body) });
        return;
      }

      const clientParams = pathname.match(/^\/api\/clients\/(\d+)\/?$/);
      if (clientParams && ["PUT", "POST"].includes(request.method ?? "GET")) {
        const body = await readJsonBody(request);
        sendJson(response, 200, { client: store.saveClient(user.storeId, Number(clientParams[1]), body) });
        return;
      }

      if (clientParams && request.method === "DELETE") {
        store.deactivateClient(user.storeId, Number(clientParams[1]));
        sendJson(response, 200, { success: true });
        return;
      }

      const clientDeleteParams = pathname.match(/^\/api\/clients\/(\d+)\/delete\/?$/);
      if (clientDeleteParams && request.method === "POST") {
        store.deactivateClient(user.storeId, Number(clientDeleteParams[1]));
        sendJson(response, 200, { success: true });
        return;
      }

      const clientPurchasesParams = routeMatch(pathname, "/api/clients/:id/purchases");
      if (clientPurchasesParams && request.method === "GET") {
        sendJson(response, 200, store.getClientPurchases(user.storeId, Number(clientPurchasesParams.id)));
        return;
      }

      if (pathname === "/api/suppliers" && request.method === "GET") {
        sendJson(response, 200, { suppliers: store.listSuppliers(user.storeId) });
        return;
      }

      if (pathname === "/api/suppliers" && request.method === "POST") {
        const body = await readJsonBody(request);
        sendJson(response, 201, { supplier: store.saveSupplier(user.storeId, null, body) });
        return;
      }

      const supplierParams = pathname.match(/^\/api\/suppliers\/(\d+)\/?$/);
      if (supplierParams && ["PUT", "POST"].includes(request.method ?? "GET")) {
        const body = await readJsonBody(request);
        sendJson(response, 200, { supplier: store.saveSupplier(user.storeId, Number(supplierParams[1]), body) });
        return;
      }

      if (supplierParams && request.method === "DELETE") {
        store.deactivateSupplier(user.storeId, Number(supplierParams[1]));
        sendJson(response, 200, { success: true });
        return;
      }

      const supplierDeleteParams = pathname.match(/^\/api\/suppliers\/(\d+)\/delete\/?$/);
      if (supplierDeleteParams && request.method === "POST") {
        store.deactivateSupplier(user.storeId, Number(supplierDeleteParams[1]));
        sendJson(response, 200, { success: true });
        return;
      }

      if (pathname === "/api/reports" && request.method === "GET") {
        const period = url.searchParams.get("period") ?? "week";
        const brand = url.searchParams.get("brand") ?? "all";
        sendJson(response, 200, store.getReports(user.storeId, period, brand));
        return;
      }

      if (pathname === "/api/messages" && request.method === "GET") {
        sendJson(response, 200, store.getMessagesDashboard(user.storeId));
        return;
      }

      if (pathname === "/api/fiscal" && request.method === "GET") {
        sendJson(response, 200, { documents: store.listFiscalDocuments(user.storeId) });
        return;
      }

      if (pathname === "/api/fiscal/issuer" && request.method === "GET") {
        sendJson(response, 200, { issuer: store.getFiscalIssuer(user.storeId) });
        return;
      }

      if (pathname === "/api/fiscal/issuer/save" && request.method === "POST") {
        const body = await readJsonBody(request);
        sendJson(response, 200, { issuer: store.saveFiscalIssuer(user.storeId, body) });
        return;
      }

      if (pathname === "/api/fiscal/settings" && request.method === "GET") {
        sendJson(response, 200, await store.getFiscalPrintSettings(user.storeId));
        return;
      }

      if ((pathname === "/api/fiscal/settings" && request.method === "PUT") || (pathname === "/api/fiscal/settings/save" && request.method === "POST")) {
        const body = await readJsonBody(request);
        sendJson(response, 200, await store.saveFiscalPrintSettings(user.storeId, body));
        return;
      }

      const fiscalParams = routeMatch(pathname, "/api/fiscal/:id");
      if (fiscalParams && request.method === "GET") {
        const document = store.getFiscalDocument(user.storeId, Number(fiscalParams.id));
        if (!document) {
          sendJson(response, 404, { error: "Documento fiscal nao encontrado." });
          return;
        }

        sendJson(response, 200, { document });
        return;
      }

      const fiscalPrintParams = routeMatch(pathname, "/api/fiscal/:id/print");
      if (fiscalPrintParams && request.method === "POST") {
        sendJson(response, 200, await store.printFiscalDocumentDirect(user.storeId, Number(fiscalPrintParams.id)));
        return;
      }

      if (pathname === "/api/messages/templates" && request.method === "POST") {
        const body = await readJsonBody(request);
        sendJson(response, 201, { templates: store.saveMessageTemplate(user.storeId, null, body) });
        return;
      }

      const templateParams = routeMatch(pathname, "/api/messages/templates/:id");
      if (templateParams && ["PUT", "POST"].includes(request.method ?? "GET")) {
        const body = await readJsonBody(request);
        sendJson(response, 200, { templates: store.saveMessageTemplate(user.storeId, Number(templateParams.id), body) });
        return;
      }

      if (pathname === "/api/messages/send" && request.method === "POST") {
        const body = await readJsonBody(request);
        sendJson(response, 201, store.sendDirectMessage(user.storeId, body));
        return;
      }

      if (pathname === "/api/sales" && request.method === "POST") {
        const body = await readJsonBody(request);
        sendJson(response, 201, { sale: await store.createSale(user.storeId, body) });
        return;
      }

      const saleDeleteParams = routeMatch(pathname, "/api/sales/:id/delete");
      if (saleDeleteParams && request.method === "POST") {
        sendJson(response, 200, store.deleteSale(user.storeId, Number(saleDeleteParams.id)));
        return;
      }

      sendJson(response, 404, { error: "Rota nao encontrada." });
      return;
    }

    if (tryServeStatic(request, response, pathname)) {
      return;
    }

    sendText(response, 404, "Aplicacao nao encontrada. Gere o frontend com `npm run build` antes de iniciar em producao.");
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Erro interno do servidor.",
    });
  }
});

server.listen(PORT, () => {
  console.log(`AgroAves ativa em http://localhost:${PORT}`);
});
