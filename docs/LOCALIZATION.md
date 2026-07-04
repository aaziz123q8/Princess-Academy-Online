# Localization (Arabic / English)

Bilingual support is a **first-class rule**, not an afterthought: **no user-facing string is ever
hard-coded.** Every label, dialog, mission, notification, menu, and error references a key that is
resolved at runtime. Arabic and English ship together from day one, and Arabic renders
**right-to-left** with mirrored layout.

---

## Client

### Where strings live
- `client/src/ui/locales/en.json` — English
- `client/src/ui/locales/ar.json` — Arabic

Both files share the same keys. Example:

```json
// en.json                         // ar.json
"auth.login": "Log In",            "auth.login": "تسجيل الدخول",
"hud.level": "Level",              "hud.level": "المستوى",
```

### Using strings
- **In JS:** `import { t } from "./ui/i18n.js";` then `t("auth.login")`, or with variables:
  `t("auth.welcome", { name })` → `"Welcome, Noura!"` / `"أهلاً بكِ يا Noura!"`.
- **In HTML:** add `data-i18n="key"` (sets text) or `data-i18n-ph="key"` (sets a placeholder).
  `applyToDocument()` fills them and re-fills on every language change.

### Switching language
`setLanguage("ar" | "en")` (called by the `[data-lang]` buttons):
1. persists the choice to `localStorage`,
2. sets `<html lang>` and `dir="rtl"|"ltr"`,
3. refills all `data-i18n` / `data-i18n-ph` nodes,
4. notifies listeners via `onLanguageChange(...)` so dynamic UI (HUD, chat, auth submit label)
   re-renders.

The switch is **instant** — no reload, no asset refetch.

### RTL handling
- `html[dir="rtl"]` flips the whole layout. The CSS uses **logical properties**
  (`inset-inline-start/end`, `margin-inline-start`, `padding-inline`) so the HUD, chat, joystick,
  and panels mirror correctly without duplicated rules.
- Arabic input fields are right-aligned; a Tahoma-first font stack improves Arabic legibility.
- Missing keys fall back to English, then to the raw key — the UI never renders blank.

---

## Backend

API responses are localized in `server/src/i18n.js`, keyed off the request's `Accept-Language`
header (the client sends it automatically via `ui/api.js`). Example: a duplicate-registration
error returns the Arabic message when the player is using Arabic.

```
Accept-Language: ar  →  { "error": "exists", "message": "اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل." }
Accept-Language: en  →  { "error": "exists", "message": "That username or email is already taken." }
```

The player's preferred locale is also stored on the `users` row at registration for future
server-initiated messages (emails, notifications).

---

## Adding a new string

1. Add the key to **both** `en.json` and `ar.json` (and to `server/src/i18n.js` if the backend
   emits it).
2. Reference it with `t("your.key")` or `data-i18n="your.key"`.
3. That's it — it localizes and switches automatically.

## Adding a new language (e.g. French)

1. Add `client/src/ui/locales/fr.json` with the same keys.
2. Register it in `i18n.js` (`TABLES`), and add it to `RTL_LANGS` only if it's an RTL language.
3. Add a `[data-lang="fr"]` button. No gameplay code changes.

---

## Testing checklist

- [ ] Toggle EN ⇄ AR on every screen (loading, auth, HUD, settings, chat) — nothing stays in the
      wrong language and nothing shows a raw key.
- [ ] In Arabic, layout mirrors (currencies, chat, joystick move to the correct side).
- [ ] Arabic + emoji persist correctly through the API and MySQL (utf8mb4).
- [ ] Variable interpolation works in both languages (`{name}`, `{level}`, `{coins}`).
