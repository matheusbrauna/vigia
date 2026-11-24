# Vigia

Chrome extension (Manifest V3) that reads ChatGPT and Claude model-training settings from the signed-in browser session, stores each check locally, and notifies you when a check reports that setting on.

> **Status:** Version 0.1.0. This repository includes no Chrome Web Store listing.

## Why

ChatGPT exposes "Improve the model for everyone" as `settings.training_allowed`. Claude exposes "Help Improve our AI models" as `settings.grove_enabled` on the consumer account. Vigia reads those flags on a schedule, appends every check to local storage, and notifies you when a check reports training on.

## Current status

- Background service worker (`src/entrypoints/background.ts`) uses Chrome `alarms` and `notifications`. The alarm name is `vigia-check`. The default period is 360 minutes. Periods below 30 minutes are raised to 30, and a non-numeric period falls back to 360.
- ChatGPT and Claude are the registered detectors (`src/detectors/index.ts`). Each runs when its id is in `enabledServices`. The default list is `chatgpt` and `claude`. A `vigia_prefs` value saved before Claude was registered (`servicesRevision` absent or below 2) gains `claude` on read. Once `servicesRevision` is 2, the stored list is kept as written. Without the service's optional host permission, that check returns `unknown` and does not call the service.
- The ChatGPT detector's only network calls are two credentialed reads:
  - `GET https://chatgpt.com/api/auth/session` — a non-empty string `accessToken` means signed in. An empty session, HTTP 401, or HTTP 403 is `not-logged-in`.
  - `GET https://chatgpt.com/backend-api/settings/user` with `Authorization: Bearer <accessToken>` — the parsed field is `settings.training_allowed`. `true` is `on`, `false` is `off`, and any other shape is `unknown`.
- The access token stays in memory for that settings request and is cleared afterward. It is not stored.
- The Claude detector's only network call is one credentialed read:
  - `GET https://claude.ai/api/account` — the parsed field is `settings.grove_enabled`, the consumer "Help Improve our AI models" choice (the same field Claude Code reads from `GET /api/oauth/account/settings`). `true` is `on`, `false` is `off`, `null` means no choice is stored and is `unknown`, and any other shape is `unknown`. Team, Enterprise, and API training use other controls and stay `unknown` when this field is not a boolean.
- The session cookie stays in the browser. The detector does not read it, and it does not store the rest of the account payload. It never writes the setting.
- Svelte 5 popup shows the status from a `CHECK_NOW` message. When an enabled service's host permission is missing, the popup shows a button that requests that origin.
- Options page (`options.html`, Chrome's options UI with `open_in_tab` false) saves `checkIntervalMinutes`. It leaves enabled services and desired status unchanged. When those fields are unset, the defaults are `chatgpt` and `claude`, and `off`. The page says those controls are still to come.
- `chrome.storage.local` keeps `vigia_logs` (newest first, 500 entries) and `vigia_prefs`.
- Vitest covers the ChatGPT session and settings fixtures in `src/tests/fixtures/chatgpt/`, the Claude account fixtures in `src/tests/fixtures/claude/`, plus the interval, log-trim, and desired-status helpers.

A notification is created when the check status is `on` and that status differs from the desired status. With the default desired status of `off`, every check that reads training on notifies again. Clicking the notification opens that detector's settings page: `https://chatgpt.com/settings/data-controls` or `https://claude.ai/settings/data-privacy-controls`.

`src/detectors/index.ts` names Perplexity, Gemini, and Grok as later detectors. They are not registered.

## Privacy and permissions

The production manifest (`pnpm build`) requests:

- `storage` — logs and preferences in `chrome.storage.local` on this browser
- `alarms` — the periodic check
- `notifications` — the training-on alert

Optional host permissions, with no required host permissions and no `<all_urls>`:

- `https://chatgpt.com/*` — requested from the popup
- `https://claude.ai/*` — requested from the popup
- `https://www.perplexity.ai/*`
- `https://myactivity.google.com/*`
- `https://x.com/*`

The other three origins are declared and unused. Toolbar and notification icons are the PNGs in `public/icon/` (16, 32, 48, and 128).

`pnpm dev` adds `tabs`, `scripting`, and `http://localhost/*` so the dev server can reload the extension. Those entries are part of the development manifest only.

## Stack

- **WXT** 0.21 (Manifest V3, Chrome by default)
- **TypeScript**
- **Svelte 5**
- **Vitest**

## Local development

Requires Node.js >= 22 and pnpm. `packageManager` is `pnpm@10.33.4`.

```bash
pnpm install
pnpm dev
```

`pnpm dev` runs `wxt` and writes the Chrome development build to `.output/chrome-mv3-dev`. Leave that command running, then load `.output/chrome-mv3-dev` from `chrome://extensions` with **Developer mode** enabled. The dev popup and options page load their scripts from that process.

```bash
pnpm typecheck
pnpm test
pnpm build
```

- `pnpm typecheck` runs `wxt prepare && tsc --noEmit`
- `pnpm test` runs `vitest run`
- `pnpm build` runs `wxt build` and writes `.output/chrome-mv3`
