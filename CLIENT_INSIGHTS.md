# 🎯 imbobi — Proposta de Valor para Cliente

**Data:** 27 de Maio de 2026  
**Projeto:** Fintech de Crédito para Construção Civil

---

## **DIFERENCIAL COMPETITIVO**

### **1. Score de Construtibilidade (0-1000)** ⭐⭐⭐
**Por que é inteligente:**
- Não é apenas score de crédito tradicional
- Usa 6 fatores específicos para construção:
  - Obras completadas
  - Taxa de conclusão
  - Pagamentos em dia
  - Tempo como cliente
  - Documentação KYC
  - Histórico de evidências

**Pitch:** *"Você não é apenas um número. Seu histórico de obras reais determina seu crédito"*

---

### **2. Validação Tripla: GPS Digital + Engenheiros Presenciais + Parceiros Regionais** 🗺️⭐⭐⭐⭐
**Por que é inteligente:**

**Camada 1 - Digital (Rápida):**
- GPS validation dual-layer (cliente + server PostGIS)
- Raio de 15m máximo = precisão de obra
- Validação em tempo real sem sair de casa
- Ideal para créditos pequenos (<R$50k)

**Camada 2 - Engenheiros Próprios (Confiável):**
- Time de engenheiros certificados
- Visitas presenciais para obras críticas
- Validação de estrutura real (fundação, alvenaria, etc)
- Aprova/nega com expertise técnica
- Ideal para créditos médios (R$50k-500k)

**Camada 3 - Parceiros Regionais (Ágil):**
- Cobertura nacional via parcerias locais
- Atendimento de urgências em 24h
- Validação in loco quando necessário
- Ideal para créditos grandes (>R$500k) e urgências

**Modelo de Risco Escalonado:**
```
Crédito < R$50k    → GPS digital (rápido, 1-2h)
Crédito R$50-500k  → GPS + engenheiro presencial (2-3 dias)
Crédito > R$500k   → GPS + engenheiro + parceiro regional (3-5 dias)
Urgências          → Parceiro regional 24h (mesma região)
```

**Pitch:** *"Sua obra é validada 3x: GPS digital (rápido), engenheiro presencial (expertise), parceiro regional (sempre perto). Zero risco, máxima velocidade."*

---

### **3. Workflow de 9 Etapas Automatizadas** 🏗️⭐⭐
**Por que é inteligente:**
- Auto-geração de etapas (não manual)
- Status tracking em tempo real
- Manager approval workflow (gestor tem controle)
- Cada etapa pode desbloquear parcela do crédito
- Coordena com validações presenciais (eng. aprova etapa = libera parcela)

**Pitch:** *"Obra progride automaticamente. Cada etapa aprovada (digital + presencial) = parcela liberada"*

---

### **4. Liberação de Crédito Assíncrona via BullMQ** 💰⭐⭐
**Por que é inteligente:**
- Não bloqueia quando aprova
- Processamento confiável (fila garantida)
- Notificação email + push quando libera
- Pode processar em background mesmo com alta carga
- Integra validações digitais + presenciais

**Pitch:** *"Aprovação instantânea. Liberação garantida sem esperar"*

---

### **5. Simulador de Crédito em Tempo Real** 📊⭐⭐
**Por que é inteligente:**
- Taxa fixa de 0.99% mensal (transparência)
- Simula com termos reais (6-60 meses)
- Mostra cronograma de pagamentos
- Sem surpresas
- Usa score real do cliente

**Pitch:** *"Veja exatamente quanto vai pagar. Sem letra pequena"*

---

### **6. KYC Workflow com Aprovação** 🔐⭐⭐
**Por que é inteligente:**
- Documentos obrigatórios (RG + Selfie)
- Validação por gestor (não automática)
- Notificação quando aprovado/rejeitado
- Protege ambos lados (você + banca)
- Coordena com validações presenciais

**Pitch:** *"Aprovação rápida. Segurança real"*

---

### **7. Dashboard Manager (Gestor em Tempo Real)** 👨‍💼⭐⭐⭐
**Por que é inteligente:**
- Gestor aprova documentos KYC + etapas em um lugar
- Fila de pendências visível
- Decisão rápida = crédito liberado rápido
- Sem gargalo operacional
- Integra validações digitais + presenciais do eng.

