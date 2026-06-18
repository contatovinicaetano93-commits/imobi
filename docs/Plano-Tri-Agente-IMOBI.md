# Plano de Coordenação Multi-Agente — IMOBI

> Branch de trabalho: `claude/exciting-curie-t6wquk`
> Regra: cada agente faz `git pull` antes de começar. Cada agente trabalha em arquivos diferentes para evitar conflito.

---

## Divisão por Agente

### Agente A — Backend + Mobile (esta sessão)
Responsável por: `services/api/`, `apps/mobile/`, `packages/core/`, `packages/schemas/`

| # | Tarefa | Status |
|---|--------|--------|
| 1 | Fluxo financeiro: fees 3%/7%, DadosBancarios, fila operador, RI | ✅ Concluído |
| 2 | GPS anti-spoofing: mock detection, timestamp, PostGIS | ✅ Concluído |
| 3 | 2FA TOTP (NestJS + mobile) | ✅ Concluído |
| 4 | Scoring de construtibilidade — metodologia real | ⏳ Pendente |
| 5 | Telas mobile restantes (KYC, notificações, crédito, dados bancários, documentos) | ⏳ Pendente |
| 6 | Rollback strategy (down migrations + health check pós-deploy) | ⏳ Pendente |

### Agente B — Frontend Web
Responsável por: `apps/web/`

| # | Tarefa | Status |
|---|--------|--------|
| B1 | Tela de dados bancários (perfil do construtor) | ⏳ Pendente |
| B2 | Painel do operador (fila de transferências pendentes) | ⏳ Pendente |
| B3 | Tela 2FA (ativar/desativar no perfil) | ⏳ Pendente |
| B4 | Validação RI no painel admin (botão validar RI por obra) | ⏳ Pendente |
| B5 | packages/tokens — design tokens compartilhados (cores, espaçamentos) | ⏳ Pendente |
| B6 | ScoreDynamics atualizado com breakdown por critério | ⏳ Pendente |

---

## Regras de Coordenação

1. **Nunca editar o mesmo arquivo simultaneamente.** Agente A não toca em `apps/web/`. Agente B não toca em `services/api/` nem `apps/mobile/`.
2. Antes de começar: `git pull origin claude/exciting-curie-t6wquk`
3. Após cada tarefa: commit + push imediatamente
4. Atualizar este documento marcando ✅ quando concluído

---

## Estado do Schema (Prisma)
> Apenas Agente A modifica `schema.prisma`. Agente B consome a API.

Novos models adicionados até agora:
- `DadosBancarios` — dados bancários do construtor
- `AcaoOperador` — fila de transferências para o operador
- Campos em `EvidenciaEtapa`: altitude, heading, speed, isMockLocation, timestampCaptura
- Campos em `Credito`: tipoGarantia, creditoPonte, feeEstruturacao
- Campo em `Obra`: riValidado

## Novos Endpoints Disponíveis
- `PUT /api/v1/dados-bancarios` — cadastrar dados bancários
- `GET /api/v1/dados-bancarios/meus`
- `GET /api/v1/admin/transferencias` — fila do operador
- `PATCH /api/v1/admin/transferencias/:id/confirmar`
- `PATCH /api/v1/admin/obras/:id/validar-ri`
