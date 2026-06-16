import { useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useSession } from "@/lib/auth"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"

export function ImpersonationBanner() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const isImpersonating = !!(session as any)?.session?.impersonatedBy
  const targetUserEmail = (session as any)?.user?.email

  if (!isImpersonating) return null

  async function handleExit() {
    await (api as any).api.admin.impersonate.exit.$post()
    await queryClient.invalidateQueries()
    navigate({ to: "/admin/users" })
  }

  return (
    <div className="bg-yellow-400 text-yellow-900 px-4 py-2 flex items-center justify-between text-sm font-medium">
      <span>
        Viewing as <strong>{targetUserEmail}</strong>
      </span>
      <Button
        variant="outline"
        size="sm"
        className="border-yellow-700 text-yellow-900 hover:bg-yellow-300"
        onClick={handleExit}
      >
        Exit impersonation
      </Button>
    </div>
  )
}
