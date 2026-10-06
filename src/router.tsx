import { QueryClient } from "@tanstack/react-query";
import { createRouter, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { ErrorState } from "@/components/finops/States";

function PageError({ reset }: ErrorComponentProps) {
  const router = useRouter();
  return <ErrorState message="This page failed to load. The rest of the app still works." onRetry={() => { router.invalidate(); reset(); }} />;
}
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: PageError,
  });

  return router;
};
