# Design: Add 7 Missing OAuth Providers to Frontend

## Problem

The backend (CLIProxyAPIPlus) supports **13 OAuth providers**, but the frontend (Cli-Proxy-API-Management-Center) only exposes **6** on the OAuth page. 7 providers are missing: kiro, github, iflow, gitlab, kilo, qoder, cursor.

## Goal

Add all 7 missing OAuth providers to the frontend, following a 9Router-style responsive grid layout with a centralized provider registry. Support device code flows (inline user_code display), PAT input (GitLab), and cookie input (iFlow).

---

## Section 1: Provider Registry

Create `src/features/oauth/providers.ts` — a centralized registry of all 13 OAuth providers.

```typescript
export type OAuthProviderId =
  | 'codex' | 'anthropic' | 'antigravity' | 'gemini-cli' | 'kimi' | 'xai'
  | 'kiro' | 'github' | 'iflow' | 'gitlab' | 'kilo' | 'qoder' | 'cursor';

export type AuthFlowType = 'oauth' | 'device-code' | 'pat' | 'cookie' | 'multi-method';

export interface OAuthProviderConfig {
  id: OAuthProviderId;
  name: string;
  icon: string;              // SVG import path or component
  color: string;             // Brand hex color
  authFlow: AuthFlowType;
  authEndpoint: string;      // Backend endpoint, e.g. '/kiro-auth-url'
  callbackSupported: boolean; // Whether redirect callback is supported
  webuiSupported: boolean;   // Whether is_webui=true is sent
  description?: string;      // Short hint text
  altMethods?: AltAuthMethod[]; // Alternative auth methods (PAT, cookie)
}

export interface AltAuthMethod {
  type: 'pat' | 'cookie';
  label: string;
  endpoint: string;          // Backend endpoint for direct auth
  fields: AltAuthField[];
}

export interface AltAuthField {
  name: string;
  label: string;
  placeholder?: string;
  required: boolean;
}
```

### Provider Registry Entries

| ID | Name | Auth Flow | Endpoint | Callback | WebUI | Alt Methods |
|----|------|-----------|----------|----------|-------|-------------|
| `codex` | OpenAI Codex | oauth | `/codex-auth-url` | Yes | Yes | — |
| `anthropic` | Anthropic Claude | oauth | `/anthropic-auth-url` | Yes | Yes | — |
| `antigravity` | Antigravity | oauth | `/antigravity-auth-url` | Yes | Yes | — |
| `gemini-cli` | Gemini CLI | oauth | `/gemini-cli-auth-url` | Yes | Yes | — |
| `kimi` | Kimi | device-code | `/kimi-auth-url` | No | No | — |
| `xai` | xAI (Grok) | oauth | `/xai-auth-url` | Yes | Yes | — |
| `kiro` | Kiro | multi-method | `/kiro-auth-url` | Yes | No | — |
| `github` | GitHub Copilot | device-code | `/github-auth-url` | No | No | — |
| `iflow` | iFlow | oauth | `/iflow-auth-url` | Yes | No | Cookie |
| `gitlab` | GitLab | oauth | `/gitlab-auth-url` | Yes | No | PAT |
| `kilo` | Kilo | device-code | `/kilo-auth-url` | No | No | — |
| `qoder` | Qoder | device-code | `/qoder-auth-url` | No | No | — |
| `cursor` | Cursor | custom-poll | `/cursor-auth-url` | No | No | — |

**Kiro method options** (in registry):
```typescript
kiroMethods: [
  { value: 'aws', label: 'Builder ID (AWS SSO)' },
  { value: 'google', label: 'Google' },
  { value: 'github', label: 'GitHub' },
]
```

**GitLab PAT fields:**
```typescript
altMethods: [{
  type: 'pat',
  label: 'Personal Access Token',
  endpoint: '/gitlab-auth-url',  // POST
  fields: [
    { name: 'base_url', label: 'Base URL (optional)', placeholder: 'https://gitlab.com', required: false },
    { name: 'personal_access_token', label: 'Personal Access Token', placeholder: 'glpat-...', required: true },
  ]
}]
```

**iFlow Cookie fields:**
```typescript
altMethods: [{
  type: 'cookie',
  label: 'Cookie',
  endpoint: '/iflow-auth-url',  // POST
  fields: [
    { name: 'cookie', label: 'Cookie Value', placeholder: 'Paste your iFlow cookie...', required: true },
  ]
}]
```

---

## Section 2: OAuth Page Layout

Refactor `src/pages/OAuthPage.tsx` to use a responsive grid layout grouped by auth flow type.

### Layout Structure

