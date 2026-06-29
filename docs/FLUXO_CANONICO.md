# Fluxo canônico — Imobi (enxuto)

**Modo lançamento:** jornada guiada (`NEXT_PUBLIC_GUIDED_STRICT=true`) + nav mínima por perfil ([`canonical-flow.ts`](../apps/web/lib/canonical-flow.ts)).

## URLs staging

| Ambiente | URL |
|----------|-----|
| Web | https://imobi-web-ten.vercel.app |
| API | https://imobi-api-staging.onrender.com |

## Funil único

```
/envie-seu-projeto → Login + KYC → Dossiê
→ Admin aprova → Tomador cadastra obra → Admin homologa
→ Tomador solicita crédito → Comitê (Admin + Eng)
→ Tomador evidências GPS → Eng vistoria → Admin pagamento SIPOC
→ Quitado → Gestor vê DRE/KPIs
```

## Nav por perfil (soft launch)

| Perfil | Nav sidebar | Home |
|--------|-------------|------|
| **Tomador** | Jornada · KYC · Viabilidade · Obras · Crédito · Conta | `/dashboard/construtor` |
| **Admin** | Centro de comando · Usuários · Conta | `/dashboard/admin` |
| **Engenheiro** | Vistorias · Comitê (parecer) · Conta | `/dashboard/engenheiro/vistoria` |
| **Gestor** | Operação do fundo · Conta | `/dashboard/gestor` |
| **Comercial** | Conta only (fase 2) | `/dashboard/comercial` |

Filas operacionais (KYC, viabilidade, obras, vistorias, comitê, propostas, pipeline) ficam **no hub Admin** — cards no centro de comando, não na sidebar.

## Tomador / Construtor

| Passo | Rota |
|-------|------|
| KYC | `/dashboard/kyc` |
| Viabilidade | `/dashboard/proposta-credito` |
| Obra | `/dashboard/obras/nova` |
| Crédito | `/dashboard/credito/solicitar` |
| Acompanhar | `/dashboard/construtor` |

## Admin IMOBI — ambiente operacional

| Ação | Onde |
|------|------|
| Hub + filas + SIPOC homologação | `/dashboard/admin` |
| Pagamentos manuais | `/dashboard/admin/pagamentos` |
| Filas (KYC, propostas, etc.) | Cards no hub → rotas `/dashboard/admin/*` |
| Usuários | `/dashboard/admin/usuarios` |

**API:** `GET /admin/filas` — contadores das filas operacionais.

## Gestor do fundo — somente leitura

Uma tela: `/dashboard/gestor`

- DRE operacional (carteira, desembolso, pipe, saúde)
- KPIs agregados
- Amostras de KYC e etapas no pipe (scroll na mesma página — âncoras `#secao-kyc` e `#secao-etapas`)

Rotas legadas `/dashboard/gestor/kyc` e `/dashboard/gestor/etapas` redirecionam para `/dashboard/gestor`.

**API:** `GET /manager/dashboard` → KPIs + objeto `dre`.

## Engenheiro

| Ação | Rota |
|------|------|
| Vistorias | `/dashboard/engenheiro/vistoria` |
| Parecer comitê | `/dashboard/engenheiro/comite` |

Não cadastra obra. Rota `/dashboard/obras` permanece para leitura de evidências quando necessário.

## Comercial (fase 2)

Nav oculta. Rotas bloqueadas até `NEXT_PUBLIC_COMERCIAL_ENABLED=true` (stub em `/dashboard/comercial`).

## Rotas legadas

Redirects em `LEGACY_PREFIX_REDIRECTS` — ex.: `/dashboard/fundos` → `/dashboard/gestor`.

## Técnico

- **API first:** `@imbobi/schemas` + OpenAPI
- **Guiado:** middleware + `GET /jornada` + `isCanonicalRouteAllowed`
- **Resiliente:** throttle + cache (manager dashboard 60s, admin filas poll)
- **Escalável:** agregações em `ManagerService` / `AdminService`
