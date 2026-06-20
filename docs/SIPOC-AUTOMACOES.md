# SIPOC das Automações do Sistema IMOBI

> Gerado em: 2026-06-20 | Sessão Claude

---

## O que é SIPOC

| Letra | Significado | Descrição |
|-------|-------------|-----------|
| **S** | Supplier | Quem fornece a entrada do processo |
| **I** | Input | O que entra no processo |
| **P** | Process | As etapas de transformação |
| **O** | Output | O resultado do processo |
| **C** | Customer | Quem recebe a saída |

---

## 1. Liberação de Parcela (BullMQ Worker)

| S | I | P | O | C |
|---|---|---|---|---|
| Sistema — aprovação de etapa pelo gestor | `creditoId`, `liberacaoId`, `valorLiberacao` | 1. Checa idempotência (status PENDENTE) 2. Busca crédito no banco 3. Transaction: incrementa `valorLiberado`, marca `CONCLUIDA` 4. Notifica (in-app + push + email) | Parcela com status `CONCLUIDA`, saldo atualizado, notificações enviadas | Tomador / Construtor |

**Arquivo:** `services/api/src/workers/liberacao-parcela.worker.ts`

---

## 2. Exclusão de Usuário — LGPD Art. 17 (BullMQ Worker)

| S | I | P | O | C |
|---|---|---|---|---|
| Usuário — solicitação de exclusão de conta | `usuarioId` | 1. Marca `deletadoEm` (soft delete) 2. Aguarda 30 dias (grace period) 3. Transaction: deleta sessões, tokens FCM, obras, créditos, notificações, score 4. Envia e-mail de confirmação LGPD | Dados permanentemente removidos, e-mail de confirmação enviado | Usuário (titular dos dados) |

**Arquivo:** `services/api/src/workers/excluir-usuario.worker.ts`

---

## 3. Notificação por E-mail (EmailService com retry)

| S | I | P | O | C |
|---|---|---|---|---|
| Qualquer módulo do sistema (auth, workers, admin) | `to`, `subject`, `html` | 1. Verifica SMTP configurado 2. Tenta enviar (até 3 tentativas com backoff) 3. Registra sucesso/falha | E-mail entregue ou `false` após 3 falhas | Usuário final |

**Templates:** `parcelaLiberada`, `etapaAprovada`, `kycRejeitado`, `recuperacaoSenha`, `contaExcluida`

**Arquivo:** `services/api/src/modules/email/email.service.ts`

---

## 4. Push Notification (Firebase FCM)

| S | I | P | O | C |
|---|---|---|---|---|
| Qualquer módulo do sistema | `usuarioId`, tipo de evento | 1. Busca tokens FCM ativos do usuário 2. Monta template (título + corpo) 3. Envia via Firebase Messaging 4. Desativa tokens inválidos (`registration-token-not-registered`) | Push entregue no dispositivo; tokens mortos desativados | Tomador / Construtor / Engenheiro |

**Arquivo:** `services/api/src/modules/push-notificacoes/push-notificacoes.service.ts`

---

## 5. Validação Geoespacial de Evidência (PostGIS + Haversine)

| S | I | P | O | C |
|---|---|---|---|---|
| App Mobile — foto de obra | GPS coordinates, `etapaId`, arquivo de imagem | 1. Valida GPS accuracy (< 15m) — camada client 2. PostGIS `ST_DWithin` valida raio da obra — camada server (incontornável) 3. Upload S3 com AES-256 4. Cria registro `EvidenciaEtapa` | Foto armazenada com chave S3, evidência vinculada à etapa | Engenheiro / Gestor de Obra |

**Arquivos:** `services/api/src/modules/evidencias/evidencias.service.ts`, `packages/core/src/utils/haversine.ts`

---

## 6. Scoring de Conversão Comercial

| S | I | P | O | C |
|---|---|---|---|---|
| Atividade de lead (CRM pipeline) | `leadId`, tipo de atividade, segmento, histórico | 1. Calcula 5 sub-scores: fonte, tipo obra, segmento, engajamento, histórico 2. Soma score final (0–100) 3. Estima `probabilidadeClosing` e `dataEstimadaClosing` 4. Persiste `ConversionScore` | Score atualizado, probabilidade de fechamento, data estimada | Comercial / Parceiro |

**Arquivo:** `services/api/src/modules/comercial/conversion-scoring.service.ts`

---

## 7. Score de Crédito Histórico

| S | I | P | O | C |
|---|---|---|---|---|
| Módulo de crédito / KYC | dados financeiros do usuário | 1. Calcula score com base em histórico e KYC 2. Persiste `ScoreHistorico` | Score de risco atualizado | Gestor do Fundo (decisão de crédito) |

**Arquivo:** `services/api/src/modules/score/score.service.ts`

---

## Análise: Todas dentro do SIPOC?

**Sim.** O padrão se mantém em todas as automações:

- **Supplier** — sempre identificável: usuário, gestor, sistema ou evento externo
- **Input** — sempre tipado via Zod schema (fonte de verdade única)
- **Process** — isolado em services/workers com responsabilidade única
- **Output** — persistido no banco + notificação ao cliente
- **Customer** — definido pelo role do usuário no RBAC

> **Nota:** O `ExcluirUsuarioWorker` é o único caso onde Supplier = Customer (o próprio usuário), separados por 30 dias de grace period. Padrão válido em automações LGPD.
