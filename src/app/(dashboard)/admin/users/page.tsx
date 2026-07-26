import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUsers } from "@/actions/admin";
import AdminUsersClient from "./AdminUsersClient";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role;
  if (role !== "ADMIN") redirect("/dashboard");

  const users = await getUsers();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="metro-page-title">User Management</h1>
          <p className="text-metro-text-secondary">Manage all users in the system.</p>
        </div>
      </div>

      <AdminUsersClient users={users} />
    </div>
  );
}
