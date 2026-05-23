import { createContext, useCallback, useContext, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { usersApi, type ApiUser } from '../utils/apiClient';

type UserContextValue = {
  user: ApiUser | null;
  loading: boolean;
  error: string;
  refetch: () => Promise<ApiUser | null>;
  setUser: Dispatch<SetStateAction<ApiUser | null>>;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(() => !!localStorage.getItem('authToken'));
  const [error, setError] = useState('');

  const fetchUser = useCallback(async (): Promise<ApiUser | null> => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const res = await usersApi.me();
      const data = (await res.json().catch(() => null)) as ApiUser | { error?: string } | null;
      if (!res.ok) {
        setError((data as { error?: string } | null)?.error || 'Could not load account.');
        setUser(null);
        return null;
      }
      const nextUser = data as ApiUser;
      setUser(nextUser);
      setError('');
      return nextUser;
    } catch {
      setError('Could not load account.');
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  return (
    <UserContext.Provider value={{ user, loading, error, refetch: fetchUser, setUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUserContext must be used inside UserProvider');
  return ctx;
}
