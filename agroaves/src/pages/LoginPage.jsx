import { Bird, LockKeyhole, UserRound } from "lucide-react";
import { useState } from "react";
import { Btn, Card, Input } from "../components/ui.jsx";
import { C, shadowMd } from "../lib/designSystem.js";

export function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ username: "admin", password: "agroaves123" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await onLogin(form.username, form.password);
    } catch (currentError) {
      setError(currentError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: C.bg,
      }}
    >
      <Card style={{ width: "100%", maxWidth: 430, padding: 0, overflow: "hidden", boxShadow: shadowMd }}>
        <div style={{ padding: "28px 28px 18px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: C.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Bird size={22} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>AgroAves</div>
              <div style={{ fontSize: 13, color: C.textSec }}>Login e acesso ao sistema</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.5 }}>
            O sistema agora usa autenticacao, banco local e isolamento por loja para persistir produtos, clientes, vendas e automacoes.
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 28 }}>
          <Input
            label="Usuario"
            value={form.username}
            onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
            placeholder="admin"
            style={{
              backgroundImage: "none",
            }}
          />
          <Input
            label="Senha"
            type="password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            placeholder="Digite sua senha"
          />
          {error ? (
            <div
              style={{
                marginBottom: 14,
                padding: "10px 12px",
                borderRadius: 10,
                background: C.dangerBg,
                color: C.danger,
                fontSize: 13,
              }}
            >
              {error}
            </div>
          ) : null}
          <Btn type="submit" style={{ width: "100%", justifyContent: "center" }} disabled={loading}>
            Entrar no sistema
          </Btn>
          <div style={{ marginTop: 16, color: C.textSec, fontSize: 12, display: "grid", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <UserRound size={14} />
              Usuario padrao: <strong style={{ color: C.text }}>admin</strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <LockKeyhole size={14} />
              Senha padrao: <strong style={{ color: C.text }}>agroaves123</strong>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
