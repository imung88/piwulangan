import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as any;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>

      <div className="rounded-lg border bg-white p-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-500">Name</label>
          <p className="mt-1 text-gray-900">{user.name}</p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500">Email</label>
          <p className="mt-1 text-gray-900">{user.email}</p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500">Role</label>
          <p className="mt-1">
            <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
              {user.role}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
