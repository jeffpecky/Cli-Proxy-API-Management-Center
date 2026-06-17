# Add 7 Missing OAuth Providers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 7 missing OAuth providers (kiro, github, iflow, gitlab, kilo, qoder, cursor) to the frontend OAuth page with device-code display, PAT/cookie inputs, and a 9Router-style responsive grid layout.

**Architecture:** Create a centralized provider registry (`src/features/oauth/providers.ts`), extend the OAuth types and API service, refactor `OAuthPage.tsx` to render a grouped responsive grid, and update auth file constants for the new providers.

**Tech Stack:** TypeScript, React, SCSS Modules, Axios (existing API client), react-i18next

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/features/oauth/providers.ts` | **Create** | Centralized provider registry (13 providers) |
| `src/types/oauth.ts` | **Modify** | Add 7 missing provider IDs to `OAuthProvider` type |
| `src/services/api/oauth.ts` | **Modify** | Update `OAuthProvider` type, add `device_code` polling support, add `WEBUI_SUPPORTED` entries, handle method param for kiro |
| `src/pages/OAuthPage.tsx` | **Modify** | Refactor to grouped grid layout, add device code display, add PAT/cookie sections, add kiro method selector |
| `src/pages/OAuthPage.module.scss` | **Modify** | Add device code display styles, method selector styles, alt-auth input styles, grid section styles |
| `src/types/authFile.ts` | **Modify** | Add missing types to `AuthFileType` |
| `src/features/authFiles/constants.ts` | **Modify** | Add new providers to `TYPE_COLORS`, `AUTH_FILE_ICONS`, `OAUTH_PROVIDER_PRESETS` |

---

### Task 1: Create Provider Registry

**Files:**
- Create: `src/features/oauth/providers.ts`

- [ ] **Step 1: Create the provider registry file**

```typescript
/**
 * Centralized OAuth provider registry.
 * Each entry declares the provider's auth flow, endpoint, and UI metadata.
 */

import type { OAuthProvider } from '@/services/api/oauth';

export type AuthFlowType = 'oauth' | 'device-code' | 'pat' | 'cookie' | 'multi-method' | 'custom-poll';

export interface AltAuthField {
  name: string;
  label: string;
  placeholder?: string;
  required: boolean;
}

export interface AltAuthMethod {
  type: 'pat' | 'cookie';
  label: string;
  endpoint: string;
  method: 'POST';
  fields: AltAuthField[];
}

export interface OAuthProviderEntry {
  id: OAuthProvider;
  name: string;
  color: string;
  authFlow: AuthFlowType;
  callbackSupported: boolean;
  webuiSupported: boolean;
  description?: string;
  altMethods?: AltAuthMethod[];
  kiroMethods?: { value: string; label: string }[];
}

export const OAUTH_PROVIDERS: OAuthProviderEntry[] = [
  {
    id: 'codex',
    name: 'OpenAI Codex',
    color: '#3941FF',
    authFlow: 'oauth',
    callbackSupported: true,
    webuiSupported: true,
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    color: '#D97757',
    authFlow: 'oauth',
    callbackSupported: true,
    webuiSupported: true,
  },
  {
    id: 'antigravity',
    name: 'Antigravity',
    color: '#3789F9',
    authFlow: 'oauth',
    callbackSupported: true,
    webuiSupported: true,
  },
  {
    id: 'gemini-cli',
    name: 'Gemini CLI',
    color: '#3186FF',
    authFlow: 'oauth',
    callbackSupported: true,
    webuiSupported: true,
  },
  {
    id: 'kimi',
    name: 'Kimi',
    color: '#027AFF',
    authFlow: 'device-code',
    callbackSupported: false,
    webuiSupported: false,
  },
  {
    id: 'xai',
    name: 'xAI (Grok)',
    color: '#111827',
    authFlow: 'oauth',
    callbackSupported: true,
    webuiSupported: true,
  },
  {
    id: 'kiro',
    name: 'Kiro',
    color: '#FF6B00',
    authFlow: 'multi-method',
    callbackSupported: true,
    webuiSupported: false,
    kiroMethods: [
      { value: 'aws', label: 'Builder ID (AWS SSO)' },
      { value: 'google', label: 'Google' },
      { value: 'github', label: 'GitHub' },
    ],
  },
  {
    id: 'github',
    name: 'GitHub Copilot',
    color: '#24292E',
    authFlow: 'device-code',
    callbackSupported: false,
    webuiSupported: false,
  },
  {
    id: 'iflow',
    name: 'iFlow',
    color: '#5C5CFF',
    authFlow: 'oauth',
    callbackSupported: true,
    webuiSupported: false,
    altMethods: [
      {
        type: 'cookie',
        label: 'Cookie',
        endpoint: '/iflow-auth-url',
        method: 'POST',
        fields: [
          { name: 'cookie', label: 'Cookie Value', placeholder: 'Paste your iFlow cookie...', required: true },
        ],
      },
    ],
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    color: '#FC6D26',
    authFlow: 'oauth',
    callbackSupported: true,
    webuiSupported: false,
    altMethods: [
      {
        type: 'pat',
        label: 'Personal Access Token',
        endpoint: '/gitlab-auth-url',
        method: 'POST',
        fields: [
          { name: 'base_url', label: 'Base URL (optional)', placeholder: 'https://gitlab.com', required: false },
          { name: 'personal_access_token', label: 'Personal Access Token', placeholder: 'glpat-...', required: true },
        ],
      },
    ],
  },
  {
    id: 'kilo',
    name: 'Kilo',
    color: '#7C3AED',
    authFlow: 'device-code',
    callbackSupported: false,
    webuiSupported: false,
  },
  {
    id: 'qoder',
    name: 'Qoder',
    color: '#059669',
    authFlow: 'device-code',
    callbackSupported: false,
    webuiSupported: false,
  },
  {
    id: 'cursor',
    name: 'Cursor',
    color: '#000000',
    authFlow: 'custom-poll',
    callbackSupported: false,
    webuiSupported: false,
  },
];

