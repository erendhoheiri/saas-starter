import {
  Badge,
  Button,
  Input,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@starter/ui";
import { useQuery } from "@tanstack/react-query";
import { createRoute } from "@tanstack/react-router";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Search,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Page, PageHeader } from "@/components/page";
import { useDebounce } from "@/hooks/useDebounce";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { adminLayoutRoute } from "@/routes/_admin";

export const adminOrgsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin/orgs",
  component: AdminOrgsPage,
});

type AdminOrg = {
  id: string;
  name: string;
  slug: string;
  deletedAt: string | Date | null;
  createdAt: string | Date;
};

const COLUMNS = ["Name", "Slug", "Created", "Status"];

function AdminOrgsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orgs", debouncedSearch, page],
    queryFn: async () => {
      const res = await api.api.admin.orgs.$get({
        query: {
          q: debouncedSearch || undefined,
          page: String(page),
          limit: "20",
        },
      });
      return (await res.json()) as {
        data: AdminOrg[];
        total: number;
        page: number;
        limit: number;
      };
    },
  });

  const orgs = data?.data ?? [];
  const total = data?.total ?? 0;
  const limit = data?.limit ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <Page>
      <PageHeader
        icon={Building2}
        title="Organizations"
        description="Manage organizations across the platform"
      />

      <div className="mb-4 flex items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search organizations"
            placeholder="Search by name or slug…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        {total > 0 && (
          <span className="text-sm text-muted-foreground">
            {total} org{total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {COLUMNS.map((c) => (
                <TableHead key={c}>{c}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton rows
                <TableRow key={`skeleton-${i}`}>
                  {COLUMNS.map((c) => (
                    <TableCell key={c}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : orgs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={COLUMNS.length}
                  className="py-12 text-center"
                >
                  <Building2 className="mx-auto mb-3 size-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No organizations found.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              orgs.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium text-foreground">
                    {org.name}
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                      {org.slug}
                    </code>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(org.createdAt)}
                  </TableCell>
                  <TableCell>
                    {org.deletedAt ? (
                      <Badge variant="destructive">
                        <Trash2 />
                        Deleted {formatDate(org.deletedAt)}
                      </Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="size-3.5" />
            Previous
          </Button>
          <span className="px-2 text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      )}
    </Page>
  );
}
