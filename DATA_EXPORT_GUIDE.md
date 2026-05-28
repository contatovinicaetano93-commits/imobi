# Data Export Guide

Este documento descreve como exportar dados da plataforma IMBOBI em diferentes formatos.

## Visão Geral

O sistema de exportação permite que administradores e gestores de obra exportem dados em CSV e PDF para análise externa e documentação.

## Endpoints de Export

### CSV Exports

#### 1. Exportar Usuários
```bash
GET /api/v1/admin/export/users.csv
```

**Query Parameters:**
- `startDate` (opcional): Data inicial (ISO 8601) - ex: `2024-01-01`
- `endDate` (opcional): Data final (ISO 8601) - ex: `2024-12-31`
- `kycStatus` (opcional): Filtrar por status KYC - `PENDENTE`, `APROVADO`, `REJEITADO`, `EM_VERIFICACAO`

**Exemplo:**
```bash
GET /api/v1/admin/export/users.csv?startDate=2024-01-01&kycStatus=APROVADO
```

**Colunas no CSV:**
- usuarioId
- nome
- email
- tipo
- kycStatus
- bloqueado
- criadoEm
- atualizadoEm

---

#### 2. Exportar Obras
```bash
GET /api/v1/admin/export/obras.csv
```

**Query Parameters:**
- `startDate` (opcional): Data inicial
- `endDate` (opcional): Data final
- `status` (opcional): Filtrar por status - `PLANEJAMENTO`, `EM_EXECUCAO`, `PAUSADA`, `CONCLUIDA`, `CANCELADA`

**Exemplo:**
```bash
GET /api/v1/admin/export/obras.csv?status=EM_EXECUCAO
```

**Colunas no CSV:**
- obraId
- nome
- endereco
- tipo
- status
- usuarioNome
- usuarioEmail
- creditoId
- valorCreditoAprovado
- areaM2
- criadoEm
- atualizadoEm

---

#### 3. Exportar Créditos
```bash
GET /api/v1/admin/export/creditos.csv
```

**Query Parameters:**
- `startDate` (opcional): Data inicial
- `endDate` (opcional): Data final
- `status` (opcional): Filtrar por status - `ATIVO`, `SUSPENSO`, `VENCIDO`, `QUITADO`

**Exemplo:**
```bash
GET /api/v1/admin/export/creditos.csv?status=ATIVO&startDate=2024-06-01
```

**Colunas no CSV:**
- creditoId
- usuarioNome
- usuarioEmail
- usuarioCpf
- valorAprovado
- valorLiberado
- taxaMensalPercentual
- prazoMeses
- status
- dataAprovacao
- dataVencimento
- criadoEm

---

#### 4. Exportar Evidências
```bash
GET /api/v1/admin/export/evidencias.csv
```

**Query Parameters:**
- `startDate` (opcional): Data inicial
- `endDate` (opcional): Data final

**Colunas no CSV:**
- evidenciaId
- obraNome
- obraEndereco
- etapaNome
- etapaOrdem
- latCaptura
- lngCaptura
- accuracyMetros
- distanciaObra
- validada
- observacao
- criadoEm

---

#### 5. Exportar Documentos KYC
```bash
GET /api/v1/admin/export/kyc-documentos.csv
```

**Query Parameters:**
- `startDate` (opcional): Data inicial
- `endDate` (opcional): Data final
- `status` (opcional): Filtrar por status - `PENDENTE`, `APROVADO`, `REJEITADO`

**Colunas no CSV:**
- kycDocumentoId
- usuarioNome
- usuarioEmail
- usuarioTipo
- tipoDocumento
- status
- motivoRejeicao
- criadoEm
- analisadoEm

---

### PDF Exports

#### 1. Relatório de Obra
```bash
GET /api/v1/admin/export/relatorio-obra/{obraId}.pdf
```

**Parâmetros:**
- `obraId` (obrigatório): ID da obra

**Conteúdo:**
- Informações gerais da obra (nome, endereço, responsável)
- Status e progresso
- Crédito associado (se houver)
- Lista de etapas com status
- Evidências por etapa

---

#### 2. Contrato de Crédito
```bash
GET /api/v1/admin/export/contrato-credito/{creditoId}.pdf
```

**Parâmetros:**
- `creditoId` (obrigatório): ID do crédito

