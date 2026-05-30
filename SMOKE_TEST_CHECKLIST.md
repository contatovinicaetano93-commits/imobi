# 🧪 iMobi MVP — Smoke Test Checklist

**Data**: 2026-05-29  
**Objetivo**: Validar todas as funcionalidades críticas antes da produção (2026-06-02)  
**Público**: Founder/CTO (teste SOZINHO, sem especialistas)  
**Tempo Total**: ~45 minutos  
**Pré-requisito**: Ambiente rodando localmente (ver QUICK_START_LOCAL.md)

---

## ⚠️ ANTES DE COMEÇAR

1. Confirme que `pnpm dev` está rodando (Web + API + Redis)
2. Abra `http://localhost:3000` no navegador
3. Abra Chrome DevTools (F12) → Network + Console para ver erros
4. Use as credenciais mock abaixo para testes

---

## 📋 CENÁRIOS DE TESTE

Marque ✅ PASS, ❌ FAIL, ou ⚠️ PARTIAL para cada teste.

---

### 1️⃣ LOGIN E AUTENTICAÇÃO
**Tempo**: ~3 minutos  
**Objetivo**: Validar fluxo de login com JWT

#### Passos:
1. Acesse `http://localhost:3000/login`
2. Insira:
   - **Email**: `founder@test.local`
   - **Senha**: `Senha123` (ou use credencial do `.env.staging`)
3. Clique "Entrar"
4. Espere redirecionamento para `/dashboard`

#### Validações:
- [ ] Página de login carrega sem erros
- [ ] Botão "Entrar" desabilitado durante envio (loading state)
- [ ] Após login: token JWT armazenado em cookie HttpOnly
- [ ] Redirecionamento automático para dashboard ocorre
- [ ] Console (DevTools) não mostra erros 4xx/5xx

#### Status:
- **✅ PASS**: Login bem-sucedido, dashboard carrega
- **❌ FAIL**: Erro no login ou não redireciona
- **⚠️ PARTIAL**: Login funciona mas com delay > 2s

---

### 2️⃣ DASHBOARD E OVERVIEW
**Tempo**: ~2 minutos  
**Objetivo**: Validar carregamento de dados do dashboard

#### Passos:
1. Faça login (cenário anterior)
2. Navegue para `/dashboard` (ou espere redirecionamento)
3. Observe widgets principais (KYC status, crédito disponível, obras)

#### Validações:
- [ ] Dashboard carrega em < 2 segundos
- [ ] KYC Status Badge mostra status correto
- [ ] Saldo de crédito exibido
- [ ] Lista de obras carrega (mínimo 1 obra mock)
- [ ] Nenhum erro no console

#### Status:
- **✅ PASS**: Todos os widgets carregam corretamente
- **❌ FAIL**: Widgets não carregam ou exibem erro
- **⚠️ PARTIAL**: Alguns widgets carregam com delay

---

### 3️⃣ FILTROS AVANÇADOS
**Tempo**: ~5 minutos  
**Objetivo**: Validar novo sistema de filtros

#### Passos:
1. Na página `/dashboard/obras` (ou seção de obras)
2. Localize o painel de filtros
3. Aplique combinações:
   - Filtro por status (ex: "Em Andamento")
   - Filtro por localização (ex: "São Paulo")
   - Filtro por valor (ex: R$ 50k - R$ 500k)
4. Clique "Aplicar Filtros"
5. Observe lista atualizada

#### Validações:
- [ ] Filtros carregam sem erro
- [ ] Chips de filtros selecionados aparecem
- [ ] Lista de obras atualiza ao aplicar filtro
- [ ] Botão "Limpar Filtros" funciona
- [ ] URL reflete parâmetros de filtro (query params)
- [ ] Sem erros no console

#### Status:
- **✅ PASS**: Filtros aplicados corretamente, resultados atualizados
- **❌ FAIL**: Filtros não funcionam ou erro ao aplicar
- **⚠️ PARTIAL**: Alguns filtros funcionam, outros não

---

### 4️⃣ OPERAÇÕES EM LOTE (BULK REJECT)
**Tempo**: ~4 minutos  
**Objetivo**: Validar nova funcionalidade de rejeição em lote

#### Passos:
1. Acesse `/dashboard/gestor` (ou página de gestão de obras)
2. Selecione múltiplas obras (checkbox)
   - Mínimo 2 obras
3. Clique "Rejeitar Selecionadas" ou botão similar
4. Preencha motivo da rejeição em modal
5. Confirme ação

#### Validações:
- [ ] Checkboxes funcionam (selecionar/desselecionar)
- [ ] Botão "Rejeitar Selecionadas" aparece quando obras selecionadas
- [ ] Modal de confirmação exibe corretamente
- [ ] Após confirmação: obras atualizadas para status "Rejeitadas"
- [ ] Motivo registrado no audit trail
- [ ] Sem erros de API (HTTP 200-201)

