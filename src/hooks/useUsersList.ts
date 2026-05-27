import { useCallback, useEffect, useState } from 'react';
import { usersApi, type ApiUser } from '../utils/apiClient';

export function useUsersList(enabled = true) {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(enabled);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const res = await usersApi.list();
      const body = await res.json();
      setUsers(Array.isArray(body) ? body : []);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { users, setUsers, loading, reload };
}
