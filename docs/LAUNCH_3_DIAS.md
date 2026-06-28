# Lançamento IMOBI — checklist 3 dias

**Meta:** sair do beta com fluxo guiado estrito, operação quitável e deploy confiável.

## Dia 1 — Código + staging (hoje)

- [x] Jornada estrita (`NEXT_PUBLIC_GUIDED_STRICT=true`, beta menu legado off)
- [x] Vistoria unificada → fluxo SIPOC (`AGUARDANDO_PAGAMENTO` + Admin confirma)
- [x] Quitação automática (`OperacaoConclusaoService`) quando etapas 100% + valor liberado
- [x] Comitê alinhado à jornada (gate + estado aguardando)
- [x] Resposta `/jornada` validada com Zod no web
- [ ] `pnpm type-check` + `pnpm test:jornada` + `pnpm test:kyc:api`
- [ ] Push `main` → Render redeploy + Vercel deploy
- [ ] Render env: `IMOBI_PROPOSTA_NOTIFY_EMAIL`, `SETUP_SECRET`, `SENTRY_DSN`
- [ ] Vercel env: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_GUIDED_STRICT=true`

## Dia 2 — Operação + usuários reais

- [ ] Seed contas operacionais (`pnpm seed:staging:from-render` ou `GET /setup?secret=`)
- [ ] Admin: aprovar KYC de 1 tomador real
- [ ] Admin: aprovar dossiê + homologar obra
- [ ] Engenheiro: aprovar 1 etapa com evidência GPS
- [ ] Admin: confirmar pagamento SIPOC
- [ ] Validar passo `concluido` após quitação simulada (seed obra completa)
- [ ] Smoke: `pnpm check:staging` + `pnpm test:e2e:staging`

## Dia 3 — Go-live

- [ ] Domínio produção (Vercel + API Render prod)
- [ ] Remover/s rotacionar senhas seed em produção
- [ ] Monitoramento: Sentry alertas + health UptimeRobot
- [ ] Comunicar URLs e papéis (Admin, Eng, Gestor leitura, Tomador)
- [ ] Gate: 1 tomador percorre funil completo sem bypass de jornada

## O que ainda é pós-lançamento (não bloqueia dia 3)

- OpenAPI completo (~26 módulos) — specs parciais em `docs/api/`
- Sharding / read replicas / cache 3 camadas
- Integração bancária automática (hoje pagamento manual Admin)
- `ObservableHttpClient` para HTTP externos

## Comandos rápidos

```bash
pnpm render:redeploy:staging
pnpm seed:staging:from-render
pnpm check:staging
pnpm test:e2e:staging
```
