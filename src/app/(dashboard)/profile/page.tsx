import { redirect } from "next/navigation"
import ProfileContent from "./ProfileContent"

export default async function ProfilePage() {
  const { auth } = await import("@/lib/auth")
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }
  const user = session.user as {
    name: string | null
    email: string | null
    role: string | null
  }

  return <ProfileContent user={user} />
}
