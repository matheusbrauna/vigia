# Vigia

Alarme open source que avisa quando uma ferramenta de IA volta a treinar com as suas conversas.

## Stack

- **WXT** (Chrome Extension Manifest V3)
- **TypeScript**
- **Svelte 5**
- **Vitest** (testes com fixtures)

## Como rodar

```bash
pnpm install
pnpm dev       # carrega no Chrome em modo desenvolvimento
```

Depois abra `chrome://extensions`, ative o modo desenvolvedor e carregue a pasta `.output/chrome-mv3`.

```bash
pnpm typecheck
pnpm test
pnpm build
```

## MVP atual

- Estrutura base com background (alarms + notifications)
- Detector do ChatGPT lê `settings.training_allowed` em `GET /backend-api/settings/user`
- Popup Svelte que lista status
- Storage local para logs e preferências
- Permissões opcionais por host

## Próximos passos

1. Adicionar Claude, Perplexity, Gemini, Grok
2. Página de opções completa
3. Ícones finais e publicação

## Permissões

Só `storage`, `alarms`, `notifications` + host permissions **opcionais** por serviço. Nenhum `<all_urls>`.