#### Status:
- **✅ PASS**: Rejeição em lote funciona, status atualizado
- **❌ FAIL**: Operação falha ou não atualiza status
- **⚠️ PARTIAL**: Funciona mas com delay ou confirmação confusa

---

### 5️⃣ MAPA COM GPS
**Tempo**: ~4 minutos  
**Objetivo**: Validar geolocalização e mapa interativo

#### Passos:
1. Acesse página com mapa (ex: `/dashboard/obras` ou criar obra)
2. Veja mapa carregando (Mapbox/Google Maps)
3. Se disponível, clique em obra no mapa para expandir details
4. Teste filtro por raio (ex: "Obras em 5km")
5. Tente adicionar marcador (click no mapa ou input de endereço)

#### Validações:
- [ ] Mapa carrega (não aparece cinza/branco)
- [ ] Marcadores de obras aparecem no mapa
- [ ] Click em marcador exibe popup com detalhes
- [ ] Zoom e pan funcionam (scroll e arrastar)
- [ ] Se houver input de endereço: busca por GPS funciona
- [ ] Validação de GPS no servidor (PostGIS) não falha

#### Status:
- **✅ PASS**: Mapa interativo, marcadores funcionam
- **❌ FAIL**: Mapa não carrega ou marcadores não aparecem
- **⚠️ PARTIAL**: Mapa carrega mas interações lentas

---

### 6️⃣ AUDIT TRAIL (LOG DE AUDITORIA)
**Tempo**: ~3 minutos  
**Objetivo**: Validar registro de ações

#### Passos:
1. Acesse `/dashboard/auditoria` (ou seção similar)
2. Veja lista de ações recentes (login, rejeição, aprovação, etc)
3. Clique em uma ação para expandir detalhes
4. Verifique informações: usuário, ação, timestamp, objeto afetado

#### Validações:
- [ ] Página carrega sem erro
- [ ] Mínimo 5 entradas de log aparecem
- [ ] Cada entrada mostra: usuário, ação, data/hora
- [ ] Timestamps em formato legível (ex: "29/05 14:30")
- [ ] Detalhes expandem sem erro
- [ ] Filtro por tipo de ação funciona (se disponível)

#### Status:
- **✅ PASS**: Audit trail completo e legível
- **❌ FAIL**: Logs não aparecem ou erro ao expandir
- **⚠️ PARTIAL**: Logs aparecem mas informações incompletas

---

### 7️⃣ KYC (VALIDAÇÃO DE IDENTIDADE)
**Tempo**: ~5 minutos  
**Objetivo**: Validar fluxo de KYC

#### Passos:
1. Acesse `/dashboard/kyc` ou clique em "KYC Status Badge"
2. Se status = "PENDENTE":
   - Clique "Iniciar Verificação"
   - Preencha formulário (CPF, dados pessoais mock)
   - Clique "Enviar"
3. Observe mudança de status para "EM_ANALISE"
4. Aguarde simulação de aprovação (< 10s em dev)
5. Status deve mudar para "APROVADO" ou "REJEITADO"

#### Validações:
- [ ] Página KYC carrega
- [ ] Status badge exibe corretamente
- [ ] Formulário valida entrada (ex: CPF inválido → erro)
- [ ] Submit dispara API call (POST /kyc/submit)
- [ ] Status atualiza após envio
- [ ] Mock de aprovação/rejeição funciona em dev

#### Status:
- **✅ PASS**: KYC flow completo, status atualiza
- **❌ FAIL**: Formulário não valida ou status não muda
- **⚠️ PARTIAL**: Funciona com validações ausentes

---

### 8️⃣ TRATAMENTO DE ERROS
**Tempo**: ~3 minutos  
**Objetivo**: Validar UX de erro

#### Passos:
1. Simule erro deliberadamente:
   - Logout (apague token)
   - Tente acessar `/dashboard` (deve redirecionar para login)
2. Tente login com email inválido → erro visível
3. Tente login com senha incorreta → mensagem amigável
4. Interrompa rede (DevTools → Network → Offline)
5. Tente qualquer ação → mensagem de conexão

#### Validações:
- [ ] Redirecionamento para login quando não autenticado
- [ ] Validação de email no formulário (antes de submit)
- [ ] Erro de "credenciais inválidas" é amigável (não expõe API)
- [ ] Toast/alert aparecem para erros (não console)
- [ ] Modo offline mostra mensagem clara
- [ ] Sem erros não-tratados no console

#### Status:
- **✅ PASS**: Todos os erros tratados com UX clara
- **❌ FAIL**: Erros mostram stack trace ou crash app
- **⚠️ PARTIAL**: Alguns erros tratados, outros não

---

### 9️⃣ PERFORMANCE E CARGA
**Tempo**: ~5 minutos  
**Objetivo**: Validar que app não trava com dados

#### Passos:
1. Abra DevTools → Performance tab
2. Clique "Graváção" (Record)
3. Na dashboard, carregue:
   - Lista com 100+ obras (scroll bottom)
   - Abra filtros avançados
   - Aplique múltiplos filtros
