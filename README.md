# Vigia

Chrome extension (Manifest V3) that reads ChatGPT, Claude, and Perplexity model-training settings from the signed-in browser session, stores each check locally, and notifies you when a check reports that setting on.

> **Status:** Version 0.1.0. This repository includes no Chrome Web Store listing.

## Why

ChatGPT exposes "Improve the model for everyone" as `settings.training_allowed`. Claude exposes "Help Improve our AI models" as `settings.grove_enabled` on the consumer account. Perplexity exposes "AI data retention" as `disable_training`, inverted: `false` means retention is on. Vigia reads those flags on a schedule, appends every check to local storage, and notifies you when a check reports training on.

## Current status

- Background service worker (`src/entrypoints/background.ts`) uses Chrome `alarms` and `notifications`. The alarm name is `vigia-check`. The default period is 360 minutes. Periods below 30 minutes are raised to 30, and a non-numeric period falls back to 360.
- ChatGPT, Claude, and Perplexity are the registered detectors (`src/detectors/index.ts`). Each runs when its id is in `enabledServices`. The default list is `chatgpt`, `claude`, and `perplexity`. A `vigia_prefs` value saved before a detector joined the default list gains that id on read: revision 1 (or a missing revision) gains `claude` and `perplexity`, and revision 2 gains `perplexity`. Once `servicesRevision` is 3, the stored list is kept as written. Without the service's optional host permission, that check returns `unknown` and does not call the service.
- The ChatGPT detector's only network calls are two credentialed reads:
  - `GET https://chatgpt.com/api/auth/session` — a non-empty string `accessToken` means signed in. An empty session, HTTP 401, or HTTP 403 is `not-logged-in`.
  - `GET https://chatgpt.com/backend-api/settings/user` with `Authorization: Bearer <accessToken>` — the parsed field is `settings.training_allowed`. `true` is `on`, `false` is `off`, and any other shape is `unknown`.
- The access token stays in memory for that settings request and is cleared afterward. It is not stored.
- The Claude detector's only network call is one credentialed read:
  - `GET https://claude.ai/api/account` — the parsed field is `settings.grove_enabled`, the consumer "Help Improve our AI models" choice (the same field Claude Code reads from `GET /api/oauth/account/settings`). `true` is `on`, `false` is `off`, `null` means no choice is stored and is `unknown`, and any other shape is `unknown`. Team, Enterprise, and API training use other controls and stay `unknown` when this field is not a boolean.
- The session cookie stays in the browser. The Claude detector does not read it, and it does not store the rest of the account payload. It never writes the setting.
- The Perplexity detector's only network calls are two credentialed reads:
  - `GET https://www.perplexity.ai/api/auth/session?version=2.18&source=default` — a `user.id` string of letters, digits, `_`, or `-` means signed in. An empty session, a null user, HTTP 401, or HTTP 403 is `not-logged-in`. Any other user shape is `unknown`.
  - `GET https://www.perplexity.ai/rest/user/settings?skip_connector_picker_credentials=true&version=2.18&source=default` with `x-pplx-account` set to that id — the parsed field is `disable_training`. `false` is `on` (AI data retention is on), `true` is `off`, and any other shape is `unknown`. A signed-out settings response also carries `disable_training: false`, so the field is ignored unless the session read produced an account id.
- The account id stays in memory for that settings request and is cleared afterward. It is not stored. `skip_connector_picker_credentials` keeps connector secrets out of the settings body. The detector never writes the setting.
- Svelte 5 popup shows the status from a `CHECK_NOW` message. When an enabled service's host permission is missing, the popup shows a button that requests that origin.
- Options page (`options.html`, Chrome's options UI with `open_in_tab` false) saves `checkIntervalMinutes`, the enabled services, and each service's desired status. The service list is the registered detectors, stored at the current `servicesRevision`, so an explicit list is kept as written. When those fields are unset, the defaults are `chatgpt`, `claude`, and `perplexity`, and `off`. Desired status `off` is the alert case. Desired status `on` stores that choice and does not alert when a check reads training on.
- `chrome.storage.local` keeps `vigia_logs` (newest first, 500 entries) and `vigia_prefs`.
- Vitest covers the ChatGPT session and settings fixtures in `src/tests/fixtures/chatgpt/`, the Claude account fixtures in `src/tests/fixtures/claude/`, the Perplexity session and settings fixtures in `src/tests/fixtures/perplexity/`, plus the interval, log-trim, and desired-status helpers.

A notification is created when the check status is `on` and that status differs from the desired status. With the default desired status of `off`, every check that reads training on notifies again. Clicking the notification opens that detector's settings page: `https://chatgpt.com/settings/data-controls`, `https://claude.ai/settings/data-privacy-controls`, or `https://www.perplexity.ai/account/preferences`.

`src/detectors/index.ts` names Gemini and Grok as later detectors. They are not registered.

## Privacy and permissions

The production manifest (`pnpm build`) requests:

- `storage` — logs and preferences in `chrome.storage.local` on this browser
- `alarms` — the periodic check
- `notifications` — the training-on alert

Optional host permissions, with no required host permissions and no `<all_urls>`:

- `https://chatgpt.com/*` — requested from the popup
- `https://claude.ai/*` — requested from the popup
- `https://www.perplexity.ai/*` — requested from the popup
- `https://myactivity.google.com/*`
- `https://x.com/*`

`https://myactivity.google.com/*` and `https://x.com/*` are declared and unused. Toolbar and notification icons are the PNGs in `public/icon/` (16, 32, 48, and 128).

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
