# AgroAves

Sistema de gestao agropecuaria com front em React + Vite e API local em Node com SQLite.

## O que foi incluido

- login com sessao local
- banco SQLite para produtos, clientes, fornecedores, vendas e mensagens
- isolamento multiempresa: cada login opera dentro de uma loja propria
- dashboard e relatorios conectados a dados reais
- filtro de vendas por marca
- automacao de mensagens disparadas a partir do produto comprado
- PDV persistindo venda e baixando estoque
- documento fiscal gerado em toda venda
- impressao fiscal visual e ponte para impressao direta no Windows

## Login padrao

- usuario: `admin`
- senha: `agroaves123`

## Login demo de outra loja

- usuario: `filial`
- senha: `agroaves123`

## Scripts

- `npm run dev` inicia o front
- `npm run dev:api` inicia a API local em `http://localhost:4000`
- `npm run dev:full` inicia front e API juntos
- `npm run build` gera a build de producao
- `npm start` sobe a API e serve o frontend buildado em producao
- `npm run lint` valida o codigo

## Banco de dados

- autenticacao e sessoes: `server/data/agroaves.db`
- dados de cada loja: `server/data/stores/*.db`

Cada loja fica em um banco proprio, evitando conflito de dados entre usuarios de lojas diferentes.

## Variaveis de ambiente

Use `.env.example` como base.

- `PORT` porta HTTP do servidor
- `VITE_API_BASE` base da API usada pelo frontend
- `AGROAVES_DATA_DIR` pasta persistente onde os bancos SQLite serao gravados
- `AGROAVES_ENABLE_DIRECT_PRINT` ativa impressao direta do servidor
- `AGROAVES_CORS_ORIGIN` origem permitida para chamadas da API

## Deploy web

O projeto agora esta pronto para subir como um unico servico Node:

1. rode `npm install`
2. rode `npm run build`
3. rode `npm start`

Em producao, o backend serve o frontend buildado e a API no mesmo dominio.

### Render

O arquivo `render.yaml` ja foi incluido para deploy no Render com disco persistente.

- build: `npm install && npm run build`
- start: `npm start`
- health check: `/healthz`
- dados persistidos em `/var/data/agroaves`

Importante:

- o Render usa filesystem efemero por padrao, entao o disco persistente e necessario para manter os bancos SQLite
- impressao direta do servidor fica desativada por padrao em hospedagem
- a impressao pelo navegador continua funcionando para o usuario final

## Impressao fiscal direta

- a tela `Fiscal` permite escolher a impressora local e ativar a impressao automatica nas vendas
- quando a impressao direta estiver ativa, o servidor tenta enviar a nota direto para a impressora configurada
- se a impressora direta nao estiver disponivel, o sistema ainda consegue abrir a impressao visual pelo navegador
- para impressao silenciosa funcionar, o projeto precisa rodar na mesma maquina onde a impressora esta instalada
- para NF-e ou NFC-e com validade fiscal oficial, ainda falta integrar certificado digital e SEFAZ

## Estrutura principal

- `server/` API local, autenticacao, seed e regras de negocio
- `src/pages/` telas do sistema
- `src/components/` layout e componentes reutilizaveis
- `src/context/` autenticacao
- `src/api/` cliente HTTP do front

## Observacao sobre mensagens

As mensagens sao geradas automaticamente e registradas no banco quando a venda tem cliente associado e existe um template ativo para o produto comprado.
