import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function ProfilePage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const user = session.user as {
    name: string | null
    email: string | null
    role: string | null
  }

  function roleBadge(r: string | null) {
    switch (r) {
      case "ADMIN":
        return { label: "Admin", color: "bg-metro-chrome-dark text-white" }
      case "INSTRUCTOR":
        return { label: "Instructor", color: "bg-metro-blue text-white" }
      case "STUDENT":
        return { label: "Student", color: "bg-metro-green text-white" }
      case "GUARDIAN":
        return { label: "Guardian", color: "bg-metro-blue-light text-metro-blue" }
      default:
        return { label: r || "Unknown", color: "bg-metro-border text-metro-text-secondary" }
    }
  }

  const { label, color } = roleBadge(user.role)

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="metro-page-title mb-6">My Profile</h1>

      <div className="metro-card p-0">
        {/* Header band */}
        <div className="flex items-center gap-4 bg-metro-blue p-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center bg-metro-chrome-dark text-3xl font-light text-white">
            {(user.name || "?").charAt(0).toUpperCase()}
          </div>
          <p className="text-2xl font-light text-white">{user.name}</p>
        </div>

        <div className="space-y-4 p-8">
          <div>
            <p className="text-metro-text-secondary text-sm font-medium">Name</p>
            <p className="text-lg text-metro-text">{user.name}</p>
          </div>
          <div>
            <p className="text-metro-text-secondary text-sm font-medium">Email</p>
            <p className="text-lg text-metro-text">{user.email}</p>
          </div>
          <div>
            <p className="text-metro-text-secondary text-sm font-medium">Role</p>
            <span className={`metro-badge mt-1 ${color}`}>
              {label}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
