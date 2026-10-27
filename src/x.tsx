import { createFileRoute, stripSearchParams, Link } from "@tanstack/react-router";
import { fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
const schema = z.object({ q: fallback(z.string(), "").default("") });
const defaults = { q: "" };
export const Route = createFileRoute("/x")({
  validateSearch: (search: Partial<z.infer<typeof schema>>) => schema.parse(search),
  search: { middlewares: [stripSearchParams(defaults)] },
  component: () => null,
});
export const _t = Route.useSearch();
export const _l = <Link to="/x">go</Link>;
