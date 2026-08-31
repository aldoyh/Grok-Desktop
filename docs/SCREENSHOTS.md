# Screenshot catalog

Captured by `npm run test:e2e` (Playwright launching Electron). Window size is 1280×800. The suite is screenshot-only: it does not assert DOM text.

The hero image in the root README (`screenshot.png`) is a logged-in Windows session. The files below are the automated tour.

| File | What it shows |
|------|----------------|
| [01-main-window.png](screenshots/01-main-window.png) | Tab bar, toolbar, and Grok-style shell |
| [02-usage-bar.png](screenshots/02-usage-bar.png) | Usage stats at full remaining quota |
| [03-toolbar.png](screenshots/03-toolbar.png) | Tab strip and Reload / AOT / usage / About controls |
| [04-multiple-tabs.png](screenshots/04-multiple-tabs.png) | Several conversation tabs |
| [05-tab-overflow.png](screenshots/05-tab-overflow.png) | Overflowing tabs with the scroll affordance |
| [06-about.png](screenshots/06-about.png) | About tab (version, developer, links) |
| [07-aot-active.png](screenshots/07-aot-active.png) | Always-on-top button in the active (green) state |
| [08-usage-warning.png](screenshots/08-usage-warning.png) | Orange warning when remaining quota is low |
| [09-usage-critical.png](screenshots/09-usage-critical.png) | Red critical state plus refill timer |
| [10-light-mode.png](screenshots/10-light-mode.png) | Optional light chrome theme |
| [11-dark-mode.png](screenshots/11-dark-mode.png) | Default dark chrome theme |
| [12-live-grok.png](screenshots/12-live-grok.png) | Live `grok.com` in a tab (login or home) |

Machine-readable list: [screenshots/manifest.json](screenshots/manifest.json).

## Regenerating

```bash
npm install
npm run test:e2e
```

The runner uses an isolated Electron user-data directory, a local fixture for chrome shots, then opens `https://grok.com` for the live capture. It does not log in.

## Usage colors

The usage bar applies classes from remaining/total:

- Default: normal text
- `warning`: remaining ≤ 25%
- `critical`: remaining ≤ 10%