```
┌─ OAuth Providers ──────────────────────────────────────────┐
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│ │ Codex  │ │Claude  │ │  xAI   │ │Gemini  │ │Anti-   │   │
│ │   ○    │ │   ○    │ │   ○    │ │  CLI   │ │gravity │   │
│ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘   │
│ ┌────────┐ ┌────────┐ ┌────────┐                          │
│ │ Kiro   │ │ iFlow  │ │ GitLab │   (OAuth + alt methods)  │
│ │  [▾]   │ │   ○    │ │   ○    │                          │
│ └────────┘ └────────┘ └────────┘                          │
├─ Device Code ──────────────────────────────────────────────┤
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐              │
│ │ GitHub │ │  Kilo  │ │ Qoder  │ │ Cursor │               │
│ │ [code] │ │ [code] │ │ [code] │ │   ○    │               │
│ └────────┘ └────────┘ └────────┘ └────────┘              │
└────────────────────────────────────────────────────────────┘
```

### Grid CSS

```css
.oauth-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

@media (min-width: 640px) {
  .oauth-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 768px) {
  .oauth-grid { grid-template-columns: repeat(3, 1fr); }
}

@media (min-width: 1024px) {
  .oauth-grid { grid-template-columns: repeat(4, 1fr); }
}
```

### Provider Card

Each card shows:
- Brand icon (30x30) with brand color background
- Provider name (truncated if needed)
- Auth flow badge (OAuth / Device Code / PAT / Cookie)
- Status indicator (idle / loading / success / error)
- "Login" button (or method selector for Kiro)
- For device-code providers: inline `user_code` + `verification_uri` display after auth starts
- For PAT/cookie providers: expandable input section

---

## Section 3: Auth Flow Handling

### 3.1 Standard OAuth Flow

Used by: codex, anthropic, antigravity, gemini-cli, xai, iflow, gitlab, kiro (social)

1. Click "Login" → call `oauthApi.startAuth(provider, { is_webui: webuiSupported })`
2. Receive `{ url, state }` → open URL in new tab
3. Start polling `oauthApi.getAuthStatus(state)` every 3 seconds
4. On `status: 'ok'` → show success
5. For `callbackSupported` providers: show callback URL input, call `oauthApi.submitCallback()`

### 3.2 Device Code Flow

Used by: kimi, github, kilo, qoder

1. Click "Login" → call `oauthApi.startAuth(provider)`
2. Receive `{ url, state, user_code, verification_uri }` from initial response OR from polling
3. Display `user_code` and `verification_uri` inline in the card
4. Auto-open `verification_uri` in new tab
5. Poll `oauthApi.getAuthStatus(state)` — backend returns `status: 'device_code'` with `verification_url` + `user_code`
6. On `status: 'ok'` → show success

**New polling response handling:**
```typescript
// Extend existing polling logic to handle device_code status
if (response.status === 'device_code') {
  setDeviceCode({
    userCode: response.user_code,
    verificationUrl: response.verification_url,
  });
  // Continue polling
}
```

### 3.3 Multi-Method Flow (Kiro)

1. Click card → show method selector: Builder ID / Google / GitHub
2. User selects method → call `oauthApi.startAuth('kiro', { method })`
3. If `method === 'builder-id'` → device code flow
4. If `method === 'google'` or `method === 'github'` → standard OAuth flow
5. Handle accordingly

### 3.4 PAT Flow (GitLab)

1. Click "Use PAT instead" → expand inline form
2. Fields: `base_url` (optional), `personal_access_token` (required)
3. Submit → `POST /gitlab-auth-url` with `{ base_url, personal_access_token }`
4. On success → show saved confirmation

### 3.5 Cookie Flow (iFlow)

1. Click "Use Cookie instead" → expand inline form
2. Fields: `cookie` (required)
3. Submit → `POST /iflow-auth-url` with `{ cookie }`
4. On success → show saved confirmation

### 3.6 Custom Polling Flow (Cursor)

1. Click "Login" → call `oauthApi.startAuth('cursor')`
2. Receive `{ url, state }` → open URL in new tab
3. Poll `oauthApi.getAuthStatus(state)` every 3 seconds
4. On `status: 'ok'` → show success

Cursor uses a PKCE-like custom flow on the backend. The frontend treats it identically to standard OAuth — no special UI handling needed.

---

## Section 4: Files to Modify

### New Files

| File | Purpose |
|------|---------|
| `src/features/oauth/providers.ts` | Provider registry (13 providers) |

### Modified Files

