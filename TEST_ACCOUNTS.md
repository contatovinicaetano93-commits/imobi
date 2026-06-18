# Test Accounts for imobi Beta Launch

This document lists the test accounts required for beta testing of the imobi platform. All accounts are pre-configured with different user roles and permissions to validate complete user workflows.

## Account Credentials Table

| # | Nome Completo | Email | CPF | Senha | Telefone | Tipo de Usuário | Permissões Esperadas |
|---|---|---|---|---|---|---|---|
| 1 | **Construtora Brasil 1** | construtora1@imobi.com.br | 12345678901 | Senha@123 | 11987654321 | TOMADOR | - Criar obras<br/>- Solicitar crédito<br/>- Gerenciar cronogramas<br/>- Liberar parcelas de financiamento |
| 2 | **Construtora São Paulo** | construtora2@imobi.com.br | 12345678902 | Senha@123 | 11987654322 | TOMADOR | - Criar obras<br/>- Solicitar crédito<br/>- Gerenciar cronogramas<br/>- Liberar parcelas de financiamento |
| 3 | **Gestor Obra 1** | gestor1@imobi.com.br | 12345678903 | Senha@123 | 11987654323 | ENGENHEIRO | - Visualizar obra atribuída<br/>- Registrar etapas/fases<br/>- Upload de evidências (fotos)<br/>- Atualizar cronograma<br/>- Gerar relatórios de progresso |
| 4 | **Gestor Obra 2** | gestor2@imobi.com.br | 12345678904 | Senha@123 | 11987654324 | ENGENHEIRO | - Visualizar obra atribuída<br/>- Registrar etapas/fases<br/>- Upload de evidências (fotos)<br/>- Atualizar cronograma<br/>- Gerar relatórios de progresso |
| 5 | **Engenheiro Supervisor 1** | engenheiro1@imobi.com.br | 12345678905 | Senha@123 | 11987654325 | ENGENHEIRO | - Visualizar múltiplas obras<br/>- Supervisionar progresso<br/>- Validar etapas completadas<br/>- Revisar evidências<br/>- Gerar relatórios consolidados |
| 6 | **Engenheiro Supervisor 2** | engenheiro2@imobi.com.br | 12345678906 | Senha@123 | 11987654326 | ENGENHEIRO | - Visualizar múltiplas obras<br/>- Supervisionar progresso<br/>- Validar etapas completadas<br/>- Revisar evidências<br/>- Gerar relatórios consolidados |
| 7 | **Parceiro Financeiro 1** | parceiro1@imobi.com.br | 12345678907 | Senha@123 | 11987654327 | PARCEIRO | - Visualizar solicitações de crédito<br/>- Análise KYC<br/>- Aprovação/rejeição de crédito<br/>- Monitorar liberação de parcelas |
| 8 | **Parceiro Financeiro 2** | parceiro2@imobi.com.br | 12345678908 | Senha@123 | 11987654328 | PARCEIRO | - Visualizar solicitações de crédito<br/>- Análise KYC<br/>- Aprovação/rejeição de crédito<br/>- Monitorar liberação de parcelas |

## Tipos de Usuário e Permissões

### TOMADOR (Construtora - Borrower)
**Responsabilidade**: Solicitante do crédito, gerenciador da obra
- Criar e gerenciar obras
- Solicitar linhas de crédito
- Gerenciar cronogramas de construção
- Liberar parcelas mediante comprovação de etapas
- Visualizar relatórios e histórico de transações
- Integrar com sistemas internos de gerenciamento

### ENGENHEIRO (Gestor/Engenheiro)
**Responsabilidade**: Acompanhamento in loco, validação de progresso
- Visualizar obras atribuídas
- Registrar etapas/fases da construção
- Fazer upload de evidências (fotos georeferenciadas com GPS)
- Atualizar cronogramas e marcos
- Gerar relatórios de progresso
- Notificar sobre atrasos ou issues

### PARCEIRO (Instituição Financeira/Partner)
**Responsabilidade**: Análise de crédito e aprovação
- Revisar solicitações de crédito
- Validar documentação KYC (Know Your Customer)
- Aprovar ou rejeitar linhas de crédito
- Monitorar desembolsos e liberação de parcelas
- Acessar relatórios de risco

### ADMIN (Administrador - Futuro)
**Responsabilidade**: Gerenciamento da plataforma
- Criar usuários
- Gerenciar permissões
- Auditar transações
- Configurar parâmetros do sistema

## Instruções de Uso

### Para Beta Testers

1. **Acesso à Plataforma**
   - Web: https://app.imobi.com.br
   - Mobile: Baixar app em App Store / Google Play (buscar "imobi")

2. **Login**
   - Use o email e senha fornecidos nesta tabela
   - Na primeira vez, será pedida validação de KYC básica

3. **Fluxo de Teste Recomendado**
   - **Construtora**: Criar obra → Solicitar crédito → Liberar parcela após validação
   - **Gestor**: Fazer login → Visualizar obras → Upload de evidências → Atualizar cronograma
   - **Engenheiro**: Visualizar múltiplas obras → Supervisionar progresso → Gerar relatório
   - **Parceiro**: Revisar solicitação de crédito → Aprovar → Monitorar liberação

4. **Relatório de Bugs**
   - Documentar passo a passo
   - Incluir screenshots
   - Mencionar tipo de conta/permissão
   - Enviar para: suporte@imobi.com.br

## Observações Importantes

- Todas as senhas seguem política: **Mínimo 8 caracteres, 1 letra maiúscula, 1 número**
- CPFs são de teste (não são CPFs reais)
- Contas podem ser resetadas diariamente para fins de teste
- Dados de teste são separados do banco de produção
- Não compartilhe credenciais com pessoas não autorizadas
- Após beta, estas contas serão desativadas

## Suporte

Para dúvidas sobre funcionalidades ou problemas de acesso:
- Email: suporte@imobi.com.br
- WhatsApp: +55 11 98765-4321
- Docs: https://docs.imobi.com.br

---

**Versão**: 1.0  
**Data**: 2026-05-28  
**Status**: Pronto para beta launch