export const OAUTH_PROVIDER_MAP: Record<OAuthProvider, OAuthProviderEntry> = Object.fromEntries(
  OAUTH_PROVIDERS.map((p) => [p.id, p])
) as Record<OAuthProvider, OAuthProviderEntry>;
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd "C:\Users\HP\Documents\ai_agents\proxy\Cli-Proxy-API-Management-Center" && npx tsc --noEmit --pretty 2>&1 | Select-Object -First 20`
Expected: Errors about `OAuthProvider` type not including new members (expected — we fix that in Task 2)

- [ ] **Step 3: Commit**

```bash
git add src/features/oauth/providers.ts
git commit -m "feat: add centralized OAuth provider registry"
```

---

### Task 2: Update OAuth Types

**Files:**
- Modify: `src/types/oauth.ts`
- Modify: `src/services/api/oauth.ts`

- [ ] **Step 1: Extend OAuthProvider type in `src/types/oauth.ts`**

Replace the entire `OAuthProvider` type:

```typescript
// OAuth 提供商类型
export type OAuthProvider =
  | 'codex'
  | 'anthropic'
  | 'antigravity'
  | 'gemini-cli'
  | 'kimi'
  | 'xai'
  | 'kiro'
  | 'github'
  | 'iflow'
  | 'gitlab'
  | 'kilo'
  | 'qoder'
  | 'cursor';
```

- [ ] **Step 2: Extend OAuthProvider type in `src/services/api/oauth.ts`**

Replace the `OAuthProvider` type:

```typescript
export type OAuthProvider =
  | 'codex'
  | 'anthropic'
  | 'antigravity'
  | 'gemini-cli'
  | 'kimi'
  | 'xai'
  | 'kiro'
  | 'github'
  | 'iflow'
  | 'gitlab'
  | 'kilo'
  | 'qoder'
  | 'cursor';
```

- [ ] **Step 3: Update WEBUI_SUPPORTED and CALLBACK_PROVIDER_MAP**

Replace the constants:

```typescript
const WEBUI_SUPPORTED: OAuthProvider[] = [
  'codex',
  'anthropic',
  'antigravity',
  'gemini-cli',
  'xai'
];
const CALLBACK_PROVIDER_MAP: Partial<Record<OAuthProvider, string>> = {
  'gemini-cli': 'gemini'
};
```

- [ ] **Step 4: Update `OAuthStartResponse` to include device code fields**

```typescript
export interface OAuthStartResponse {
  url: string;
  state?: string;
  user_code?: string;
  verification_uri?: string;
  method?: string;
}
```

- [ ] **Step 5: Update `getAuthStatus` return type to include device_code status**

```typescript
getAuthStatus: (state: string) =>
  apiClient.get<{
    status: 'ok' | 'wait' | 'error' | 'device_code';
    error?: string;
    verification_url?: string;
    user_code?: string;
  }>(`/get-auth-status`, {
    params: { state }
  }),
```

- [ ] **Step 6: Add kiro-specific auth method support**

Add to the `oauthApi` object:

```typescript
startKiroAuth: (method: string) => {
  return apiClient.get<OAuthStartResponse>('/kiro-auth-url', {
    params: { method }
  });
},
```

- [ ] **Step 7: Add direct auth methods for GitLab PAT and iFlow cookie**

```typescript
submitGitLabPAT: (data: { base_url?: string; personal_access_token: string }) => {
  return apiClient.post<{ status: string; saved_path?: string; username?: string; email?: string }>(
    '/gitlab-auth-url',
    data
  );
},

