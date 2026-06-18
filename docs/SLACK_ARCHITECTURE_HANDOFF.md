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
- RBAC centralizado em `@imbobi/schemas`:
  - normalizacao de roles e alias `GESTOR_FUNDO`;
  - labels e homes por perfil;
  - grupos `manager`, `borrower`, `engineering`, `commercial`, `works`;
  - regras de rotas web e tabs mobile;
  - helpers `roleCanAccess`, `roleCanAccessFeature`, `roleCanAccessMobileTab`.
- Web/API mantem wrappers de compatibilidade, mas delegam para `@imbobi/schemas`.
- Mobile passa a salvar role normalizado no login, escolher home por perfil, ocultar tabs sem
  permissao e bloquear acesso direto a Obras/Credito quando o perfil nao permite.

## Próximos ajustes recomendados

1. Adicionar matriz de testes RBAC para os 5 perfis canônicos.
2. Decidir regra de produto para `COMERCIAL` vs `PARCEIRO`: mesma experiência ou
   painéis separados.
3. Definir se `GESTOR_OBRA` será mantido como alias de engenharia ou migrado para
   `ENGENHEIRO`.
4. Expandir telas mobile especificas para Gestor/Engenheiro/Comercial; hoje o RBAC protege
   o acesso, mas a experiencia mobile completa ainda existe principalmente para Tomador/Obras.
5. Considerar mover menus web/mobile para descritores compartilhados quando as telas estiverem
   mais estaveis.