**Pitch:** *"Seu gestor aprova em minutos. Não em dias"*

---

### **8. Email + Push Notifications** 📬⭐⭐
**Por que é inteligente:**
- Cliente nunca fica sem saber status
- Template de emails profissionais
- Firebase push (mobile real-time)
- Integrado em todos os eventos:
  - Aprovação KYC
  - Rejeição
  - Liberação de parcela
  - Visita de engenheiro agendada
  - Conclusão de validação presencial

**Pitch:** *"Você fica sabendo na hora. Email + notificação no celular"*

---

### **9. Acompanhamento Técnico Inteligente para Evolução** 🚀⭐⭐⭐⭐
**Por que é inteligente:**
- **Validação Presencial + Educação:**
  - Engenheiro não só aprova/nega, ele deixa relatório técnico
  - Identifica gargalos na obra (cronograma atrasado, qualidade)
  - Recomendações para acelerar próximas etapas
  - Feedback específico: "Revestimento está 15 dias atrasado, mas qualidade OK"

- **Score Dinâmico que Evolui:**
  - Cliente vê seu score subindo conforme melhora histórico
  - Próximas obras = condições melhores (taxa menor ou limite maior)
  - Gamificação de melhoria contínua

- **Dashboard de Performance da Obra:**
  - Comparação com outras obras na região
  - Benchmarks: "Sua obra está 10% mais rápida que média regional"
  - Tendências: "Suas etapas estão 20% mais ágeis que 6 meses atrás"

- **Mentoria Técnica via Sistema:**
  - Engenheiro deixa observações estruturadas
  - Cliente aprende com feedback de especialista
  - Próximas obras = execução mais eficiente
  - Menos retrabalho = menos risco = score melhor

- **Relatórios Inteligentes:**
  - Relatório de visita: estrutura, prazo, qualidade, riscos
  - Sugestões de otimização (material, sequência, segurança)
  - Histórico consolidado (evolução em 12 meses)
  - Compartilha com subcontratados (transparência)

**Pitch:** *"Não é só crédito. Você aprende a executar melhor a cada obra. Nossos engenheiros deixam feedback técnico que melhora sua próxima obra. Sua score sobe, a taxa fica melhor, o risco diminui."*

**Valor Tangível:**
- Construtor 1 obra/ano → com mentoria, faz 1.2 obras/ano (20% mais eficiente)
- Score sobe → taxa 0.99% cai para 0.79% na próxima obra
- Economia acumulada em 5 anos: 20-30% em custos totais

---

---

## **🎬 PITCH DE ELEVATOR (90 seg)**

> *"imbobi é um crédito inteligente para construção com validação tripla.*
> 
> *Você simula online, a gente valida suas obras com GPS (rápido), engenheiro presencial (expertise), e parceiros regionais (sempre perto).*
> 
> *Aprova em minutos, libera conforme você avança nas etapas. Taxa fixa 0.99%, sem surpresa, tudo no celular.*
> 
> *Mas o diferencial é: nossos engenheiros não só aprovam, eles deixam feedback técnico para sua próxima obra ser 20% mais rápida.*
> 
> *Seu score sobe, a taxa fica melhor. É crédito + mentoria + evolução.*
> 
> *Pequeno crédito? Só GPS, em 1-2h. Grande crédito? Engenheiro + parceiro regional, em 3-5 dias. Urgência? 24h na sua região."*

---

## **DIFERENCIADORES vs COMPETIDORES**

| Aspecto | Competitors | **imbobi** |
|---------|-------------|-----------|
| **Validação** | Automática (risco alto) | Tripla: Digital + Eng. + Regional |
| **Velocidade** | 5-10 dias | 1h-5 dias (escalonado) |
| **Taxa** | Variável (até 2-3%) | Fixa 0.99% |
| **Score** | Genérico | Específico para construção |
| **Etapas** | Crédito tudo de uma vez | Liberação por etapa (menor risco) |
| **Suporte** | Call center | Engenheiro presencial + parceiros |
| **Transparência** | Escondida | Simulador ao vivo, cronograma claro |
| **🆕 Mentoria** | Nenhuma | Feedback técnico + evolução de score |
| **🆕 Educação** | Nenhuma | Relatórios inteligentes + benchmarks |
| **🆕 Valor Adicional** | Nenhum | Cliente melhora, taxa melhora, ambos ganham |