| File | Changes |
|------|---------|
| `src/types/oauth.ts` | Add `kiro`, `github`, `iflow`, `gitlab`, `kilo`, `qoder`, `cursor` to `OAuthProvider` type |
| `src/services/api/oauth.ts` | Update `OAuthProvider` type; add `WEBUI_SUPPORTED` entries for kiro; handle `device_code` status in polling; add `startKiroAuth(method)` or pass method param |
| `src/pages/OAuthPage.tsx` | Refactor to grid layout; import provider registry; render cards by auth flow group; add device code display; add PAT/cookie input sections; add kiro method selector |
| `src/features/authFiles/constants.ts` | Add to `TYPE_COLORS`: kiro, github, gitlab, kilo, qoder, cursor, iflow; add to `AUTH_FILE_ICONS`; add to `OAUTH_PROVIDER_PRESETS` |
| `src/types/authFile.ts` | Add `'kiro'`, `'github'`, `'gitlab'`, `'kilo'`, `'qoder'`, `'cursor'`, `'codebuddy'` to `AuthFileType` |

### Unchanged Files

| File | Reason |
|------|--------|
| `src/services/api/providers.ts` | These are OAuth providers, not API-key providers — no Provider Workbench changes needed |
| `src/features/providers/*` | Provider Workbench remains as-is (5 API-key brands) |

---

## Section 5: Backend API Compatibility

All 7 missing providers already have working backend endpoints. No backend changes needed.

### Auth-URL Endpoints

| Provider | Endpoint | Method | Response |
|----------|----------|--------|----------|
| kiro | `GET /kiro-auth-url?method=...` | GET | `{ status, state, method }` or `{ status, state, url }` |
| github | `GET /github-auth-url` | GET | `{ status, url, state, user_code, verification_uri }` |
| iflow | `GET /iflow-auth-url` | GET | `{ status, url, state }` |
| gitlab | `GET /gitlab-auth-url?client_id=...` | GET | `{ status, url, state }` |
| kilo | `GET /kilo-auth-url` | GET | `{ status, url, state, user_code, verification_uri }` |
| qoder | `GET /qoder-auth-url` | GET | `{ status, url, state }` |
| cursor | `GET /cursor-auth-url?label=...` | GET | `{ status, url, state }` |

### Direct Auth Endpoints (PAT/Cookie)

| Provider | Endpoint | Method | Body |
|----------|----------|--------|------|
| gitlab | `POST /gitlab-auth-url` | POST | `{ base_url?, personal_access_token }` |
| iflow | `POST /iflow-auth-url` | POST | `{ cookie }` |

### Polling Endpoint

All providers use the same polling endpoint: `GET /get-auth-status?state=...`

Response can be:
- `{ status: 'ok' }` — auth complete
- `{ status: 'wait' }` — still waiting
- `{ status: 'error', error: '...' }` — auth failed
- `{ status: 'device_code', verification_url: '...', user_code: '...' }` — device code pending

---

## Section 6: i18n Keys

Add translation keys for new providers (following existing pattern in the codebase):

```json
{
  "oauth": {
    "kiro": { "title": "Kiro", "hint": "Login with Builder ID, Google, or GitHub" },
    "github": { "title": "GitHub Copilot", "hint": "Device code authentication" },
    "iflow": { "title": "iFlow", "hint": "OAuth or cookie authentication" },
    "gitlab": { "title": "GitLab", "hint": "OAuth or Personal Access Token" },
    "kilo": { "title": "Kilo", "hint": "Device code authentication" },
    "qoder": { "title": "Qoder", "hint": "Device code authentication" },
    "cursor": { "title": "Cursor", "hint": "OAuth authentication" }
  }
}
```

---

## Section 7: Error Handling

- All providers use the existing `ApiError` handling from `src/services/api/client.ts`
- Device code polling timeout: 5 minutes (same as existing)
- PAT/cookie validation: backend returns error immediately if invalid
- Kiro method selection: invalid method shows error from backend

---

## Section 8: Testing

1. **Manual testing per provider**: Initiate auth flow for each of the 7 new providers, verify URL opens correctly, polling works, status updates display
2. **Device code display**: Verify `user_code` and `verification_uri` render inline for kimi, github, kilo, qoder
3. **PAT flow**: Test GitLab PAT submission with valid and invalid tokens
4. **Cookie flow**: Test iFlow cookie submission with valid and invalid cookies
5. **Kiro method selector**: Test all 3 methods (builder-id, google, github)
6. **Responsive grid**: Verify layout at 320px, 640px, 768px, 1024px widths
7. **Auth files page**: Verify new providers appear in filter dropdown and display with correct icons/colors
8. **Lint/typecheck**: Run `npm run lint` and `npm run typecheck` (or equivalent)