**Conteúdo:**
- Partes contratantes
- Condições do crédito (valor, taxa, prazo)
- Termos e condições
- Espaço para assinaturas

---

#### 3. Comprovante KYC
```bash
GET /api/v1/admin/export/comprovante-kyc/{usuarioId}.pdf
```

**Parâmetros:**
- `usuarioId` (obrigatório): ID do usuário

**Pré-requisitos:**
- Usuário deve ter `kycStatus = APROVADO`

**Conteúdo:**
- Certificado de aprovação
- Documentos aprovados
- Data de emissão e validade

---

## Rate Limiting

Todas as endpoints de export respeitam os seguintes limites:

- **Limite Global:** 1 requisição por 5 minutos por usuário
- **Método:** Throttler customizado baseado em usuário

Caso atinja o limite, você receberá um status `429 Too Many Requests`.

---

## Autenticação e Autorização

Todas as endpoints de export requerem:

1. **Token JWT válido** no header `Authorization: Bearer {token}`
2. **Role:** `ADMIN` ou `GESTOR_OBRA`

---

## Uso na Interface Web

Na dashboard de admin (`/admin/analytics`), você encontrará:

1. **Filtros de data range** para selecionar período
2. **Botões de exportação** para cada tipo de dado
3. **Formato automático** - arquivos são baixados com timestamp

### Exemplo de Fluxo:
1. Acesse `/admin/analytics`
2. Defina data inicial e final (opcional)
3. Clique em "Exportar Usuários (CSV)"
4. O arquivo será baixado automaticamente como `usuarios-{timestamp}.csv`

---

## Tratamento de Erros

### Casos Comuns de Erro:

| Status | Erro | Solução |
|--------|------|---------|
| 400 | "Datas inválidas" | Verifique o formato ISO 8601 |
| 401 | "Unauthorized" | Inclua token JWT válido |
| 403 | "Forbidden" | Verifique se tem role ADMIN ou GESTOR_OBRA |
| 404 | "Obra não encontrada" | Verifique o ID do recurso |
| 429 | "Too Many Requests" | Aguarde antes de fazer nova requisição |

---

## Performance

### Recomendações:

1. **Não exporte tudo de uma vez:** Use filtros de data range
2. **Processe em lotes:** Para mais de 10.000 registros, divida em chunks
3. **Horários de baixo uso:** Execute exports noturnos para não sobrecarregar o sistema

### Tamanho Esperado:

- **1000 usuários:** ~150 KB CSV
- **1000 obras:** ~200 KB CSV
- **1000 créditos:** ~250 KB CSV
- **PDF:** ~50-200 KB por documento

---

## Exemplos com cURL

### Exportar usuários aprovados do último mês:

```bash
curl -X GET "https://api.imbobi.com/api/v1/admin/export/users.csv?kycStatus=APROVADO&startDate=2024-05-28" \
  -H "Authorization: Bearer {seu_token_jwt}"
```

### Exportar obras em execução:

```bash
curl -X GET "https://api.imbobi.com/api/v1/admin/export/obras.csv?status=EM_EXECUCAO" \
  -H "Authorization: Bearer {seu_token_jwt}" \
  -o obras_ativas.csv
```

### Gerar relatório de obra:

```bash
curl -X GET "https://api.imbobi.com/api/v1/admin/export/relatorio-obra/{obraId}.pdf" \
  -H "Authorization: Bearer {seu_token_jwt}" \
  -o relatorio.pdf
```

---

## Integração com Ferramentas Externas

### Importar em Excel/Google Sheets:

1. Export as CSV
2. Abra o arquivo em Excel/Sheets
3. Use recursos de análise de dados nativa

### Integração com BI Tools:

Os CSVs exportados podem ser importados em:
- Tableau
- Power BI
- Looker
- Metabase

---

## Compliance e Segurança

### Dados Sensíveis:

- CPF é exportado como **hash** (não revelam número real)
- Senhas nunca são exportadas
- Dados pessoais devem ser tratados conforme LGPD

### Retenção:

- Arquivos exportados não são armazenados no servidor
- Download é gerado on-demand
- Considere manter backups locais com segurança apropriada

---

## Suporte

Para dúvidas ou problemas com exports, entre em contato com:

- **Email:** suporte@imbobi.com
- **Docs:** https://docs.imbobi.com/exports
