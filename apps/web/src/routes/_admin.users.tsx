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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Ban, ChevronLeft, ChevronRight, Eye, Search, ShieldCheck, ShieldX, UserCheck, Users } from "lucide-react";
import { api } from "@/lib/api";
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

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", debouncedSearch, page],
    queryFn: async () => {
      const res = await (api as any).api.admin.users.$get({
        query: {
          q: debouncedSearch || undefined,
          page: String(page),
          limit: "20",
        },
      });
      return res.json() as Promise<{
        data: AdminUser[];
        total: number;
        page: number;
        limit: number;
      }>;
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await (api as any).api.admin.users[":userId"].suspend.$post({
        param: { userId },
      });
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const unsuspendMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await (api as any).api.admin.users[":userId"].unsuspend.$post(
        { param: { userId } },
      );
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const impersonateMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await (api as any).api.admin.users[
        ":userId"
      ].impersonate.$post({ param: { userId } });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      navigate({ to: "/admin/users" });
    },
  });

  const users = data?.data ?? [];
  const total = data?.total ?? 0;
  const limit = data?.limit ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground">Manage user accounts</p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by email or name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
        {total > 0 && (
          <span className="text-sm text-muted-foreground">
            {total} user{total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Suspended</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No users found.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Suspended</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="text-foreground">{user.email}</TableCell>
                  <TableCell className="text-foreground">{user.name ?? "—"}</TableCell>
                  <TableCell>
                    {user.role === "admin" ? (
                      <Badge variant="default">admin</Badge>
                    ) : user.role === "user" ? (
                      <Badge variant="secondary">user</Badge>
                    ) : (
                      <Badge variant="outline">{user.role ?? "user"}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.bannedAt ? (
                      <Badge variant="destructive">
                        <Ban className="h-3 w-3 mr-1" />
                        Suspended
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">Active</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {user.bannedAt ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unsuspendMutation.mutate(user.id)}
                          disabled={unsuspendMutation.isPending}
                          className="gap-1.5"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          Unsuspend
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => suspendMutation.mutate(user.id)}
                          disabled={suspendMutation.isPending}
                          className="gap-1.5"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          Suspend
                        </Button>
                      )}
                      {user.role !== "admin" && !user.bannedAt && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => impersonateMutation.mutate(user.id)}
                          disabled={impersonateMutation.isPending}
                          className="gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Impersonate
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="gap-1.5"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="gap-1.5"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
