# IMOBI - Handoff de perfis, Slack e arquitetura

Este documento resume o alinhamento operacional para continuar o trabalho pelo
Cursor/Slack e pelo notebook sem reabrir os anexos externos.

## Perfis do plano

O produto trabalha com 5 perfis de negócio:

| Perfil do plano | Tipo canônico no sistema | Observação |
| --- | --- | --- |
| Tomador | `TOMADOR` | Cliente que simula crédito, cria obra e envia evidências. |
| Admin | `ADMIN` | Administração interna e operações sensíveis. |
| Gestor do Fundo | `GESTOR` | Perfil único de gestão do fundo; `GESTOR_FUNDO` é alias legado normalizado para `GESTOR`. |
| Engenheiro | `ENGENHEIRO` | Vistoria, evidências e validação de obra. |
| Comercial parceiro | `COMERCIAL` | Funil comercial; `PARCEIRO` compartilha APIs comerciais/parceiros por compatibilidade. |

Aliases que ainda existem no enum e devem ser tratados com cuidado:

- `GESTOR_FUNDO`: legado, normalizar para `GESTOR`.
- `GESTOR_OBRA`: compatibilidade histórica, atualmente tratado como acesso de engenharia na web/API.
- `CONSTRUTOR`: compatibilidade histórica para fluxo de tomador/construtor.
- `PARCEIRO`: compatibilidade para canal comercial/parceiro.

Evite remover ou renomear esses aliases sem migration de dados e auditoria de JWT,
seeds, middleware web, guards da API e testes.

## Escopo seguro do Cursor no Slack

O Slack deve atuar como camada operacional/triagem:

- smoke test de health API, Vercel e simulador mobile;
- monitoramento de deploy e wake da API Render quando houver 503 transitório;
- hotfix de copy/CSS de um arquivo;
- triagem de bug com passos, URL, horário e screenshot;
- checklist de arquivos alterados antes de merge humano.

Não usar Slack para:

- refactor multi-arquivo;
- migrations, Terraform, AWS ou secrets;
- integrações grandes entre simulador/API;
- merges com conflito ou decisão de arquitetura.

Se a mudança tocar mais de 3 arquivos ou alterar contrato de API/DB, escalar para
Cursor Pro desktop/Claude.

## Ajustes de arquitetura aplicados neste PR

- `PARCEIRO` passa a acessar `ComercialController`, alinhando API com
  `/dashboard/comercial`.
- `GESTOR_OBRA` passa a acessar endpoints de engenharia/vistoria/evidência, alinhando
  API com `/dashboard/engenheiro`.
- `GESTOR_OBRA` passa a ser privilegiado na atualização de status de etapa.
- `due-diligence` passa a exigir `GESTOR` ou `ADMIN` para criar/listar/buscar, mantendo
  mudança de status restrita a `ADMIN`.
- Fixtures E2E agora usam contas canônicas do seed: `tomador@test.com`,
  `fundo@test.com`, `engenheiro@test.com`, `comercial@test.com`.

## Próximos ajustes recomendados

1. Mover normalização de roles para `@imbobi/schemas` ou `@imbobi/core` para evitar
   duplicação entre API e web.
2. Decidir regra de produto para `COMERCIAL` vs `PARCEIRO`: mesma experiência ou
   painéis separados.
3. Definir se `GESTOR_OBRA` será mantido como alias de engenharia ou migrado para
   `ENGENHEIRO`.
4. Adicionar matriz de testes RBAC para os 5 perfis canônicos.
5. Revisar mobile: hoje o app ainda não aplica RBAC por perfil como a web.
