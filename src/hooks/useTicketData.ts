import { useCallback } from 'react';
import {
  categoriesApi,
  ticketsApi,
  type AdminWorkload,
  type ApiCategory,
  type ApiTicket,
  type SolvedByAssignee,
  type TicketThroughput,
} from '../utils/apiClient';
import { invalidateApiCache, useApiSWR } from './useApiSWR';

function ticketsCacheKey(scope: { scope?: string; status?: string } | undefined): string | null {
  if (!scope) return null;
  return `tickets:${JSON.stringify(scope)}`;
}

async function parseTicketList(res: Response): Promise<ApiTicket[]> {
  const body = await res.json().catch(() => []);
  return Array.isArray(body) ? body : [];
}

async function parseCategoryList(res: Response): Promise<ApiCategory[]> {
  const body = await res.json().catch(() => []);
  return Array.isArray(body) ? body : [];
}

export function useTicketList(scope: { scope?: 'org' | 'team' | 'assigned' | 'submitted'; status?: string } | undefined) {
  const key = ticketsCacheKey(scope);
  const fetcher = useCallback(async () => {
    const res = await ticketsApi.list(scope);
    if (!res.ok) throw new Error('Could not load tickets.');
    return parseTicketList(res);
  }, [scope]);

  const { data, error, loading, revalidate, mutate } = useApiSWR<ApiTicket[]>(key, fetcher);

  return {
    tickets: data ?? [],
    error,
    loading,
    revalidate,
    mutate,
  };
}

export function useTicketCategories(enabled = true) {
  const fetcher = useCallback(async () => {
    const res = await categoriesApi.list();
    if (!res.ok) throw new Error('Could not load categories.');
    return parseCategoryList(res);
  }, []);

  const { data, loading } = useApiSWR<ApiCategory[]>(enabled ? 'categories:all' : null, fetcher, { ttl: 60_000 });

  return {
    categories: data ?? [],
    loading,
  };
}

export function invalidateTicketListCache() {
  invalidateApiCache('tickets:');
}

export function useAdminWorkload(enabled = true) {
  const fetcher = useCallback(async () => {
    const res = await ticketsApi.workload();
    if (!res.ok) throw new Error('Could not load workload.');
    const body = await res.json().catch(() => []);
    return Array.isArray(body) ? body as AdminWorkload[] : [];
  }, []);

  const { data, loading } = useApiSWR<AdminWorkload[]>(enabled ? 'tickets:workload' : null, fetcher, { ttl: 30_000 });
  return { workload: data ?? [], loading };
}

export function useSolvedByAssignee(period: string, enabled = true) {
  const fetcher = useCallback(async () => {
    const res = await ticketsApi.stats.solvedByAssignee(period);
    if (!res.ok) throw new Error('Could not load solved stats.');
    const body = await res.json().catch(() => []);
    return Array.isArray(body) ? body as SolvedByAssignee[] : [];
  }, [period]);

  const { data, loading } = useApiSWR<SolvedByAssignee[]>(
    enabled ? `tickets:solved:${period}` : null,
    fetcher,
    { ttl: 60_000 },
  );

  return { solvedByAssignee: data ?? [], loading };
}

export function useTicketThroughput(enabled = true) {
  const fetcher = useCallback(async () => {
    const res = await ticketsApi.stats.throughput();
    if (!res.ok) throw new Error('Could not load throughput stats.');
    const body = await res.json().catch(() => []);
    return Array.isArray(body) ? body as TicketThroughput[] : [];
  }, []);

  const { data, loading } = useApiSWR<TicketThroughput[]>(
    enabled ? 'tickets:throughput:7d' : null,
    fetcher,
    { ttl: 60_000 },
  );

  return { throughput: data ?? [], loading };
}
