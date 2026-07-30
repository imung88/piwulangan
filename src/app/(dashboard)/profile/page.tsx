import { redirect } from "next/navigation"
import ProfileContent from "./ProfileContent"
import { db } from "@/lib/db"
import { isSuperadminId } from "@/lib/superadmin"

export default async function ProfilePage() {
  const { auth } = await import("@/lib/auth")
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  const user = await db.user.findUnique({
    where: { id: (session.user as { id: string }).id },
    select: {
      name: true,
      email: true,
      phone: true,
      address: true,
      dateOfBirth: true,
      notes: true,
      role: true,
    },
  })

  if (!user) {
    redirect("/login")
  }

  const isSuperadmin = isSuperadminId((session.user as { id: string }).id)

  return (
    <ProfileContent
      canChangePassword={!isSuperadmin}
      canEditProfile={!isSuperadmin}
      user={{
        ...user,
        dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : null,
      }}
    />
  )
}
