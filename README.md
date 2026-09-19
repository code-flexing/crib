# SafeCrib — Foundation

The Under Development screen, the reusable `<SafeCribLoader />` design-system
primitive, and the PWA foundation (manifest, service worker, custom install
experience) for SafeCrib.

## 1. Install dependencies

```bash
npm install
```

## 2. Add the real brand assets

This project ships **without** any generated logo or icons, by design. Before
running it, drop in the official files at exactly these paths:

```
public/logo.png              # official SafeCrib logo, used as-is
public/icons/icon-192.png    # 192x192 app icon
public/icons/icon-512.png    # 512x512 app icon
```

`<SafeCribLogo />` renders `/public/logo.png` directly — it does not
recolor, redraw, or reconstruct it. The manifest (`src/app/manifest.ts`)
references the two icon files above.

## 3. Run locally

```bash
npm run dev
```

Visit `http://localhost:3000`.

## 4. Production build

```bash
npm run build
npm start
```

The service worker (`public/sw.js`) and manifest only behave meaningfully
against a production build served over HTTPS (or `localhost`).

## 5. Testing the PWA install flow

- **Chrome / Edge (desktop or Android):** run a production build, open
  DevTools → Application → Manifest to confirm it loads and the icons
  resolve, then click "Install SafeCrib" in the UI. The real browser prompt
  only appears after that click — SafeCrib's own modal is what the user sees
  first (`src/components/pwa/InstallPrompt.tsx`).
- **iOS Safari:** `beforeinstallprompt` doesn't exist here, so the modal
  falls back to manual "Add to Home Screen" instructions automatically
  (`src/components/pwa/InstallPrompt.tsx` → `ManualInstructions`).
- **Already installed:** `usePWAInstall()` reports `isInstalled` via the
  `display-mode: standalone` media query (and the iOS `navigator.standalone`
  flag), and the install button hides itself.

## 6. Where things live

| Concern | Path |
|---|---|
| Brand logo | `src/components/branding/SafeCribLogo.tsx` |
| Global loader (core infra) | `src/components/loading/SafeCribLoader.tsx` |
| Full-screen loading | `src/components/loading/PageLoader.tsx` |
| PWA state | `src/hooks/usePWAInstall.ts` + `src/components/pwa/PWAProvider.tsx` |
| Custom install modal | `src/components/pwa/InstallPrompt.tsx` |
| Get-notified flow | `src/components/notifications/NotificationForm.tsx` |
| Notification backend integration point | `src/lib/notifications.ts` |
| Design tokens + loader/modal CSS | `src/app/globals.css` |
| Manifest | `src/app/manifest.ts` |
| Service worker | `public/sw.js` |

## 7. Notes for what comes next

- `subscribeToNotifications()` in `src/lib/notifications.ts` currently
  throws — there is no backend yet, and the UI is intentionally honest about
  that instead of faking a saved signup. Replace its body with a real
  request when the API exists; the form already handles loading, success,
  and error states around that call.
- The service worker only caches a minimal app shell. It's written so it can
  grow into real runtime caching later without a rewrite, but it never
  caches API responses, authentication, or private data — keep it that way
  when extending it.
- `<SafeCribLoader />` is meant to be the only loading visual in the product.
  Reach for `size="sm" | "md" | "lg"` inline, or `fullscreen` (via
  `<PageLoader />`) for route/app-level loading — don't invent new loaders.