submitIFlowCookie: (data: { cookie: string }) => {
  return apiClient.post<{ status: string; saved_path?: string; email?: string; expired?: string; type?: string }>(
    '/iflow-auth-url',
    data
  );
},
```

- [ ] **Step 8: Verify compilation**

Run: `cd "C:\Users\HP\Documents\ai_agents\proxy\Cli-Proxy-API-Management-Center" && npx tsc --noEmit --pretty 2>&1 | Select-Object -First 20`
Expected: No errors from the changed files

- [ ] **Step 9: Commit**

```bash
git add src/types/oauth.ts src/services/api/oauth.ts
git commit -m "feat: extend OAuth types and API for 7 new providers"
```

---

### Task 3: Update Auth File Types and Constants

**Files:**
- Modify: `src/types/authFile.ts`
- Modify: `src/features/authFiles/constants.ts`

- [ ] **Step 1: Add missing types to `AuthFileType` in `src/types/authFile.ts`**

Replace the `AuthFileType` type:

```typescript
export type AuthFileType =
  | 'qwen'
  | 'kimi'
  | 'gemini'
  | 'gemini-cli'
  | 'aistudio'
  | 'claude'
  | 'codex'
  | 'antigravity'
  | 'xai'
  | 'iflow'
  | 'vertex'
  | 'kiro'
  | 'github'
  | 'gitlab'
  | 'kilo'
  | 'qoder'
  | 'cursor'
  | 'codebuddy'
  | 'empty'
  | 'unknown';
```

- [ ] **Step 2: Add TYPE_COLORS for new providers in `src/features/authFiles/constants.ts`**

Add these entries to the `TYPE_COLORS` object (after the `xai` entry):

```typescript
  // Kiro logo: orange #FF6B00
  kiro: {
    light: { bg: '#fff3e0', text: '#e65100' },
    dark: { bg: '#4e2600', text: '#ffb74d' },
  },
  // GitHub: dark #24292E
  github: {
    light: { bg: '#f0f0f0', text: '#24292e' },
    dark: { bg: '#24292e', text: '#f0f0f0' },
  },
  // GitLab: orange #FC6D26
  gitlab: {
    light: { bg: '#fef0e8', text: '#c44d19' },
    dark: { bg: '#5c2400', text: '#fc9e71' },
  },
  // Kilo: purple #7C3AED
  kilo: {
    light: { bg: '#f3e8ff', text: '#6d28d9' },
    dark: { bg: '#3b0764', text: '#c4b5fd' },
  },
  // Qoder: green #059669
  qoder: {
    light: { bg: '#e6f9f1', text: '#047857' },
    dark: { bg: '#003d29', text: '#6ee7b7' },
  },
  // Cursor: black
  cursor: {
    light: { bg: '#f3f4f6', text: '#111827' },
    dark: { bg: '#1f2937', text: '#f9fafb' },
  },
```

- [ ] **Step 3: Add to OAUTH_PROVIDER_PRESETS**

Replace the `OAUTH_PROVIDER_PRESETS` array:

```typescript
export const OAUTH_PROVIDER_PRESETS = [
  'gemini-cli',
  'vertex',
  'aistudio',
  'antigravity',
  'xai',
  'claude',
  'codex',
  'kimi',
  'kiro',
  'github',
  'gitlab',
  'iflow',
  'kilo',
  'qoder',
  'cursor',
];
```

- [ ] **Step 4: Verify compilation**

Run: `cd "C:\Users\HP\Documents\ai_agents\proxy\Cli-Proxy-API-Management-Center" && npx tsc --noEmit --pretty 2>&1 | Select-Object -First 20`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/types/authFile.ts src/features/authFiles/constants.ts
git commit -m "feat: add auth file types and colors for 7 new providers"
```

---

### Task 4: Refactor OAuthPage to Grid Layout with Device Code Support

**Files:**
- Modify: `src/pages/OAuthPage.tsx`
- Modify: `src/pages/OAuthPage.module.scss`

- [ ] **Step 1: Add new SCSS styles for device code, method selector, alt-auth, and grid sections**

Append to `src/pages/OAuthPage.module.scss`:

```scss
.sectionTitle {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 $spacing-md 0;
  padding-bottom: $spacing-sm;
  border-bottom: 1px solid var(--border-color);
}

.providerGrid {
  display: grid;
  gap: $spacing-lg;
  grid-template-columns: 1fr;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
}

.providerCard {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.deviceCodeBox {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: $radius-md;
  padding: $spacing-md;
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.deviceCodeLabel {
  font-size: 13px;
  color: var(--text-secondary);
}

.deviceCodeValue {
  font-size: 20px;
  font-weight: 700;
  color: var(--primary-color);
  font-family: monospace;
  letter-spacing: 2px;
}

.deviceCodeUrl {
  font-size: 13px;
  color: var(--text-secondary);
  word-break: break-all;
}

.methodSelector {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-sm;
}

.methodButton {
  flex: 1;
  min-width: 120px;
}

.altAuthToggle {
  margin: 0;
  font-size: 13px;
  color: var(--primary-color);
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  text-decoration: underline;

  &:hover {
    color: var(--primary-hover);
  }
}

.altAuthForm {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  padding: $spacing-md;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: $radius-md;
}

.altAuthActions {
  display: flex;
  gap: $spacing-sm;
}
```

- [ ] **Step 2: Update OAuthPage.tsx imports**

Replace the imports section at the top of `src/pages/OAuthPage.tsx`:

