# Admin Dashboard - Guia Completo

## Visão Geral

O Admin Dashboard fornece ferramentas avançadas para administradores gerenciarem usuários, documentos KYC, créditos, etapas e monitorar a saúde do sistema.

## Roles e Permissões

### User Types (UsuarioTipo)

```typescript
enum UsuarioTipo {
  TOMADOR        // Regular user (borrower)
  GESTOR_OBRA    // Work manager
  PARCEIRO       // Partner
  ADMIN          // Administrator - Full access to admin endpoints
}
```

### Admin Permissions

Apenas usuários com `tipo = "ADMIN"` podem acessar qualquer endpoint `/admin/*`. Todos os endpoints admin requerem:

1. **JwtAuthGuard** - Valid JWT token
2. **RolesGuard** - User must have `ADMIN` role
3. **AuditLog** - All actions are logged automatically

## Características do Dashboard

### 1. Dashboard Principal (`/admin`)

Página inicial com estatísticas do sistema:

- **Total de Usuários** - Contagem total de usuários registrados
- **Usuários Bloqueados** - Usuários atualmente bloqueados
- **KYC Pendentes** - Documentos aguardando aprovação
- **Créditos Pendentes** - Solicitações de crédito não processadas
- **Etapas Aguardando** - Etapas aguardando vistoria

Cada card é clicável e leva para a seção correspondente.

### 2. Gerenciamento de Usuários (`/admin/users`)

#### Funcionalidades

- **Listagem com Paginação** - Visualizar todos os usuários em páginas de 20
- **Filtros Avançados**:
  - Por tipo (TOMADOR, GESTOR_OBRA, PARCEIRO, ADMIN)
  - Por status (Bloqueado/Ativo)
  - Por status KYC
- **Ações Batch**:
  - **Bloquear Usuário** - Impede acesso e qualquer operação
  - **Desbloquear Usuário** - Restaura acesso

#### Bloquear um Usuário

```bash
PATCH /api/v1/admin/users/:usuarioId/block
Content-Type: application/json

{
  "motivo": "Fraude detectada"
}
```

#### Desbloquear um Usuário

```bash
PATCH /api/v1/admin/users/:usuarioId/unlock
```

**Observação**: Quando um usuário é bloqueado:
- Campo `bloqueado` é setado para `true`
- `motivoBloqueio` armazena o motivo
- `bloqueadoEm` registra a data/hora
- Uma entrada de audit log é criada

### 3. Análise de KYC (`/admin/kyc/pending`)

#### Visão Geral

Gerenciar documentos KYC (RG, CNH, Selfie, Comprovante de Residência, etc.)

#### Funcionalidades

- **Listagem de Documentos Pendentes**
- **Visualização de Documentos** - Link direto para S3
- **Seleção em Lote** - Checkbox para selecionar múltiplos documentos
- **Aprovação em Lote** - Aprovar vários documentos de uma vez
- **Rejeição em Lote** - Rejeitar com motivo fornecido

#### Workflow de Aprovação

1. Verificar documentos pendentes
2. Selecionar documentos para analisar
3. Visualizar em alta resolução via S3
4. Clicar "Aprovar Selecionados"
5. Sistema verifica se todos KYCs do usuário estão aprovados
6. Se sim, `usuario.kycStatus` é setado para `APROVADO`
7. Usuário recebe notificação automática

#### Workflow de Rejeição

1. Selecionar documentos
2. Clicar "Rejeitar Selecionados"
3. Preencher motivo (obrigatório)
4. Confirmar rejeição
5. Status é setado para `REJEITADO`
6. `motivo_rejeicao` é preenchido
7. Usuário é notificado e pode reenviar documento

#### API Endpoints

```bash
# Listar documentos pendentes
GET /api/v1/admin/kyc/pending?page=1&limit=20

# Aprovar múltiplos documentos
POST /api/v1/admin/kyc/bulk-approve
{
  "documentIds": ["doc-id-1", "doc-id-2"]
}

# Rejeitar múltiplos documentos
POST /api/v1/admin/kyc/bulk-reject
{
  "documentIds": ["doc-id-1"],
  "motivo": "Documento ilegível - reenviar em alta qualidade"
}
```

### 4. Gerenciamento de Créditos (`/admin/credits`)

#### Operações Disponíveis

- **Aprovar Crédito** - Definir valor, prazo e taxa
- **Rejeitar Crédito** - Com motivo registrado

#### API Endpoints

```bash
# Aprovar crédito
POST /api/v1/admin/credits/approve
{
  "creditoId": "credit-uuid",
  "valorAprovado": 50000.00,
  "prazoMeses": 12,
  "taxaMensal": 0.0099
}

# Rejeitar crédito
POST /api/v1/admin/credits/reject
{
  "creditoId": "credit-uuid",
  "motivo": "Score insuficiente"
}
```

### 5. Gerenciamento de Etapas (`/admin/stages`)

#### Operações Disponíveis

- **Aprovação em Lote** - Aprovar múltiplas etapas
- **Histórico** - Rastrear todas as etapas

#### API Endpoints

```bash
# Aprovar etapas em lote
POST /api/v1/admin/stages/bulk-approve
{
  "etapaIds": ["stage-id-1", "stage-id-2"]
}
```

