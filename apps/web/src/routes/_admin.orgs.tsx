import { createRoute } from "@tanstack/react-router"
import { adminLayoutRoute } from "@/routes/_admin"
import { useQuery } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { api as _api } from "@/lib/api"

export const adminOrgsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: "/admin/orgs",
  component: AdminOrgsPage,
})

type AdminOrg = {
  id: string
  name: string
  slug: string
  deletedAt: string | Date | null
  createdAt: string | Date
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function AdminOrgsPage() {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 300)
  const api = _api as any

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orgs", debouncedSearch, page],
    queryFn: async () => {
      const res = await api.api.admin.orgs.$get({
        query: { q: debouncedSearch || undefined, page: String(page), limit: "20" },
      })
      return res.json() as Promise<{ data: AdminOrg[]; total: number; page: number; limit: number }>
    },
  })

  const orgs = data?.data ?? []
  const total = data?.total ?? 0
  const limit = data?.limit ?? 20
  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Admin — Organizations</h1>
      <div className="mb-4 flex items-center gap-2">
        <Input
          placeholder="Search by name or slug..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="max-w-sm"
        />
        {total > 0 && (
          <span className="text-sm text-muted-foreground">
            {total} org{total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : orgs.length === 0 ? (
        <div className="text-muted-foreground">No organizations found.</div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Slug</th>
                <th className="text-left px-4 py-3 font-medium">Created</th>
                <th className="text-left px-4 py-3 font-medium">Deleted</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((org) => (
                <tr key={org.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3">{org.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{org.slug}</td>
                  <td className="px-4 py-3">
                    {new Date(org.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {org.deletedAt ? (
                      <span className="text-destructive font-medium">
                        {new Date(org.deletedAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
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
  )
}
