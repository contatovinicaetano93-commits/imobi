# 🤔 Perguntas de Contexto para Refinar o Roadmap

Para priorizar melhor as melhorias e garantir que o roadmap alinha com seus objetivos, preciso esclarecer alguns pontos:

---

## 📊 **Status & Timeline**

1. **Quando o projeto vai para produção?**
   - [ ] Já está em produção?
   - [ ] Beta/staging?
   - [ ] Ainda em desenvolvimento?
   - [ ] Data alvo? ___________

2. **Quantos usuários reais estão usando?**
   - [ ] 0 (development)
   - [ ] < 10 (friends/family)
   - [ ] 10-100 (beta)
   - [ ] > 100 (early access)
   - [ ] Atual: ___________

3. **Qual é o maior risco/problema AGORA?**
   - [ ] Performance issues
   - [ ] Security concerns
   - [ ] Feature incompleteness
   - [ ] Stability/crashes
   - [ ] Data integrity
   - [ ] Outro: ___________

---

## 🎯 **Prioridades & Trade-offs**

4. **Qual é a prioridade: Velocity ou Stability?**
   - [ ] Lançar features rápido (aceita tech debt)
   - [ ] Estabilidade & qualidade (mais lento mas confiável)
   - [ ] Equilibrium (preciso dos dois)

5. **Recursos disponíveis:**
   - [ ] Qual é o tamanho do time? ___________
   - [ ] Quantas pessoas? Backend ___ / Frontend ___ / Mobile ___
   - [ ] Quantas horas/semana cada um tem? ___________

6. **Qual fase do roadmap faz mais sentido começar?**
   - [ ] **Fase 1 (Foundation)**: Tests, Security, Database (2 semanas) — RECOMENDADO
   - [ ] **Fase 2 (Quality)**: Lint, Performance, Docs (2-3 semanas)
   - [ ] **Fase 3 (Operations)**: Monitoring, CI/CD, Deployment (2-3 semanas)
   - [ ] **Todos em paralelo** (precisa mais resources)

---

## 🔒 **Requisitos de Compliance & Segurança**

7. **Regulamentações que precisam ser atendidas?**
   - [ ] LGPD (Lei Geral de Proteção de Dados)
   - [ ] PCI DSS (se processando cartão)
   - [ ] BACEN (Banco Central - se é instituição financeira)
   - [ ] Nenhuma (MVP apenas)
   - [ ] Outra: ___________

8. **Dados sensíveis que precisam proteção extra:**
   - [ ] Documentos (RG, CPF) — Sim/Não
   - [ ] Dados bancários — Sim/Não
   - [ ] Localização GPS — Sim/Não
   - [ ] Fotos de obra — Sim/Não
   - [ ] Histórico de crédito — Sim/Não

9. **Auditoria/Compliance já fez review?**
   - [ ] Nunca
   - [ ] Uma vez (qual área?) ___________
   - [ ] Regularmente

---

## 📱 **Arquitetura & Tech Decisions**

10. **Qual é a visão long-term da arquitetura?**
    - [ ] Monorepo para sempre
    - [ ] Eventualmente separar web/mobile/api
    - [ ] Ainda não decidido
    - [ ] Context: ___________

11. **Qual é a estratégia de mobile?**
    - [ ] iOS + Android (Expo/RN)
    - [ ] Apenas web (mobile-responsive)
    - [ ] Web primeiro, mobile depois
    - [ ] Outra: ___________

12. **Dados em real-time são necessários?**
    - [ ] Não, polling é ok
    - [ ] Sim, WebSockets necessários
    - [ ] Partial (algumas features sim, outras não)

13. **Há integrações externas críticas?**
    - [ ] S3 (storage) — Essencial?
    - [ ] Email service — Essencial?
    - [ ] Pagamento (Stripe, etc) — Planejado?
    - [ ] SMS/WhatsApp — Planejado?
    - [ ] Banco de dados externo — Planejado?

---

## 💰 **Performance & SLAs**

14. **Performance targets:**
    - [ ] Não tenho (desenvolvimento)
    - [ ] FCP < 2s, LCP < 2.5s (web)
    - [ ] App startup < 3s (mobile)
    - [ ] API response < 200ms (p95)
    - [ ] Outra: ___________

15. **Uptime SLA esperado:**
    - [ ] Não (development)
    - [ ] 95% (enterprise acceptable)
    - [ ] 99% (mission critical)
    - [ ] 99.9% (high-reliability)

---

## 🧠 **Domínio & Conhecimento**

16. **Qual é seu nível de expertise no domínio (imobi/crédito)?**
    - [ ] Sou especialista (lending)
    - [ ] Entendo bem as regras
    - [ ] Básico, preciso aprender
    - [ ] Praticamente nada

17. **Há validações/regras específicas que não estão código?**
    - [ ] Sim, muitas! Precisamos documentar
    - [ ] Algumas, vou listar
    - [ ] Todas já estão em Zod schemas
    - [ ] Contexto: ___________

18. **Qual é o maior risk técnico não resolvido?**
    - [ ] GPS validation (PostGIS)
    - [ ] Batch processing (etapas/KYC)
    - [ ] Email reliability
    - [ ] Payment/liberação de parcelas
    - [ ] Outro: ___________

---

## 📈 **Métricas & Monitoring**

19. **O que você mais quer medir/monitorar?**
    - [ ] User signup/activation
    - [ ] Feature adoption
    - [ ] Error rates
    - [ ] Performance (latency)
    - [ ] Security incidents
    - [ ] Outro: ___________

20. **Já tem experiência com:**
    - [ ] Error tracking (Sentry)
    - [ ] APM (Datadog, New Relic)
    - [ ] Analytics (Mixpanel, Amplitude)
    - [ ] Nenhum, preciso setup

---

## 🎓 **Conhecimento do Time**

21. **Qual é seu background técnico?**
    - [ ] Full-stack (confortável em tudo)
    - [ ] Focado em backend
    - [ ] Focado em frontend
    - [ ] Focado em mobile
    - [ ] DevOps/Infrastructure
    - [ ] Product/Tech Lead

22. **Qual era sua pior dor no desenvolvimento até agora?**
    - [ ] Falta de testes
    - [ ] Latência do GPS validation
    - [ ] N+1 queries (que corrigimos!)
    - [ ] Falta de documentação
    - [ ] Deploy/DevOps
    - [ ] Outra: ___________

---

## 📋 **Próximos Passos Sugeridos**

**Baseado nas respostas acima, vou:**

1. ✅ Criar plano detalhado de testes
2. ✅ Listar security checks específicos
3. ✅ Definir performance baselines
4. ✅ Criar checklist de compliance (se aplicável)
5. ✅ Identificar documentação prioritária
6. ✅ Mapear dependências do roadmap

---

## 💬 **Como Responder**

Você pode:
- **Opção A**: Responder apenas as perguntas mais importantes (14, 4, 6, 18)
- **Opção B**: Responder tudo (leva ~15 min, melhor priorização)
- **Opção C**: Responder conforme trabalha (iterativo)

**Recomendação**: Responda **Opção A** agora, depois vamos detalhar conforme progredimos.
