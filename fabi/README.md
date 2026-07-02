# FFB — Fabiani Fatel Barbosa · Site institucional

Site de página única (one-page) para a consultoria da Fabiani: consultoria empresarial,
perícia contábil/financeira/trabalhista, advisory para executivos e projetos sob medida.

**Projeto independente** — não usa nada do restante do repositório (Imobi).
É HTML/CSS/JS puro, sem build, sem dependências.

```
fabi/
├── index.html   # todo o site (conteúdo + estilo + interações)
├── fonts/       # fontes auto-hospedadas (Fraunces, Archivo, IBM Plex Mono)
└── README.md
```

## Como visualizar localmente

Basta abrir `index.html` no navegador, ou:

```bash
npx serve fabi/
```

## Como publicar

Qualquer hospedagem de site estático funciona (Vercel, Netlify, Cloudflare Pages,
GitHub Pages). Na Vercel: importar o repositório e apontar o *root directory* para `fabi/`.

## O que falta preencher (marcado no HTML)

| Onde | O quê |
| --- | --- |
| Seção **3.0 Quem sou** | Anos de experiência, formação, empresas/setores e registros (CRC etc.) — itens entre `[colchetes]` |
| Seção **3.0 Quem sou** | Foto profissional (hoje há um bloco reservado com o monograma "F.") |
| Seção **4.0 Contato** | E-mail profissional definitivo, número de WhatsApp real e URL do LinkedIn |
| Geral | Nome/marca da empresa, caso não seja "FFB" |

## Identidade visual

- Conceito: **plano de contas / papel de razão contábil** — seções numeradas como contas
  (1.0 Atuação, 2.0 Perícia…), linhas pautadas e conectores pontilhados.
- Cores: verde-razão `#1d4438`, papel `#fbfaf5`, bronze `#a0742c`, tinta `#1a2420`.
- Tipografia: Fraunces (títulos), Archivo (texto), IBM Plex Mono (códigos e números).
