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
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage all users in the system.</p>
        </div>
      </div>

      <AdminUsersClient users={users} />
    </div>
  );
}