```typescript
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useNotificationStore, useThemeStore } from '@/stores';
import { oauthApi, type OAuthProvider } from '@/services/api/oauth';
import { vertexApi, type VertexImportResponse } from '@/services/api/vertex';
import { copyToClipboard } from '@/utils/clipboard';
import { getErrorMessage, isRecord } from '@/utils/helpers';
import { OAUTH_PROVIDERS, type OAuthProviderEntry, type AltAuthMethod } from '@/features/oauth/providers';
import styles from './OAuthPage.module.scss';
import iconCodex from '@/assets/icons/codex.svg';
import iconClaude from '@/assets/icons/claude.svg';
import iconAntigravity from '@/assets/icons/antigravity.svg';
import iconGemini from '@/assets/icons/gemini.svg';
import iconKimiLight from '@/assets/icons/kimi-light.svg';
import iconKimiDark from '@/assets/icons/kimi-dark.svg';
import iconVertex from '@/assets/icons/vertex.svg';
import iconGrok from '@/assets/icons/grok.svg';
import iconGrokDark from '@/assets/icons/grok-dark.svg';
import iconIflow from '@/assets/icons/iflow.svg';
```

- [ ] **Step 3: Add icon mapping constant**

After the `getIcon` helper function, add:

```typescript
const PROVIDER_ICONS: Partial<Record<OAuthProvider, string | { light: string; dark: string }>> = {
  codex: iconCodex,
  anthropic: iconClaude,
  antigravity: iconAntigravity,
  'gemini-cli': iconGemini,
  kimi: { light: iconKimiLight, dark: iconKimiDark },
  xai: { light: iconGrok, dark: iconGrokDark },
  iflow: iconIflow,
};

const getProviderIcon = (provider: OAuthProvider, theme: 'light' | 'dark'): string | null => {
  const icon = PROVIDER_ICONS[provider];
  if (!icon) return null;
  return getIcon(icon, theme);
};
```

- [ ] **Step 4: Update ProviderState interface to include device code fields**

Replace the `ProviderState` interface:

```typescript
interface ProviderState {
  url?: string;
  state?: string;
  status?: 'idle' | 'waiting' | 'success' | 'error';
  error?: string;
  polling?: boolean;
  projectId?: string;
  projectIdError?: string;
  callbackUrl?: string;
  callbackSubmitting?: boolean;
  callbackStatus?: 'success' | 'error';
  callbackError?: string;
  userCode?: string;
  verificationUrl?: string;
  selectedMethod?: string;
  altAuthFields?: Record<string, string>;
  altAuthSubmitting?: boolean;
  altAuthResult?: string;
  altAuthError?: string;
  showAltAuth?: boolean;
}
```

- [ ] **Step 5: Update startPolling to handle device_code status**

Replace the `startPolling` function:

```typescript
const startPolling = (provider: OAuthProvider, state: string) => {
  clearPollingTimer(provider);
  const timer = window.setInterval(async () => {
    try {
      const res = await oauthApi.getAuthStatus(state);
      if (res.status === 'ok') {
        completeProviderAuth(provider);
        showNotification(t(getAuthKey(provider, 'oauth_status_success')), 'success');
      } else if (res.status === 'error') {
        updateProviderState(provider, { status: 'error', error: res.error, polling: false });
        showNotification(
          `${t(getAuthKey(provider, 'oauth_status_error'))} ${res.error || ''}`,
          'error'
        );
        window.clearInterval(timer);
        delete pollingTimers.current[provider];
      } else if (res.status === 'device_code') {
        updateProviderState(provider, {
          userCode: res.user_code,
          verificationUrl: res.verification_url,
        });
      }
    } catch (err: unknown) {
      updateProviderState(provider, { status: 'error', error: getErrorMessage(err), polling: false });
      window.clearInterval(timer);
      delete pollingTimers.current[provider];
    }
  }, 3000);
  pollingTimers.current[provider] = timer;
};
```

- [ ] **Step 6: Update startAuth to handle kiro multi-method and device code responses**

Replace the `startAuth` function:

