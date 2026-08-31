# Screenshot E2E

Walks Grok Desktop chrome and writes PNGs to `docs/screenshots/` for the README.

```bash
npm install
npm run test:e2e
```

`npm test` is an alias of `test:e2e`.

## What it does

1. Launches Electron with `GROK_E2E=1` and a throwaway user-data dir.
2. Loads `fixtures/grok-shell.html` in the first tab so chrome shots stay offline-stable.
3. Toggles usage mock data, extra tabs, About, AOT, light/dark.
4. Opens live `grok.com` last (`12-live-grok.png`).
5. Uses `BrowserWindow.capturePage()` so `<webview>` contents are included.

## Env

| Variable | Role |
|----------|------|
| `GROK_E2E=1` | Enables the in-app E2E hook and skips update checks |
| `GROK_E2E_START_URL` | First-tab URL (defaults to the local fixture) |
| `GROK_E2E_THEME` | `dark` (default) or `light`; the app itself also defaults to dark |
| `GROK_DISABLE_GPU=true` | Set by the runner for stable captures |

No Chromium download is required; Playwright drives the Electron binary already in `node_modules/electron`.
