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
  toast,
} from "@starter/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createRoute, useNavigate } from "@tanstack/react-router";
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  Eye,
  Search,
  UserCheck,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Page, PageHeader } from "@/components/page";
import { useDebounce } from "@/hooks/useDebounce";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { adminLayoutRoute } from "@/routes/_admin";

export const adminUsersRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin/users",
  component: AdminUsersPage,
});

type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  bannedAt: string | Date | null;
  createdAt: string | Date;
};

const COLUMNS = ["Email", "Name", "Role", "Status", "Created", "Actions"];

function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", debouncedSearch, page],
    queryFn: async () => {
      const res = await api.api.admin.users.$get({
        query: {
          q: debouncedSearch || undefined,
          page: String(page),
          limit: "20",
        },
      });
      return (await res.json()) as {
        data: AdminUser[];
        total: number;
        page: number;
        limit: number;
      };
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });

  const suspend = useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.api.admin.users[":userId"].suspend.$post({
        param: { userId },
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      toast.success("User suspended");
    },
    onError: () => toast.error("Failed to suspend user"),
  });

  const unsuspend = useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.api.admin.users[":userId"].unsuspend.$post({
        param: { userId },
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      toast.success("User reinstated");
    },
    onError: () => toast.error("Failed to reinstate user"),
  });

  const impersonate = useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.api.admin.users[":userId"].impersonate.$post({
        param: { userId },
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      navigate({ to: "/admin/users" });
    },
    onError: () => toast.error("Failed to impersonate user"),
  });

  const users = data?.data ?? [];
  const total = data?.total ?? 0;
  const limit = data?.limit ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <Page>
      <PageHeader
        icon={Users}
        title="Users"
        description="Manage user accounts across the platform"
      />

      <div className="mb-4 flex items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search users"
            placeholder="Search by email or name…"
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
            {total} user{total !== 1 ? "s" : ""}
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
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={COLUMNS.length}
                  className="py-12 text-center"
                >
                  <Users className="mx-auto mb-3 size-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No users found.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium text-foreground">
                    {user.email}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.role === "admin" ? "default" : "secondary"}
                    >
                      {user.role ?? "user"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.bannedAt ? (
                      <Badge variant="destructive">
                        <Ban />
                        Suspended
                      </Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {user.bannedAt ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unsuspend.mutate(user.id)}
                          disabled={unsuspend.isPending}
                        >
                          <UserCheck className="size-3.5" />
                          Reinstate
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => suspend.mutate(user.id)}
                          disabled={suspend.isPending}
                        >
                          <Ban className="size-3.5" />
                          Suspend
                        </Button>
                      )}
                      {user.role !== "admin" && !user.bannedAt && (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Impersonate ${user.email}`}
                          onClick={() => impersonate.mutate(user.id)}
                          disabled={impersonate.isPending}
                        >
                          <Eye className="size-3.5" />
                          Impersonate
                        </Button>
                      )}
                    </div>
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