```typescript
const startAuth = async (provider: OAuthProvider, method?: string) => {
  clearProviderTimers(provider);
  const geminiState = provider === 'gemini-cli' ? states[provider] : undefined;
  const rawProjectId = provider === 'gemini-cli' ? (geminiState?.projectId || '').trim() : '';
  const projectId = rawProjectId
    ? rawProjectId.toUpperCase() === 'ALL'
      ? 'ALL'
      : rawProjectId
    : undefined;
  if (provider === 'gemini-cli') {
    updateProviderState(provider, { projectIdError: undefined });
  }
  updateProviderState(provider, {
    url: undefined,
    state: undefined,
    status: 'waiting',
    polling: true,
    error: undefined,
    callbackStatus: undefined,
    callbackError: undefined,
    callbackUrl: '',
    userCode: undefined,
    verificationUrl: undefined,
  });
  try {
    let res;
    if (provider === 'kiro' && method) {
      updateProviderState(provider, { selectedMethod: method });
      res = await oauthApi.startKiroAuth(method);
    } else {
      res = await oauthApi.startAuth(
        provider,
        provider === 'gemini-cli' ? { projectId: projectId || undefined } : undefined
      );
    }
    if (!res.state) {
      const message = t('auth_login.missing_state');
      updateProviderState(provider, {
        url: res.url,
        state: undefined,
        status: 'error',
        error: message,
        polling: false
      });
      showNotification(message, 'error');
      return;
    }
    updateProviderState(provider, {
      url: res.url,
      state: res.state,
      status: 'waiting',
      polling: true,
      userCode: res.user_code,
      verificationUrl: res.verification_uri,
    });
    startPolling(provider, res.state);
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    updateProviderState(provider, { status: 'error', error: message, polling: false });
    showNotification(
      `${t(getAuthKey(provider, 'oauth_start_error'))}${message ? ` ${message}` : ''}`,
      'error'
    );
  }
};
```

- [ ] **Step 7: Add alt-auth submit handler**

Add after the `submitCallback` function:

```typescript
const submitAltAuth = async (provider: OAuthProvider, method: AltAuthMethod) => {
  const fields = states[provider]?.altAuthFields || {};
  const missing = method.fields.filter((f) => f.required && !fields[f.name]?.trim());
  if (missing.length > 0) {
    showNotification(t('auth_login.alt_auth_required_fields'), 'warning');
    return;
  }
  updateProviderState(provider, { altAuthSubmitting: true, altAuthError: undefined, altAuthResult: undefined });
  try {
    const payload: Record<string, string> = {};
    method.fields.forEach((f) => {
      const val = fields[f.name]?.trim();
      if (val) payload[f.name] = val;
    });
    let res;
    if (method.type === 'pat' && provider === 'gitlab') {
      res = await oauthApi.submitGitLabPAT(payload as { base_url?: string; personal_access_token: string });
    } else if (method.type === 'cookie' && provider === 'iflow') {
      res = await oauthApi.submitIFlowCookie(payload as { cookie: string });
    }
    updateProviderState(provider, {
      altAuthSubmitting: false,
      altAuthResult: res?.username || res?.email || t('auth_login.alt_auth_success'),
    });
    showNotification(t('auth_login.alt_auth_success'), 'success');
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    updateProviderState(provider, {
      altAuthSubmitting: false,
      altAuthError: message || t('auth_login.alt_auth_error'),
    });
    showNotification(message || t('auth_login.alt_auth_error'), 'error');
  }
};
```

- [ ] **Step 8: Replace the entire JSX return with grouped grid layout**

Replace the return JSX in `OAuthPage`:

