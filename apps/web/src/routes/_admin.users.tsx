import { Button, Input } from "@starter/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
      <h1 className="text-2xl font-bold mb-6">Users</h1>
      <div className="mb-4 flex items-center gap-2">
        <Input
          placeholder="Search by email or name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
        />
        {total > 0 && (
          <span className="text-sm text-muted-foreground">
            {total} user{total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : users.length === 0 ? (
        <div className="text-muted-foreground">No users found.</div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Role</th>
                <th className="text-left px-4 py-3 font-medium">Suspended</th>
                <th className="text-left px-4 py-3 font-medium">Created</th>
                <th className="text-left px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">{user.name ?? "—"}</td>
                  <td className="px-4 py-3">{user.role ?? "user"}</td>
                  <td className="px-4 py-3">
                    {user.bannedAt ? (
                      <span className="text-destructive font-medium">Yes</span>
                    ) : (
                      <span className="text-muted-foreground">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {user.bannedAt ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unsuspendMutation.mutate(user.id)}
                          disabled={unsuspendMutation.isPending}
                        >
                          Unsuspend
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => suspendMutation.mutate(user.id)}
                          disabled={suspendMutation.isPending}
                        >
                          Suspend
                        </Button>
                      )}
                      {user.role !== "admin" && !user.bannedAt && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => impersonateMutation.mutate(user.id)}
                          disabled={impersonateMutation.isPending}
                        >
                          Impersonate
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
