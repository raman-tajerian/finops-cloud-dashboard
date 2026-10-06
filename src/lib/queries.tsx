import type { ReactNode } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useGlobalFilters } from "@/lib/filters";
import { CardBoundary, CardSkeleton, ErrorState } from "@/components/finops/States";
import type { DashboardDto, GroupBy } from "@/types/finops";

/** Dashboard data for the active URL filters; the key includes every filter. */
export function useDashboard() {
  const { filters } = useGlobalFilters();
  return useQuery({ queryKey: ["dashboard", filters], queryFn: () => api.getDashboard(filters), placeholderData: keepPreviousData, staleTime: 60_000 });
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
