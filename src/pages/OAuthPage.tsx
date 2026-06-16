import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useNotificationStore, useThemeStore } from '@/stores';
import { oauthApi, type OAuthProvider } from '@/services/api/oauth';
import { apiClient } from '@/services/api/client';
import { vertexApi, type VertexImportResponse } from '@/services/api/vertex';
import { copyToClipboard } from '@/utils/clipboard';
import { getErrorMessage, isRecord } from '@/utils/helpers';
import { OAUTH_PROVIDER_GROUPS, type AltAuthMethod } from '@/features/oauth/providers';
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
import iconQwen from '@/assets/icons/qwen.svg';
import iconOpenaiLight from '@/assets/icons/openai-light.svg';
import iconOpenaiDark from '@/assets/icons/openai-dark.svg';

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
  codeInput?: string;
  codeSubmitting?: boolean;
  codeError?: string;
}

interface VertexImportResult {
  projectId?: string;
  email?: string;
  location?: string;
  authFile?: string;
}

interface VertexImportState {
  file?: File;
  fileName: string;
  location: string;
  loading: boolean;
  error?: string;
  result?: VertexImportResult;
}

function getErrorStatus(error: unknown): number | undefined {
  if (!isRecord(error)) return undefined;
  return typeof error.status === 'number' ? error.status : undefined;
}

const getIcon = (icon: string | { light: string; dark: string }, theme: 'light' | 'dark') => {
  return typeof icon === 'string' ? icon : icon[theme];
};

const PROVIDER_ICONS: Partial<Record<OAuthProvider, string | { light: string; dark: string }>> = {
  codex: iconCodex,
  anthropic: iconClaude,
  antigravity: iconAntigravity,
  'gemini-cli': iconGemini,
  kimi: { light: iconKimiLight, dark: iconKimiDark },
  xai: { light: iconGrok, dark: iconGrokDark },
  iflow: iconIflow,
  qwen: iconQwen,
  openai: { light: iconOpenaiLight, dark: iconOpenaiDark },
  cline: iconClaude,
  'xiaomi-mimo': iconQwen,
  'xiaomi-tokenplan': iconQwen,
  'mimo-free': iconQwen,
};

const getProviderIcon = (provider: OAuthProvider, theme: 'light' | 'dark'): string | null => {
  const icon = PROVIDER_ICONS[provider];
  if (!icon) return null;
  return getIcon(icon, theme);
};

const XAI_CALLBACK_URL = 'http://127.0.0.1:56121/callback';
const SUCCESS_RESET_DELAY_MS = 5000;
const getProviderI18nPrefix = (provider: OAuthProvider) => provider.replace('-', '_');
const getAuthKey = (provider: OAuthProvider, suffix: string) =>
  `auth_login.${getProviderI18nPrefix(provider)}_${suffix}`;

