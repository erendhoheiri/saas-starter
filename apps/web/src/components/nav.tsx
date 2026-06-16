import { Link, useNavigate } from "@tanstack/react-router"
import { signOut } from "@/lib/auth"
import { OrgSwitcher } from "./org-switcher"
import { Button } from "@/components/ui/button"

export function Nav() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut()
    navigate({ to: "/login" })
  }

  return (
    <header className="border-b px-6 py-3 flex items-center gap-4">
      <OrgSwitcher />
      <nav className="flex-1 flex gap-4">
        <Link to="/dashboard" className="text-sm font-medium hover:underline">
          Dashboard
        </Link>
        <Link to="/settings" className="text-sm font-medium hover:underline">
          Settings
        </Link>
        <Link to="/org" className="text-sm font-medium hover:underline">
          Organization
        </Link>
      </nav>
      <Button variant="ghost" onClick={handleLogout}>
        Sign out
      </Button>
    </header>
  )
}