Status da etapa após aprovação: `CONCLUIDA`

### 6. Monitoramento (`/admin/monitoring`)

#### Métricas Disponíveis

- **API Health** - Status e latência da API
- **Database Health** - Conexões ativas e limite
- **Cache Health** - Uso de memória Redis
- **Alertas Recentes** - Eventos importantes do sistema
- **Performance Metrics** - Requisições/min, tempo médio, taxa de erro
- **Logs Recentes** - Últimas ações do sistema

## Audit Logs

Todos os dados administrativos são rastreados em `AuditLog`:

```prisma
model AuditLog {
  logId         String   @id @default(uuid())
  usuarioId     String   // User being affected
  usuario       Usuario  @relation(...)
  adminId       String   // Admin performing the action
  admin         Usuario  @relation(...)
  acao          String   // Action type (BLOQUEAR_USUARIO, APROVAR_KYC, etc.)
  descricao     String?
  mudancasAntes Json?    // State before
  mudancasDepois Json?   // State after
  ipAddress     String?
  userAgent     String?
  criadoEm      DateTime @default(now())
}
```

### Ações Registradas

- `BLOQUEAR_USUARIO` - Bloqueio de usuário
- `DESBLOQUEAR_USUARIO` - Desbloqueio de usuário
- `APROVAR_KYC` - Aprovação de documento KYC
- `REJEITAR_KYC` - Rejeição de documento KYC
- `APROVAR_CREDITO` - Aprovação de crédito
- `REJEITAR_CREDITO` - Rejeição de crédito
- `APROVAR_ETAPA` - Aprovação de etapa

### Recuperar Audit Logs

```bash
GET /api/v1/admin/audit-logs?page=1&limit=50&usuarioId={id}&acao={action}
```

## Best Practices

### 1. KYC Management

- ✅ Revisar todos os documentos antes de aprovar
- ✅ Fornecer motivos claros ao rejeitar
- ✅ Aprovar em lote quando possível (eficiência)
- ❌ Não aprovar documentos ilegíveis ou incompletos

### 2. User Management

- ✅ Registrar motivo ao bloquear usuário
- ✅ Revisar histórico antes de desbloquear
- ✅ Usar filtros para encontrar usuários específicos
- ❌ Não bloquear sem documentação adequada

### 3. Credit Management

- ✅ Validar KYC antes de aprovar crédito
- ✅ Revisar score de construtibilidade
- ✅ Definir termos apropriados para cada usuário
- ❌ Não aprovar créditos sem validação completa

### 4. Audit Trail

- ✅ Revisar logs regularmente
- ✅ Investigar ações suspeitas
- ✅ Documentar decisões importantes
- ❌ Não ignorar discrepâncias nos logs

## Segurança

### Proteções Implementadas

1. **Role-Based Access Control (RBAC)** - Apenas ADMIN pode acessar
2. **JWT Authentication** - Token obrigatório
3. **Audit Logging** - Todas as ações registradas
4. **Request Validation** - Schemas Zod validam entrada
5. **IP Logging** - Rastreamento de origem das ações
6. **CSRF Protection** - Guard CSRF em endpoints POST/PATCH

### Compliance Checklist

- [ ] Revisar audit logs diariamente
- [ ] Atualizar senhas mensalmente
- [ ] Validar todas as ações administrativas
- [ ] Revisar usuários bloqueados semanalmente
- [ ] Arquivar logs trimestral mente
- [ ] Testar recuperação de backup
- [ ] Revisar permissões de admin trimestralmente
- [ ] Documentar mudanças de política
- [ ] Realizar auditorias de segurança

## Troubleshooting

### Erro: "User role not found"

**Causa**: Usuário não é ADMIN ou token inválido

**Solução**: 
1. Verificar se `user.tipo === "ADMIN"`
2. Renovar token JWT

### Erro: "Nenhum documento pendente encontrado"

**Causa**: Documentos já foram processados ou não existem

**Solução**:
1. Verificar se documentos têm `status = "PENDENTE"`
2. Rejeitar e solicitar reenviamento ao usuário

### Ação não aparece no Audit Log

**Causa**: Erro durante registro do audit log (não bloqueia ação)

**Solução**:
1. Verificar logs da aplicação
2. Verificar conectividade com banco de dados

## Endpoints Reference

### User Management
- `GET /admin/users` - Listar usuários
- `PATCH /admin/users/:id/block` - Bloquear usuário
- `PATCH /admin/users/:id/unlock` - Desbloquear usuário

### KYC Management
- `GET /admin/kyc/pending` - Listar pendentes
- `POST /admin/kyc/bulk-approve` - Aprovar em lote
- `POST /admin/kyc/bulk-reject` - Rejeitar em lote

### Credit Management
- `POST /admin/credits/approve` - Aprovar crédito
- `POST /admin/credits/reject` - Rejeitar crédito

### Stage Management
- `POST /admin/stages/bulk-approve` - Aprovar etapas

### Dashboard
- `GET /admin/stats` - Estatísticas do sistema
- `GET /admin/audit-logs` - Audit logs

## Contato e Suporte

Para dúvidas ou problemas:
1. Verificar este guia
2. Revisar Audit Logs
3. Contatar time de desenvolvimento
4. Consultar documentação da API
