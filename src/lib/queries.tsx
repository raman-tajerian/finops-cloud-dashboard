import type { ReactNode } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSession } from '@/lib/session-store';
import { useGlobalFilters } from "@/lib/filters";
import { CardBoundary, CardSkeleton, ErrorState } from "@/components/finops/States";
import type { DashboardDto, GroupBy } from "@/types/finops";

/** Dashboard data for the active URL filters; the key includes every filter. */
export function useMlAnomalies() {
  const { filters } = useGlobalFilters(), version = useSession(s => s.model.active);
  return useQuery({ queryKey: ['ml-anomalies', filters, version], queryFn: () => api.getMlAnomalies(filters, version), staleTime: 60_000 });
}
export function useMlForecast() {
  const { filters } = useGlobalFilters(), version = useSession(s => s.model.active);
  return useQuery({ queryKey: ['ml-forecast', filters, version], queryFn: () => api.getMlForecast(filters, version), staleTime: 60_000 });
}
export function useMlModels() {
  const { filters } = useGlobalFilters(), version = useSession(s => s.model.active);
  return useQuery({ queryKey: ['ml-models', filters, version], queryFn: () => api.getMlModels(filters, version), staleTime: 60_000 });
}
export function useMlPipeline() {
  const { filters } = useGlobalFilters(), version = useSession(s => s.model.active);
  return useQuery({ queryKey: ['ml-pipeline', filters, version], queryFn: () => api.getMlPipeline(filters, version), staleTime: 60_000 });
}

export function useDashboard() {
  const { filters } = useGlobalFilters();
  return useQuery({ queryKey: ["dashboard", filters], queryFn: () => api.getDashboard(filters), placeholderData: keepPreviousData, staleTime: 60_000 });
}

export function useFernScore() {
  const { filters } = useGlobalFilters();
  return useQuery({ queryKey: ["fern-score", filters], queryFn: () => api.getFernScore(filters), staleTime: 60_000 });
}
export function useInsights() {
  const { filters } = useGlobalFilters();
  return useQuery({ queryKey: ["insights", filters], queryFn: () => api.getInsights(filters), staleTime: 60_000 });
}

export function useCommitments() {
  const { filters } = useGlobalFilters();
  return useQuery({ queryKey: ["commitments", filters], queryFn: () => api.getCommitments(filters), staleTime: 60_000 });
}
export function useTeams() {
  const { filters } = useGlobalFilters();
  return useQuery({ queryKey: ["teams", filters], queryFn: () => api.getTeams(filters), staleTime: 60_000 });
}
export function useNotifications() {
  const { filters } = useGlobalFilters();
  return useQuery({ queryKey: ["notifications", filters], queryFn: () => api.getNotifications(filters), staleTime: 60_000 });
}

/** Only call inside <DataGate>, which guarantees data is loaded. */
export function useDashboardData(): DashboardDto {
  return useDashboard().data as DashboardDto;
}

/** Shows a skeleton while loading, an error card with Retry on failure, otherwise the children. */
export function DataGate({ children, h }: { children: ReactNode; h?: string }) {
  const q = useDashboard();
  if (q.isPending) return <CardSkeleton h={h ?? "h-40"} />;
  if (q.isError) return <ErrorState message="We couldn't load this data. Check your connection and try again." onRetry={() => q.refetch()} />;
  return <CardBoundary onReset={() => q.refetch()}>{children}</CardBoundary>;
}

/** Cost Explorer data; the key includes every global filter plus the grouping. */
export function useExplore(groupBy: GroupBy) {
  const { filters } = useGlobalFilters();
  return useQuery({ queryKey: ["explore", filters, groupBy], queryFn: () => api.getExplore(filters, groupBy), placeholderData: keepPreviousData, staleTime: 60_000 });
}

export function useResources() {
  const { filters } = useGlobalFilters();
  return useQuery({ queryKey: ["resources", filters], queryFn: () => api.getResources(filters), placeholderData: keepPreviousData, staleTime: 60_000 });
}
export function useResource(id: string | undefined) {
  return useQuery({ queryKey: ["resource", id], queryFn: () => id ? api.getResource(id) : Promise.resolve(null), enabled: !!id, staleTime: 60_000 });
}

export function useSustainability() {
  const { filters } = useGlobalFilters();
  return useQuery({ queryKey: ["sustainability", filters], queryFn: () => api.getSustainability(filters), placeholderData: keepPreviousData, staleTime: 60_000 });
}

export function useKubernetes() {
  const { filters } = useGlobalFilters();
  return useQuery({ queryKey: ["kubernetes", filters], queryFn: () => api.getKubernetes(filters), placeholderData: keepPreviousData, staleTime: 60_000 });
}
export function useBudget() {
  const { filters } = useGlobalFilters();
  return useQuery({ queryKey: ["budget", filters], queryFn: () => api.getBudget(filters), placeholderData: keepPreviousData, staleTime: 60_000 });
}
export function useScenario() {
  const { filters } = useGlobalFilters();
  return useQuery({ queryKey: ["scenario", filters], queryFn: () => api.getScenario(filters), placeholderData: keepPreviousData, staleTime: 60_000 });
}
export function useSavings() {
  const { filters } = useGlobalFilters();
  return useQuery({ queryKey: ["savings", filters], queryFn: () => api.getSavings(filters), placeholderData: keepPreviousData, staleTime: 60_000 });
}
export function useAlerts() {
  const { filters } = useGlobalFilters();
  return useQuery({ queryKey: ["alerts", filters], queryFn: () => api.getAlerts(filters), placeholderData: keepPreviousData, staleTime: 60_000 });
}
export function useSecurity() {
  const { filters } = useGlobalFilters();
  return useQuery({ queryKey: ["security", filters], queryFn: () => api.getSecurity(filters), placeholderData: keepPreviousData, staleTime: 60_000 });
}

export function useIntegrations() {
  return useQuery({ queryKey: ["integrations"], queryFn: () => api.getIntegrations(), staleTime: 60_000 });
}
export function useSettings() {
  return useQuery({ queryKey: ["settings"], queryFn: () => api.getSettings(), staleTime: 60_000 });
}
