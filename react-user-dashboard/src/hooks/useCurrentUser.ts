import { useEffect, useState } from 'react';
import { usersApi, type ApiUser } from '../utils/apiClient';

export function useCurrentUser() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const token = localStorage.getItem('authToken');
      if (!token) {
        if (!cancelled) {
          setLoading(false);
          setUser(null);
        }
        return;
      }

      try {
        const res = await usersApi.me();
        const data = (await res.json().catch(() => null)) as ApiUser | { error?: string } | null;
        if (cancelled) return;
        if (!res.ok) {
          setError((data as { error?: string } | null)?.error || 'Could not load your account.');
          setUser(null);
        } else {
          setUser(data as ApiUser);
        }
      } catch {
        if (!cancelled) {
          setError('Could not load your account.');
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { user, loading, error, setUser };
}

