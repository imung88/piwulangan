import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getServerT } from "@/lib/i18n/serverT";
import { getUsers } from "@/actions/admin";
import AdminUsersClient from "./AdminUsersClient";

export default async function AdminUsersPage() {
  const t = await getServerT();
  const headerTitle = t("adminUsers.headerTitle");
  const headerDesc = t("adminUsers.headerDesc");

  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role;
  if (role !== "ADMIN") redirect("/dashboard");

  const users = (await getUsers()).map((u) => ({
    ...u,
    dateOfBirth: u.dateOfBirth ? u.dateOfBirth.toISOString().slice(0, 10) : null,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="metro-page-title">{headerTitle}</h1>
          <p className="text-metro-text-secondary">{headerDesc}</p>
        </div>
      </div>

      <AdminUsersClient users={users} />
    </div>
  );
}
