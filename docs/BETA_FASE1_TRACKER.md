## Objetivo

Tracker da **Fase 1 — Soft launch beta** (passos 1–50). Marque cada item ao concluir.

**Gate de saída:** 3 tomadores completaram KYC → obra **ou** crédito solicitado.

**Comandos:** `pnpm beta:invite` · `pnpm check:staging` · `pnpm test:e2e:staging`

---

## Convites e primeiros logins (1–5)

- [x] 1. Enviar convites (`pnpm beta:invite`) aos 3 tomadores
- [x] 2. Enviar credenciais por canal seguro (WhatsApp)
- [ ] 3. Login tomador beta #1 e screenshot do KYC
- [ ] 4. Login tomador beta #2
- [ ] 5. Login tomador beta #3

## Fluxo KYC (6–10)

- [ ] 6. Admin aprova/rejeita 1º documento KYC (`admin@imobi.com.br` → `/dashboard/gestor/kyc`)
- [ ] 7. Validar notificação ao tomador (se ativa)
- [ ] 8. Tomador completa 4 documentos KYC
- [ ] 9. Admin aprova KYC completo
- [ ] 10. Tomador vê jornada avançar para "obra"

## Obra e crédito (11–17)

- [ ] 11. Cadastrar 1ª obra real (beta)
- [ ] 12. Gestor vê obra na fila
- [ ] 13. Solicitar crédito vinculado à obra
- [ ] 14. Simulador → pedido de crédito
- [ ] 15. Gestor analisa etapa "Estrutura"
- [ ] 16. Engenheiro/vistoria em staging
- [ ] 17. Aprovar etapa e ver redirect

## Ops e qualidade (18–29)

- [ ] 18. Checklist diário smoke (`pnpm check:staging`)
- [ ] 19. E2E completo semanal (`pnpm test:e2e:staging`)
- [ ] 20. Monitorar CI no GitHub
- [ ] 21. Monitorar cold start Render
- [ ] 22. Documentar bugs beta em issues (template **Bug Beta**)
- [ ] 23. Priorizar P0/P1/P2
- [ ] 24. Fix P0 em <24h
- [ ] 25. Re-seed staging se dados corrompidos
- [ ] 26. `pnpm seed:staging:obra` após reset
- [ ] 27. Rotacionar senha do setup antigo
- [ ] 28. Confirmar `SEED_*_PASSWORD` no Render
- [ ] 29. Validar `SETUP_SECRET` no staging

## Validação UX e perfis (30–40)

- [ ] 30. Testar cadastro novo usuário (`/cadastro`)
- [ ] 31. Testar esqueci senha
- [ ] 32. Testar logout em todos os perfis
- [ ] 33. Gestor: fila KYC zerada → etapas
- [ ] 34. Gestor: fila etapas zerada → "fila zerada"
- [ ] 35. Tomador: estado "aguardando análise"
- [ ] 36. Tomador: estado "acompanhar" com crédito ativo
- [ ] 37. WhatsApp suporte testado
- [ ] 38. Feedback call com beta #1
- [ ] 39. Feedback call com beta #2
- [ ] 40. Feedback call com beta #3

## Consolidação e gate (41–50)

- [ ] 41. Consolidar feedback em doc interno
- [ ] 42. Ajustar copy da jornada (titulo/descrição)
- [ ] 43. Ajustar textos KYC se confusos
- [ ] 44. Medir tempo médio KYC → aprovação
- [ ] 45. Medir taxa de abandono no passo KYC
- [ ] 46. Decidir se amplia beta (+5 tomadores)
- [ ] 47. `pnpm seed:staging:beta-tomadores` para mais contas
- [ ] 48. Treinar gestor no painel (`/dashboard/gestor`)
- [ ] 49. Treinar engenheiro em vistoria
- [ ] 50. **Gate:** 3 tomadores completaram KYC → obra OU crédito solicitado