const isAbsoluteUrl = (value: string): boolean => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const readQueryLikeCallbackInput = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const queryStart = trimmed.indexOf('?');
  const hashStart = trimmed.indexOf('#');
  const rawParams =
    queryStart >= 0
      ? trimmed.slice(queryStart + 1)
      : hashStart >= 0
        ? trimmed.slice(hashStart + 1)
        : trimmed;

  if (!/(^|[&#?])(code|state|error)=/i.test(rawParams)) return null;
  return new URLSearchParams(rawParams.replace(/^[?#]/, ''));
};

const extractDisplayedXaiCode = (value: string): string => {
  const trimmed = value.trim();
  const codeMatch = trimmed.match(/\bcode\s*[:=]\s*([^\s&]+)/i);
  return (codeMatch?.[1] ?? trimmed).trim();
};

const buildXaiCallbackUrl = (input: string, state?: string): string | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (isAbsoluteUrl(trimmed)) return trimmed;

  const params = readQueryLikeCallbackInput(trimmed);
  if (params) {
    const code = params.get('code')?.trim();
    const error = params.get('error')?.trim();
    const errorDescription = params.get('error_description')?.trim();
    const callbackState = params.get('state')?.trim() || state?.trim();
    if (!callbackState) return null;

    const callbackUrl = new URL(XAI_CALLBACK_URL);
    callbackUrl.searchParams.set('state', callbackState);
    if (code) callbackUrl.searchParams.set('code', code);
    if (error) callbackUrl.searchParams.set('error', error);
    if (errorDescription) callbackUrl.searchParams.set('error_description', errorDescription);
    return callbackUrl.toString();
  }

  const code = extractDisplayedXaiCode(trimmed);
  const callbackState = state?.trim();
  if (!code || !callbackState) return null;

  const callbackUrl = new URL(XAI_CALLBACK_URL);
  callbackUrl.searchParams.set('code', code);
  callbackUrl.searchParams.set('state', callbackState);
  return callbackUrl.toString();
};

const resolveCallbackUrl = (
  provider: OAuthProvider,
  input: string,
  state?: string
): string | null => {
  if (provider !== 'xai') return input.trim();
  return buildXaiCallbackUrl(input, state);
};

export function OAuthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showNotification } = useNotificationStore();
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const [states, setStates] = useState<Record<OAuthProvider, ProviderState>>({} as Record<OAuthProvider, ProviderState>);
  const [vertexState, setVertexState] = useState<VertexImportState>({
    fileName: '',
    location: '',
    loading: false
  });
  const pollingTimers = useRef<Partial<Record<OAuthProvider, number>>>({});
  const successResetTimers = useRef<Partial<Record<OAuthProvider, number>>>({});
  const vertexFileInputRef = useRef<HTMLInputElement | null>(null);

  const clearTimers = useCallback(() => {
    Object.values(pollingTimers.current).forEach((timer) => {
      if (timer !== undefined) window.clearInterval(timer);
    });
    Object.values(successResetTimers.current).forEach((timer) => {
      if (timer !== undefined) window.clearTimeout(timer);
    });
    pollingTimers.current = {};
    successResetTimers.current = {};
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  const updateProviderState = (provider: OAuthProvider, next: Partial<ProviderState>) => {
    setStates((prev) => ({
      ...prev,
      [provider]: { ...(prev[provider] ?? {}), ...next }
    }));
  };

  const clearPollingTimer = (provider: OAuthProvider) => {
    const timer = pollingTimers.current[provider];
    if (timer !== undefined) {
      window.clearInterval(timer);
      delete pollingTimers.current[provider];
    }
  };

  const clearSuccessResetTimer = (provider: OAuthProvider) => {
    const timer = successResetTimers.current[provider];
    if (timer !== undefined) {
      window.clearTimeout(timer);
      delete successResetTimers.current[provider];
    }
  };

  const clearProviderTimers = (provider: OAuthProvider) => {
    clearPollingTimer(provider);
    clearSuccessResetTimer(provider);
  };

  const resetProviderAttempt = (provider: OAuthProvider) => {
    clearProviderTimers(provider);
    setStates((prev) => {
      const current = prev[provider] ?? {};
      const next: ProviderState = {};
      if (provider === 'gemini-cli' && current.projectId !== undefined) {
        next.projectId = current.projectId;
      }
      return {
        ...prev,
        [provider]: next
      };
    });
  };

  const completeProviderAuth = (provider: OAuthProvider) => {
    clearPollingTimer(provider);
    clearSuccessResetTimer(provider);
    updateProviderState(provider, {
      url: undefined,
      state: undefined,
      status: 'success',
      error: undefined,
      polling: false,
      callbackUrl: '',
      callbackSubmitting: false,
      callbackStatus: undefined,
      callbackError: undefined
    });
    successResetTimers.current[provider] = window.setTimeout(() => {
      resetProviderAttempt(provider);
    }, SUCCESS_RESET_DELAY_MS);
  };

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
      codeInput: undefined,
      codeSubmitting: false,
      codeError: undefined,
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

  const submitXiaomiMimoCode = async (provider: OAuthProvider) => {
    const state = states[provider];
    const code = state?.codeInput?.trim();
    if (!code || !state?.state) return;

    updateProviderState(provider, { codeSubmitting: true, codeError: undefined });
    try {
      const res = await oauthApi.xiaomiMimoCallback(code, state.state);
      updateProviderState(provider, {
        codeSubmitting: false,
        status: 'success',
        codeInput: '',
      });
      showNotification(res.message || t('auth_login.xiaomi_mimo_oauth_status_success'), 'success');
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      updateProviderState(provider, {
        codeSubmitting: false,
        codeError: message || t('auth_login.xiaomi_mimo_oauth_status_error'),
      });
      showNotification(message || t('auth_login.xiaomi_mimo_oauth_status_error'), 'error');
    }
  };

  const copyLink = async (url?: string) => {
    if (!url) return;
    const copied = await copyToClipboard(url);
    showNotification(
      t(copied ? 'notification.link_copied' : 'notification.copy_failed'),
      copied ? 'success' : 'error'
    );
  };

  const submitCallback = async (provider: OAuthProvider) => {
    const callbackInput = (states[provider]?.callbackUrl || '').trim();
    if (!callbackInput) {
      showNotification(
        t(provider === 'xai' ? 'auth_login.xai_callback_required' : 'auth_login.oauth_callback_required'),
        'warning'
      );
      return;
    }
    const redirectUrl = resolveCallbackUrl(provider, callbackInput, states[provider]?.state);
    if (!redirectUrl) {
      showNotification(t(provider === 'xai' ? 'auth_login.xai_callback_state_missing' : 'auth_login.missing_state'), 'warning');
      return;
    }
    updateProviderState(provider, {
      callbackSubmitting: true,
      callbackStatus: undefined,
      callbackError: undefined
    });
    try {
      await oauthApi.submitCallback(provider, redirectUrl);
      updateProviderState(provider, { callbackSubmitting: false, callbackStatus: 'success' });
      showNotification(t('auth_login.oauth_callback_success'), 'success');
    } catch (err: unknown) {
      const status = getErrorStatus(err);
      const message = getErrorMessage(err);
      const errorMessage =
        status === 404
          ? t('auth_login.oauth_callback_upgrade_hint', {
              defaultValue: 'Please update CLI Proxy API or check the connection.'
            })
          : message || undefined;
      updateProviderState(provider, {
        callbackSubmitting: false,
        callbackStatus: 'error',
        callbackError: errorMessage
      });
      const notificationMessage = errorMessage
        ? `${t('auth_login.oauth_callback_error')} ${errorMessage}`
        : t('auth_login.oauth_callback_error');
      showNotification(notificationMessage, 'error');
    }
  };

  const submitAltAuth = async (provider: OAuthProvider, method: AltAuthMethod) => {
    const fields = states[provider]?.altAuthFields || {};
    const missing = method.fields.filter((f) => f.required && !fields[f.name]?.trim());
    if (missing.length > 0) {
      showNotification(t('auth_login.alt_auth_required_fields', { defaultValue: 'Please fill in all required fields' }), 'warning');
      return;
    }
    updateProviderState(provider, { altAuthSubmitting: true, altAuthError: undefined, altAuthResult: undefined });
    try {
      const payload: Record<string, string> = {};
      method.fields.forEach((f) => {
        const val = fields[f.name]?.trim();
        if (val) payload[f.name] = val;
      });
      const res = await apiClient.post<{ status: string; saved_path?: string; username?: string; email?: string; expired?: string; type?: string }>(method.endpoint, payload);
      updateProviderState(provider, {
        altAuthSubmitting: false,
        altAuthResult: (isRecord(res) && (res.username || res.email)) || t('auth_login.alt_auth_success', { defaultValue: 'Authentication successful!' }),
      });
      showNotification(t('auth_login.alt_auth_success', { defaultValue: 'Authentication successful!' }), 'success');
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      updateProviderState(provider, {
        altAuthSubmitting: false,
        altAuthError: message || t('auth_login.alt_auth_error', { defaultValue: 'Authentication failed' }),
      });
      showNotification(message || t('auth_login.alt_auth_error', { defaultValue: 'Authentication failed' }), 'error');
    }
  };

  const handleVertexFilePick = () => {
    vertexFileInputRef.current?.click();
  };

  const handleVertexFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      showNotification(t('vertex_import.file_required'), 'warning');
      event.target.value = '';
      return;
    }
    setVertexState((prev) => ({
      ...prev,
      file,
      fileName: file.name,
      error: undefined,
      result: undefined
    }));
    event.target.value = '';
  };

  const handleVertexImport = async () => {
    if (!vertexState.file) {
      const message = t('vertex_import.file_required');
      setVertexState((prev) => ({ ...prev, error: message }));
      showNotification(message, 'warning');
      return;
    }
    const location = vertexState.location.trim();
    setVertexState((prev) => ({ ...prev, loading: true, error: undefined, result: undefined }));
    try {
      const res: VertexImportResponse = await vertexApi.importCredential(
        vertexState.file,
        location || undefined
      );
      const result: VertexImportResult = {
        projectId: res.project_id,
        email: res.email,
        location: res.location,
        authFile: res['auth-file'] ?? res.auth_file
      };
      setVertexState((prev) => ({ ...prev, loading: false, result }));
      showNotification(t('vertex_import.success'), 'success');
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      setVertexState((prev) => ({
        ...prev,
        loading: false,
        error: message || t('notification.upload_failed')
      }));
      const notification = message
        ? `${t('notification.upload_failed')}: ${message}`
        : t('notification.upload_failed');
      showNotification(notification, 'error');
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>{t('nav.oauth', { defaultValue: 'OAuth' })}</h1>

      <div className={styles.content}>
        {OAUTH_PROVIDER_GROUPS.map((group) => (
          <div key={group.label} className={styles.providerGroup}>
            <div className={styles.groupHeader}>
              <h2 className={styles.groupTitle}>{group.label}</h2>
              <p className={styles.groupDescription}>{group.description}</p>
            </div>
            <div className={styles.providerGrid}>
              {group.providers.map((provider) => {
            const state = states[provider.id] || {};
            const canSubmitCallback = provider.callbackSupported && Boolean(state.url);
            const statusBadgeClassName = [
              'status-badge',
              state.status === 'success' ? 'success' : '',
              state.status === 'error' ? 'error' : ''
            ]
              .filter(Boolean)
              .join(' ');
            const providerIcon = getProviderIcon(provider.id, resolvedTheme);
            return (
              <div key={provider.id} className={styles.providerCard}>
                <Card
                  title={
                    <span className={styles.cardTitle}>
                      {providerIcon && (
                        <img
                          src={providerIcon}
                          alt=""
                          className={styles.cardTitleIcon}
                        />
                      )}
                      {provider.name}
                    </span>
                  }
                  extra={
                    provider.id === 'kiro' && !state.selectedMethod
                      ? null
                      : (
                          <Button
                            onClick={() => startAuth(provider.id)}
                            loading={state.polling || state.altAuthSubmitting}
                          >
                            {state.status === 'success'
                              ? t('auth_login.login_another_account')
                              : t(getAuthKey(provider.id, 'oauth_button'))}
                          </Button>
                        )
                  }
                >
                  <div className={styles.cardContent}>
                    {provider.id === 'kiro' && !state.selectedMethod && (
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
                    )}
                    {provider.id === 'gemini-cli' && (
                      <div className={styles.geminiProjectField}>
                        <Input
                          label={t('auth_login.gemini_cli_project_id_label')}
                          hint={t('auth_login.gemini_cli_project_id_hint')}
                          value={state.projectId || ''}
                          error={state.projectIdError}
                          disabled={Boolean(state.polling)}
                          onChange={(e) =>
                            updateProviderState(provider.id, {
                              projectId: e.target.value,
                              projectIdError: undefined
                            })
                          }
                          placeholder={t('auth_login.gemini_cli_project_id_placeholder')}
                        />
                      </div>
                    )}
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
                    {state.url && (
                      <div className={styles.authUrlBox}>
                        <div className={styles.authUrlLabel}>
                          {t(getAuthKey(provider.id, 'oauth_url_label'), {
                            defaultValue: 'Open the link below to authorize:'
                          })}
                        </div>
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
                    {provider.id === 'xiaomi-mimo' && state.url && (
                      <div className={styles.deviceCodeBox}>
                        <div className={styles.deviceCodeLabel}>
                          {t('auth_login.xiaomi_mimo_code_label')}
                        </div>
                        <input
                          type="text"
                          className={styles.deviceCodeInput}
                          placeholder={t('auth_login.xiaomi_mimo_code_placeholder')}
                          value={state.codeInput || ''}
                          onChange={(e) => updateProviderState(provider.id, { codeInput: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && state.codeInput?.trim()) {
                              submitXiaomiMimoCode(provider.id);
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => submitXiaomiMimoCode(provider.id)}
                          loading={state.codeSubmitting}
                          disabled={!state.codeInput?.trim()}
                        >
                          {t('auth_login.xiaomi_mimo_code_submit')}
                        </Button>
                        {state.codeError && (
                          <div className="status-badge error">{state.codeError}</div>
                        )}
                      </div>
                    )}
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
                    {provider.altMethods && provider.altMethods.length > 0 && (
                      <>
                        <button
                          className={styles.altAuthToggle}
                          onClick={() =>
                            updateProviderState(provider.id, { showAltAuth: !state.showAltAuth })
                          }
                        >
                          {state.showAltAuth
                            ? t('auth_login.alt_auth_hide', { defaultValue: 'Hide alternative auth' })
                            : t('auth_login.alt_auth_show', { defaultValue: 'Use alternative auth' })}
                        </button>
                        {state.showAltAuth && provider.altMethods.map((method) => (
                          <div key={method.type} className={styles.altAuthForm}>
                            <div className={styles.sectionTitle}>{method.label}</div>
                            {method.fields.map((field) => (
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
                                  })
                                }
                                placeholder={field.placeholder}
                              />
                            ))}
                            <div className={styles.altAuthActions}>
                              <Button
                                size="sm"
                                onClick={() => submitAltAuth(provider.id, method)}
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
                        ))}
                      </>
                    )}
                    {state.status && state.status !== 'idle' && (
                      <div className={statusBadgeClassName}>
                        {state.status === 'success'
                          ? t(getAuthKey(provider.id, 'oauth_status_success'))
                          : state.status === 'error'
                            ? `${t(getAuthKey(provider.id, 'oauth_status_error'))} ${state.error || ''}`
                            : t(getAuthKey(provider.id, 'oauth_status_waiting'))}
                      </div>
                    )}
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
        ))}

        {/* Vertex JSON 登录 */}
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
}
