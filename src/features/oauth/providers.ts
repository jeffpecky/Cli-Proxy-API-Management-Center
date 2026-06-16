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
