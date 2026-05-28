# Beta Test Accounts

> **Status**: Template prepared - Awaiting account creation via API
> **Created**: 2026-05-28
> **Last Updated**: [To be filled after creation]

## Account Creation Instructions

Use the production API endpoint: `https://api.imobi.com/api/v1/auth/registrar`

Each account should be created with a POST request containing the user data below.

---

## Construtora

### Account 1
- **Email**: beta-construtora-1@imobi.test
- **Senha**: BetaPass123!
- **Nome**: Construtora Teste 1
- **CPF**: 11144477735
- **Telefone**: 11987654321
- **Tipo**: CONSTRUTORA
- **Status**: [ ] Created | [ ] Verified | [ ] Access tested
- **Creation Endpoint**: POST https://api.imobi.com/api/v1/auth/registrar
- **Payload**:
```json
{
  "email": "beta-construtora-1@imobi.test",
  "senha": "BetaPass123!",
  "nome": "Construtora Teste 1",
  "cpf": "11144477735",
  "telefone": "11987654321",
  "tipo": "CONSTRUTORA"
}
```

### Account 2
- **Email**: beta-construtora-2@imobi.test
- **Senha**: BetaPass123!
- **Nome**: Construtora Teste 2
- **CPF**: 11144477746
- **Telefone**: 11987654322
- **Tipo**: CONSTRUTORA
- **Status**: [ ] Created | [ ] Verified | [ ] Access tested
- **Payload**:
```json
{
  "email": "beta-construtora-2@imobi.test",
  "senha": "BetaPass123!",
  "nome": "Construtora Teste 2",
  "cpf": "11144477746",
  "telefone": "11987654322",
  "tipo": "CONSTRUTORA"
}
```

**Web Access**: https://imobi.vercel.app/login

---

## Gestor de Obra

### Account 1
- **Email**: beta-gestor-1@imobi.test
- **Senha**: BetaPass123!
- **Nome**: Gestor de Obra Teste 1
- **CPF**: 22255588846
- **Telefone**: 21987654321
- **Tipo**: GESTOR_OBRA
- **Status**: [ ] Created | [ ] Verified | [ ] Access tested
- **Payload**:
```json
{
  "email": "beta-gestor-1@imobi.test",
  "senha": "BetaPass123!",
  "nome": "Gestor de Obra Teste 1",
  "cpf": "22255588846",
  "telefone": "21987654321",
  "tipo": "GESTOR_OBRA"
}
```

### Account 2
- **Email**: beta-gestor-2@imobi.test
- **Senha**: BetaPass123!
- **Nome**: Gestor de Obra Teste 2
- **CPF**: 22255588857
- **Telefone**: 21987654322
- **Tipo**: GESTOR_OBRA
- **Status**: [ ] Created | [ ] Verified | [ ] Access tested
- **Payload**:
```json
{
  "email": "beta-gestor-2@imobi.test",
  "senha": "BetaPass123!",
  "nome": "Gestor de Obra Teste 2",
  "cpf": "22255588857",
  "telefone": "21987654322",
  "tipo": "GESTOR_OBRA"
}
```

**Web Access**: https://imobi.vercel.app/login

---

## Engenheiro

### Account 1
- **Email**: beta-engenheiro-1@imobi.test
- **Senha**: BetaPass123!
- **Nome**: Engenheiro Teste 1
- **CPF**: 33366699957
- **Telefone**: 31987654321
- **Tipo**: ENGENHEIRO
- **Status**: [ ] Created | [ ] Verified | [ ] Access tested
- **Payload**:
```json
{
  "email": "beta-engenheiro-1@imobi.test",
  "senha": "BetaPass123!",
  "nome": "Engenheiro Teste 1",
  "cpf": "33366699957",
  "telefone": "31987654321",
  "tipo": "ENGENHEIRO"
}
```

### Account 2
- **Email**: beta-engenheiro-2@imobi.test
- **Senha**: BetaPass123!
- **Nome**: Engenheiro Teste 2
- **CPF**: 33366699968
- **Telefone**: 31987654322
- **Tipo**: ENGENHEIRO
- **Status**: [ ] Created | [ ] Verified | [ ] Access tested
- **Payload**:
```json
{
  "email": "beta-engenheiro-2@imobi.test",
  "senha": "BetaPass123!",
  "nome": "Engenheiro Teste 2",
  "cpf": "33366699968",
  "telefone": "31987654322",
  "tipo": "ENGENHEIRO"
}
```

**Web Access**: https://imobi.vercel.app/login

---

## Parceiro/Parceira

### Account 1
- **Email**: beta-parceiro-1@imobi.test
- **Senha**: BetaPass123!
- **Nome**: Parceiro Teste 1
- **CPF**: 44477700078
- **Telefone**: 41987654321
- **Tipo**: PARCEIRO
- **Status**: [ ] Created | [ ] Verified | [ ] Access tested
- **Payload**:
```json
{
  "email": "beta-parceiro-1@imobi.test",
  "senha": "BetaPass123!",
  "nome": "Parceiro Teste 1",
  "cpf": "44477700078",
  "telefone": "41987654321",
  "tipo": "PARCEIRO"
}
```

### Account 2
- **Email**: beta-parceiro-2@imobi.test
- **Senha**: BetaPass123!
- **Nome**: Parceira Teste 2
- **CPF**: 44477700089
- **Telefone**: 41987654322
- **Tipo**: PARCEIRO
- **Status**: [ ] Created | [ ] Verified | [ ] Access tested
- **Payload**:
```json
{
  "email": "beta-parceiro-2@imobi.test",
  "senha": "BetaPass123!",
  "nome": "Parceira Teste 2",
  "cpf": "44477700089",
  "telefone": "41987654322",
  "tipo": "PARCEIRO"
}
```

**Web Access**: https://imobi.vercel.app/login

---

## Account Creation Checklist

### API Validation
- [ ] API endpoint is responding
- [ ] Rate limiting allows batch creation
- [ ] Email validation is configured
- [ ] CPF validation is working

### Per Account
For each account created:
- [ ] Verify registration response contains user ID
- [ ] Check email delivery (if confirmation required)
- [ ] Test login with provided credentials
- [ ] Verify role/tipo assignment in dashboard
- [ ] Confirm profile completeness requirements

### Post-Creation Testing
- [ ] All 10 accounts accessible
- [ ] Role-based UI differences verified
- [ ] KYC workflow testable per role
- [ ] Document upload flow ready
- [ ] Audit trail visible for actions

---

## Quick Reference

| Tipo | Count | Email Pattern | CPF Range |
|------|-------|---------------|-----------|
| CONSTRUTORA | 2 | beta-construtora-{1,2}@imobi.test | 111444777{35,46} |
| GESTOR_OBRA | 2 | beta-gestor-{1,2}@imobi.test | 222555888{46,57} |
| ENGENHEIRO | 2 | beta-engenheiro-{1,2}@imobi.test | 333666999{57,68} |
| PARCEIRO | 2 | beta-parceiro-{1,2}@imobi.test | 444777000{78,89} |
| **TOTAL** | **8** | | |

---

## Notes
- Common password: `BetaPass123!`
- All emails use `.test` domain (non-routable)
- CPFs are sequential per tipo for easy tracking
- Ensure firewall/CORS allows test domain emails in production API logs