```tsx
return (
  <div className={styles.container}>
    <h1 className={styles.pageTitle}>{t('nav.oauth', { defaultValue: 'OAuth' })}</h1>

    <div className={styles.content}>
      {/* Standard OAuth Providers */}
      <div>
        <h2 className={styles.sectionTitle}>{t('auth_login.section_oauth', { defaultValue: 'OAuth Providers' })}</h2>
        <div className={styles.providerGrid}>
          {OAUTH_PROVIDERS.filter((p) => p.authFlow === 'oauth' || p.authFlow === 'custom-poll' || p.authFlow === 'multi-method').map((provider) => {
            const state = states[provider.id] || {};
            const icon = getProviderIcon(provider.id, resolvedTheme);
            const canSubmitCallback = provider.callbackSupported && Boolean(state.url);
            const loginButtonLabel =
              state.status === 'success'
                ? t('auth_login.login_another_account')
                : t(getAuthKey(provider.id, 'oauth_button'));
            return (
              <div key={provider.id}>
                <Card
                  title={
                    <span className={styles.cardTitle}>
                      {icon ? (
                        <img src={icon} alt="" className={styles.cardTitleIcon} />
                      ) : (
                        <span
                          className={styles.cardTitleIcon}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%',
                            backgroundColor: provider.color,
                            color: '#fff',
                            fontSize: '10px',
                            fontWeight: 700,
                          }}
                        >
                          {provider.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      {provider.name}
                    </span>
                  }
                  extra={
                    provider.id === 'kiro' && !state.selectedMethod ? (
                      <div className={styles.methodSelector}>
                        {provider.kiroMethods?.map((m) => (
                          <Button
                            key={m.value}
                            variant="secondary"
                            size="sm"
                            className={styles.methodButton}
                            onClick={() => startAuth(provider.id, m.value)}
                          >
                            {m.label}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <Button onClick={() => startAuth(provider.id)} loading={state.polling}>
                        {loginButtonLabel}
                      </Button>
                    )
                  }
                >
                  <div className={styles.providerCard}>
                    <div className={styles.cardHint}>
                      {provider.description || t(getAuthKey(provider.id, 'oauth_hint'))}
                    </div>

                    {/* Device code display */}
                    {state.userCode && (
                      <div className={styles.deviceCodeBox}>
                        <div className={styles.deviceCodeLabel}>
                          {t('auth_login.device_code_label', { defaultValue: 'Enter this code:' })}
                        </div>
                        <div className={styles.deviceCodeValue}>{state.userCode}</div>
                        {state.verificationUrl && (
                          <div className={styles.deviceCodeUrl}>{state.verificationUrl}</div>
                        )}
                      </div>
                    )}

                    {/* Auth URL display */}
                    {state.url && !state.userCode && (
                      <div className={styles.authUrlBox}>
                        <div className={styles.authUrlLabel}>{t(getAuthKey(provider.id, 'oauth_url_label'))}</div>
                        <div className={styles.authUrlValue}>{state.url}</div>
                        <div className={styles.authUrlActions}>
                          <Button variant="secondary" size="sm" onClick={() => copyLink(state.url!)}>
                            {t(getAuthKey(provider.id, 'copy_link'))}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => window.open(state.url, '_blank', 'noopener,noreferrer')}
                          >
                            {t(getAuthKey(provider.id, 'open_link'))}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Callback section */}
                    {canSubmitCallback && (
                      <div className={styles.callbackSection}>
                        <Input
                          label={t(
                            provider.id === 'xai'
                              ? 'auth_login.xai_callback_label'
                              : 'auth_login.oauth_callback_label'
                          )}
                          hint={t(
                            provider.id === 'xai'
                              ? 'auth_login.xai_callback_hint'
                              : 'auth_login.oauth_callback_hint'
                          )}
                          value={state.callbackUrl || ''}
                          onChange={(e) =>
                            updateProviderState(provider.id, {
                              callbackUrl: e.target.value,
                              callbackStatus: undefined,
                              callbackError: undefined
                            })
                          }
                          placeholder={t(
                            provider.id === 'xai'
                              ? 'auth_login.xai_callback_placeholder'
                              : 'auth_login.oauth_callback_placeholder'
                          )}
                        />
                        <div className={styles.callbackActions}>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => submitCallback(provider.id)}
                            loading={state.callbackSubmitting}
                          >
                            {t('auth_login.oauth_callback_button')}
                          </Button>
                        </div>
                        {state.callbackStatus === 'success' && state.status === 'waiting' && (
                          <div className="status-badge success">
                            {t('auth_login.oauth_callback_status_success')}
                          </div>
                        )}
                        {state.callbackStatus === 'error' && (
                          <div className="status-badge error">
                            {t('auth_login.oauth_callback_status_error')} {state.callbackError || ''}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Alt auth methods (PAT / Cookie) */}
                    {provider.altMethods && (
                      <div>
                        <button
                          className={styles.altAuthToggle}
                          onClick={() =>
                            updateProviderState(provider.id, {
                              showAltAuth: !state.showAltAuth,
                            })
                          }
                        >
                          {state.showAltAuth
                            ? t('auth_login.hide_alt_auth', { defaultValue: 'Hide' })
                            : t('auth_login.use_alt_auth', {
                                defaultValue: `Use ${provider.altMethods[0].label} instead`,
                              })}
                        </button>
                        {state.showAltAuth && provider.altMethods[0] && (
                          <div className={styles.altAuthForm}>
                            {provider.altMethods[0].fields.map((field) => (
                              <Input
                                key={field.name}
                                label={field.label}
                                value={state.altAuthFields?.[field.name] || ''}
                                onChange={(e) =>
                                  updateProviderState(provider.id, {
                                    altAuthFields: {
                                      ...(state.altAuthFields || {}),
                                      [field.name]: e.target.value,
                                    },
                                    altAuthError: undefined,
                                    altAuthResult: undefined,
                                  })
                                }
                                placeholder={field.placeholder}
                              />
                            ))}
                            <div className={styles.altAuthActions}>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => submitAltAuth(provider.id, provider.altMethods![0])}
                                loading={state.altAuthSubmitting}
                              >
                                {t('auth_login.alt_auth_submit', { defaultValue: 'Submit' })}
                              </Button>
                            </div>
                            {state.altAuthResult && (
                              <div className="status-badge success">{state.altAuthResult}</div>
                            )}
                            {state.altAuthError && (
                              <div className="status-badge error">{state.altAuthError}</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Status badge */}
                    {state.status && state.status !== 'idle' && (
                      <div
                        className={[
                          'status-badge',
                          state.status === 'success' ? 'success' : '',
                          state.status === 'error' ? 'error' : '',
                          state.status === 'waiting' ? styles.oauthStatus + ' waiting' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {state.status === 'success'
                          ? t(getAuthKey(provider.id, 'oauth_status_success'))
                          : state.status === 'error'
                            ? `${t(getAuthKey(provider.id, 'oauth_status_error'))} ${state.error || ''}`
                            : t(getAuthKey(provider.id, 'oauth_status_waiting'))}
                      </div>
                    )}

                    {/* View auth files button on success */}
                    {state.status === 'success' && (
                      <div className={styles.successActions}>
                        <Button variant="secondary" size="sm" onClick={() => navigate('/auth-files')}>
                          {t('auth_login.view_auth_files')}
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      {/* Vertex JSON Import */}
      <Card
        title={
          <span className={styles.cardTitle}>
            <img src={iconVertex} alt="" className={styles.cardTitleIcon} />
            {t('vertex_import.title')}
          </span>
        }
        extra={
          <Button onClick={handleVertexImport} loading={vertexState.loading}>
            {t('vertex_import.import_button')}
          </Button>
        }
      >
        <div className={styles.cardContent}>
          <div className={styles.cardHint}>{t('vertex_import.description')}</div>
          <Input
            label={t('vertex_import.location_label')}
            hint={t('vertex_import.location_hint')}
            value={vertexState.location}
            onChange={(e) =>
              setVertexState((prev) => ({
                ...prev,
                location: e.target.value
              }))
            }
            placeholder={t('vertex_import.location_placeholder')}
          />
          <div className={styles.formItem}>
            <label className={styles.formItemLabel}>{t('vertex_import.file_label')}</label>
            <div className={styles.filePicker}>
              <Button variant="secondary" size="sm" onClick={handleVertexFilePick}>
                {t('vertex_import.choose_file')}
              </Button>
              <div
                className={`${styles.fileName} ${
                  vertexState.fileName ? '' : styles.fileNamePlaceholder
                }`.trim()}
              >
                {vertexState.fileName || t('vertex_import.file_placeholder')}
              </div>
            </div>
            <div className={styles.cardHintSecondary}>{t('vertex_import.file_hint')}</div>
            <input
              ref={vertexFileInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={handleVertexFileChange}
            />
          </div>
          {vertexState.error && (
            <div className="status-badge error">
              {vertexState.error}
            </div>
          )}
          {vertexState.result && (
            <div className={styles.connectionBox}>
              <div className={styles.connectionLabel}>{t('vertex_import.result_title')}</div>
              <div className={styles.keyValueList}>
                {vertexState.result.projectId && (
                  <div className={styles.keyValueItem}>
                    <span className={styles.keyValueKey}>{t('vertex_import.result_project')}</span>
                    <span className={styles.keyValueValue}>{vertexState.result.projectId}</span>
                  </div>
                )}
                {vertexState.result.email && (
                  <div className={styles.keyValueItem}>
                    <span className={styles.keyValueKey}>{t('vertex_import.result_email')}</span>
                    <span className={styles.keyValueValue}>{vertexState.result.email}</span>
                  </div>
                )}
                {vertexState.result.location && (
                  <div className={styles.keyValueItem}>
                    <span className={styles.keyValueKey}>{t('vertex_import.result_location')}</span>
                    <span className={styles.keyValueValue}>{vertexState.result.location}</span>
                  </div>
                )}
                {vertexState.result.authFile && (
                  <div className={styles.keyValueItem}>
                    <span className={styles.keyValueKey}>{t('vertex_import.result_file')}</span>
                    <span className={styles.keyValueValue}>{vertexState.result.authFile}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  </div>
);
```