4. Pare gravação
5. Observe métrica (deve ser verde/rápido)

#### Validações:
- [ ] Página inicial carrega em < 1.5s
- [ ] Scroll é suave (60 FPS)
- [ ] Abrir modais é instant (< 200ms)
- [ ] Aplicar filtros: resultado em < 1s
- [ ] Listar 100+ itens sem congelamento
- [ ] Memória não cresce infinitamente (DevTools → Memory)

#### Status:
- **✅ PASS**: Performance excelente, sem lag
- **❌ FAIL**: Page freeze ou lag perceptível
- **⚠️ PARTIAL**: Performance aceitável mas com delays

---

### 🔟 RATE LIMIT E THROTTLING
**Tempo**: ~4 minutos  
**Objetivo**: Validar proteção contra abuso

#### Passos:
1. Abra console do navegador (F12)
2. Execute script para disparar múltiplas requisições:
   ```javascript
   for (let i = 0; i < 20; i++) {
     fetch('/api/obras', { headers: { 'Authorization': 'Bearer ...' } })
   }
   ```
3. Ou faça spam de clicks em botão de ação
4. Observe resposta do servidor

#### Validações:
- [ ] Após ~15 requisições: 429 (Too Many Requests)
- [ ] Mensagem ao usuário: "Muitas tentativas, aguarde X segundos"
- [ ] UI desabilita botões durante throttle
- [ ] Rate limit não afeta outras abas/usuários
- [ ] Após timeout: requisições normalizadas

#### Status:
- **✅ PASS**: Rate limiting funciona, UX clara
- **❌ FAIL**: Sem rate limiting ou app trava
- **⚠️ PARTIAL**: Rate limiting existe mas UX confusa

---

## 📊 RESULTADO FINAL

Preencha após testar todos os 10 cenários:

| Cenário | Status | Notas |
|---------|--------|-------|
| 1. Login | ✅/❌/⚠️ | |
| 2. Dashboard | ✅/❌/⚠️ | |
| 3. Filtros | ✅/❌/⚠️ | |
| 4. Bulk Reject | ✅/❌/⚠️ | |
| 5. Mapa GPS | ✅/❌/⚠️ | |
| 6. Audit Trail | ✅/❌/⚠️ | |
| 7. KYC | ✅/❌/⚠️ | |
| 8. Erros | ✅/❌/⚠️ | |
| 9. Performance | ✅/❌/⚠️ | |
| 10. Rate Limit | ✅/❌/⚠️ | |

---

## ✅/❌ CRITÉRIOS DE APROVAÇÃO

**VERDE (Go para produção)**:
- Mínimo 9/10 cenários com ✅ PASS
- Nenhum ❌ FAIL em cenários críticos (1, 2, 7, 8)

**AMARELO (Correções menores)**:
- 7-8/10 com ✅ PASS
- ⚠️ PARTIAL aceitável apenas em 3, 5, 9, 10
- Requere fix antes de deploy

**VERMELHO (Não homologar)**:
- < 7/10 com ✅ PASS
- ❌ FAIL em qualquer cenário crítico
- Requere investigação e correção

---

## 🐛 ENCONTROU BUG?

Se algum cenário falhar:

1. **Documente** o passo exato que falhou
2. **Reproduza** 2x para confirmar
3. **Capture** screenshot/log do erro
4. **Reporte** em formato:
   ```
   Cenário: [Número e nome]
   Passo: [Qual passo exato falhou]
   Erro: [Mensagem exata ou comportamento]
   Reproduzível: [Sim/Não/Às vezes]
   Screenshot: [Anexe]
   ```
5. **Escalade** para time de dev (não lance para produção)

---

## 📞 CHECKLIST PRÉ-PRODUÇÃO

Antes de declarar sucesso:

- [ ] Todos 10 cenários testados
- [ ] Resultado preenchido acima
- [ ] Nenhum ❌ FAIL em (1, 2, 7, 8)
- [ ] Bugs documentados e escalados
- [ ] CTO/Tech Lead assinou aprovação

---

## 🚀 PRÓXIMOS PASSOS

Se ✅ VERDE:
```
1. Executar health check: ./scripts/cutover-health-check.sh
2. Revisar MONITORING_DASHBOARD_SETUP.md
3. Preparar para cutover em 2026-06-02
```

Se 🟡 AMARELO:
```
1. Time de dev: < 24h de correções
2. Re-testar 3 cenários que falharam
3. Voltar para smoke test
```

Se 🔴 VERMELHO:
```
1. PARAR deployment
2. Investigação imediata
3. Reportar para stakeholders
4. Reagendar cutover
```

---

**Tester**: ________________  
**Data/Hora**: 2026-05-29  
**Assinatura**: ________________  
**Status Final**: 🟢 / 🟡 / 🔴

---

*Gerado para iMobi MVP — Smoke Test Checklist*  
*Válido até: 2026-06-02 23:59 UTC*
