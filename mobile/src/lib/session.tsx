import { tokenStore } from '@/lib/token-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { AccountResponse, LoginResponse, MobileAccount } from '@contract';
import { api, ApiError, configureApi } from '@/lib/api';
import { APP_VERSION, PLATFORM } from '@/lib/config';
import { clearPickerCache } from '@/components/member-picker';

/**
 * Sign-in state. The token lives only in the OS keychain/keystore
 * (expo-secure-store) — never AsyncStorage — and the account is refetched
 * from /me at launch so suspensions, activation and "sign out everywhere"
 * done elsewhere take effect the next time the app opens.
 */

const TOKEN_KEY = 'bwf.session.token';

type SessionState = {
  isLoading: boolean;
  token: string | null;
  account: MobileAccount | null;
  signIn: (identifier: string, password: string) => Promise<void>;
  /** Swap in a token+account the server issued (after activation). */
  adopt: (response: LoginResponse) => Promise<void>;
  signOut: (options?: { everywhere?: boolean }) => Promise<void>;
  refreshAccount: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [isLoading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [account, setAccount] = useState<MobileAccount | null>(null);

  const clear = useCallback(async () => {
    await tokenStore.remove(TOKEN_KEY).catch(() => undefined);
    clearPickerCache();
    setToken(null);
    setAccount(null);
  }, []);

  const refreshAccount = useCallback(async () => {
    const { account: fresh } = await api.get<AccountResponse>('/me');
    setAccount(fresh);
  }, []);

  useEffect(() => {
    configureApi({
      token,
      onUnauthorized: () => void clear(),
      onActivationRequired: () => void refreshAccount().catch(() => undefined),
    });
  }, [token, clear, refreshAccount]);

  // Launch: restore the saved token and confirm it's still valid.
  useEffect(() => {
    (async () => {
      try {
        const saved = await tokenStore.get(TOKEN_KEY);
        if (!saved) return;
        configureApi({ token: saved, onUnauthorized: () => undefined, onActivationRequired: () => undefined });
        try {
          const { account: fresh } = await api.get<AccountResponse>('/me');
          setToken(saved);
          setAccount(fresh);
        } catch (error) {
          // Offline at launch: keep the session; screens show their own retry.
          if (error instanceof ApiError && error.status === 0) setToken(saved);
          else await tokenStore.remove(TOKEN_KEY);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const adopt = useCallback(async (response: LoginResponse) => {
    await tokenStore.set(TOKEN_KEY, response.token);
    setToken(response.token);
    setAccount(response.account);
  }, []);

  const signIn = useCallback(
    async (identifier: string, password: string) => {
      const response = await api.postWithToken<LoginResponse>(
        '/auth/login',
        { identifier, password, platform: PLATFORM, appVersion: APP_VERSION },
        null,
      );
      await adopt(response);
    },
    [adopt],
  );

  const signOut = useCallback(
    async (options: { everywhere?: boolean } = {}) => {
      try {
        await api.post(options.everywhere ? '/auth/sign-out-everywhere' : '/auth/logout');
      } catch {
        // Signing out locally must always work, even offline.
      }
      await clear();
    },
    [clear],
  );

  const value = useMemo(
    () => ({ isLoading, token, account, signIn, adopt, signOut, refreshAccount }),
    [isLoading, token, account, signIn, adopt, signOut, refreshAccount],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