- [ ] **Step 9: Remove the old hardcoded PROVIDERS constant**

Delete the `PROVIDERS` array (lines 58-65 in original) and the `CALLBACK_SUPPORTED` array (lines 67-73 in original), since these are now derived from the registry.

- [ ] **Step 10: Verify compilation**

Run: `cd "C:\Users\HP\Documents\ai_agents\proxy\Cli-Proxy-API-Management-Center" && npx tsc --noEmit --pretty 2>&1 | Select-Object -First 30`
Expected: No errors

- [ ] **Step 11: Verify lint**

Run: `cd "C:\Users\HP\Documents\ai_agents\proxy\Cli-Proxy-API-Management-Center" && npx eslint src/pages/OAuthPage.tsx src/features/oauth/providers.ts --max-warnings=0 2>&1 | Select-Object -First 20`
Expected: No errors or only existing warnings

- [ ] **Step 12: Commit**

```bash
git add src/pages/OAuthPage.tsx src/pages/OAuthPage.module.scss
git commit -m "feat: refactor OAuth page to grouped grid with 7 new providers"
```

---

### Task 5: Add i18n Keys

**Files:**
- Modify: Find the i18n translation file (likely `src/i18n/locales/en.json` or similar)

- [ ] **Step 1: Locate the translation file**

Run: `Get-ChildItem "C:\Users\HP\Documents\ai_agents\proxy\Cli-Proxy-API-Management-Center\src" -Recurse -Filter "*.json" | Where-Object { $_.Name -like "*en*" -or $_.Name -like "*locale*" } | Select-Object FullName`
Or grep for existing `auth_login.codex_oauth_title` key.

- [ ] **Step 2: Add translation keys for new providers**

Add to the `auth_login` section of the English locale file:

```json
"kiro_oauth_title": "Kiro",
"kiro_oauth_hint": "Login with Builder ID, Google, or GitHub",
"kiro_oauth_button": "Select Method",
"kiro_oauth_url_label": "Authorization URL:",
"kiro_oauth_status_success": "Kiro login successful!",
"kiro_oauth_status_error": "Kiro login failed:",
"kiro_oauth_status_waiting": "Waiting for Kiro authentication...",
"kiro_oauth_start_error": "Failed to start Kiro auth:",
"kiro_copy_link": "Copy Link",
"kiro_open_link": "Open Link",

"github_oauth_title": "GitHub Copilot",
"github_oauth_hint": "Device code authentication",
"github_oauth_button": "Login",
"github_oauth_url_label": "Verification URL:",
"github_oauth_status_success": "GitHub Copilot login successful!",
"github_oauth_status_error": "GitHub Copilot login failed:",
"github_oauth_status_waiting": "Waiting for GitHub Copilot authentication...",
"github_oauth_start_error": "Failed to start GitHub Copilot auth:",
"github_copy_link": "Copy Link",
"github_open_link": "Open Link",

"iflow_oauth_title": "iFlow",
"iflow_oauth_hint": "OAuth or cookie-based authentication",
"iflow_oauth_button": "Login",
"iflow_oauth_url_label": "Authorization URL:",
"iflow_oauth_status_success": "iFlow login successful!",
"iflow_oauth_status_error": "iFlow login failed:",
"iflow_oauth_status_waiting": "Waiting for iFlow authentication...",
"iflow_oauth_start_error": "Failed to start iFlow auth:",
"iflow_copy_link": "Copy Link",
"iflow_open_link": "Open Link",

"gitlab_oauth_title": "GitLab",
"gitlab_oauth_hint": "OAuth or Personal Access Token authentication",
"gitlab_oauth_button": "Login",
"gitlab_oauth_url_label": "Authorization URL:",
"gitlab_oauth_status_success": "GitLab login successful!",
"gitlab_oauth_status_error": "GitLab login failed:",
"gitlab_oauth_status_waiting": "Waiting for GitLab authentication...",
"gitlab_oauth_start_error": "Failed to start GitLab auth:",
"gitlab_copy_link": "Copy Link",
"gitlab_open_link": "Open Link",

"kilo_oauth_title": "Kilo",
"kilo_oauth_hint": "Device code authentication",
"kilo_oauth_button": "Login",
"kilo_oauth_url_label": "Verification URL:",
"kilo_oauth_status_success": "Kilo login successful!",
"kilo_oauth_status_error": "Kilo login failed:",
"kilo_oauth_status_waiting": "Waiting for Kilo authentication...",
"kilo_oauth_start_error": "Failed to start Kilo auth:",
"kilo_copy_link": "Copy Link",
"kilo_open_link": "Open Link",

"qoder_oauth_title": "Qoder",
"qoder_oauth_hint": "Device code authentication",
"qoder_oauth_button": "Login",
"qoder_oauth_url_label": "Verification URL:",
"qoder_oauth_status_success": "Qoder login successful!",
"qoder_oauth_status_error": "Qoder login failed:",
"qoder_oauth_status_waiting": "Waiting for Qoder authentication...",
"qoder_oauth_start_error": "Failed to start Qoder auth:",
"qoder_copy_link": "Copy Link",
"qoder_open_link": "Open Link",

"cursor_oauth_title": "Cursor",
"cursor_oauth_hint": "OAuth authentication",
"cursor_oauth_button": "Login",
"cursor_oauth_url_label": "Authorization URL:",
"cursor_oauth_status_success": "Cursor login successful!",
"cursor_oauth_status_error": "Cursor login failed:",
"cursor_oauth_status_waiting": "Waiting for Cursor authentication...",
"cursor_oauth_start_error": "Failed to start Cursor auth:",
"cursor_copy_link": "Copy Link",
"cursor_open_link": "Open Link",

"device_code_label": "Enter this code:",
"section_oauth": "OAuth Providers",
"use_alt_auth": "Use {{method}} instead",
"hide_alt_auth": "Hide",
"alt_auth_submit": "Submit",
"alt_auth_success": "Authentication successful!",
"alt_auth_error": "Authentication failed",
"alt_auth_required_fields": "Please fill in all required fields"
```

- [ ] **Step 3: Commit**

```bash
git add src/i18n/
git commit -m "feat: add i18n keys for 7 new OAuth providers"
```

---

### Task 6: Final Verification

- [ ] **Step 1: Full typecheck**

Run: `cd "C:\Users\HP\Documents\ai_agents\proxy\Cli-Proxy-API-Management-Center" && npx tsc --noEmit --pretty`
Expected: No errors

- [ ] **Step 2: Full lint**

Run: `cd "C:\Users\HP\Documents\ai_agents\proxy\Cli-Proxy-API-Management-Center" && npx eslint src/ --max-warnings=50`
Expected: No new errors

- [ ] **Step 3: Build**

Run: `cd "C:\Users\HP\Documents\ai_agents\proxy\Cli-Proxy-API-Management-Center" && npm run build 2>&1 | Select-Object -Last 20`
Expected: Build succeeds

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address review feedback for OAuth provider integration"
```