---

## **🎯 PROPOSTA ÚNICA: Fintech + Mentoria + Evolução**

**O que diferencia imbobi não é só validar crédito. É:**

1. **Validação Inteligente** → Aprova/nega com expertise de engenheiro
2. **Acompanhamento Técnico** → Feedback que melhora próxima obra
3. **Score Dinâmico** → Cliente melhora continuamente
4. **Ganho Compartilhado** → Cliente executa melhor → menor risco → taxa melhor

**Competidor tradicional:** "Você pega crédito, a gente tira 2% de taxa, next!"

**imbobi:** "Você pega crédito, a gente valida com eng., deixa feedback, seu score sobe, próxima obra tem taxa melhor. Ambos ganham."

---

---

## **CASOS DE USO PRINCIPAIS**

### **1. Construtor Individual** 👷
- Precisa de R$30k para material da obra
- GPS digital valida em 1-2h
- Taxa 0.99% mensal é competitiva
- Cronograma pequeno (6-12 meses)

### **2. Empreiteiro** 👷‍♂️
- Quer financiar fase da obra (R$100k-300k)
- Engenheiro presencial valida fundação/alvenaria
- Liberação por etapa acompanha progresso real
- Parceria de risco compartilhado

### **3. Pequena Construtora** 🏢
- Precisa de fluxo de caixa (R$500k+)
- Validação completa (digital + eng. + parceiro)
- Dashboard gestor integrado com administração
- Notificações em tempo real para planejamento

### **4. Urgências** 🚨
- Faltou material, precisa terminar fase
- Parceiro regional aprova em 24h presencialmente
- Financiamento rápido sem burocracia

---

## **PROPOSTA ECONÓMICA**

**Para o Cliente:**
- ✅ Taxa fixa 0.99% (1/3 do mercado tradicional)
- ✅ Aprovação rápida (1h-5 dias vs 10+ dias)
- ✅ Sem surpresas (simulador transparente)
- ✅ Risco compartilhado (validação tripla)

**Para a Plataforma (imbobi):**
- ✅ Validação tripla = risco reduzido
- ✅ Taxa 0.99% com volume compensa taxa de eng./parceiros
- ✅ Menos inadimplência (validações rigorosas)
- ✅ Escalável (digital + regional)

---

## **ROADMAP PRÓXIMOS 90 DIAS**

### **Fase 1 (Semana 1-2)** ✅ CONCLUÍDO
- [x] Manager Dashboard (operação)
- [x] SMTP Real (notificações)
- [x] TypeScript Strict (confiabilidade)
- [x] Rate Limiting (segurança)

### **Fase 2 (Semana 3)** ⏳ CONCLUÍDO
- [x] Unit Tests (70%+ coverage)
- [x] Performance Audit (N+1 queries, caching)

### **Fase 3 (Semana 4)** 🔜
- [ ] Security Audit Completo (OWASP)
- [ ] Mobile Feature Parity (iOS/Android)

### **Fase 4 (Semana 5-6)** 🔜
- [ ] Integração com sistema de parceiros regionais
- [ ] Agendamento de visitas (eng. presencial)
- [ ] Workflow de aprovação multi-layer
- [ ] Reports de performance (eng./parceiros)

### **Fase 5 (Semana 7-8)** 🔜
- [ ] Go-live com primeiros clientes piloto
- [ ] Onboarding de parceiros regionais
- [ ] Monitoring de performance em produção

---

## **PERGUNTAS PARA CLIENTE**

1. **Qual é seu volume esperado de créditos nos primeiros 6 meses?**
2. **Qual é a distribuição geográfica? (qual estado começa?)**
3. **Você tem parceiros/engenheiros próprios já, ou criamos rede?**
4. **Qual taxa de aprovação esperada? (qual % vai para eng. presencial?)**
5. **Precisa de integração com ERP/sistema contábil?**

---

**Contato:** contato.vinicaetano93@gmail.com  
**Projeto:** imbobi (github.com/contatovinicaetano93-commits/alagami-site)
