/**
 * OAuth 与设备码登录相关 API
 */

import { apiClient } from './client';

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

export interface OAuthStartResponse {
  url: string;
  state?: string;
  user_code?: string;
  verification_uri?: string;
  method?: string;
}

export interface OAuthCallbackResponse {
  status: 'ok';
}

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

export const oauthApi = {
  startAuth: (provider: OAuthProvider, options?: { projectId?: string }) => {
    const params: Record<string, string | boolean> = {};
    if (WEBUI_SUPPORTED.includes(provider)) {
      params.is_webui = true;
    }
    if (provider === 'gemini-cli' && options?.projectId) {
      params.project_id = options.projectId;
    }
    return apiClient.get<OAuthStartResponse>(`/${provider}-auth-url`, {
      params: Object.keys(params).length ? params : undefined
    });
  },

  getAuthStatus: (state: string) =>
    apiClient.get<{
      status: 'ok' | 'wait' | 'error' | 'device_code';
      error?: string;
      verification_url?: string;
      user_code?: string;
    }>(`/get-auth-status`, {
      params: { state }
    }),

  startKiroAuth: (method: string) => {
    return apiClient.get<OAuthStartResponse>('/kiro-auth-url', {
      params: { method }
    });
  },

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

  submitCallback: (provider: OAuthProvider, redirectUrl: string) => {
    const callbackProvider = CALLBACK_PROVIDER_MAP[provider] ?? provider;
    return apiClient.post<OAuthCallbackResponse>('/oauth-callback', {
      provider: callbackProvider,
      redirect_url: redirectUrl
    });
  }
};
