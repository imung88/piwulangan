"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createUser,
  updateUser,
  deactivateUser,
  activateUser,
  resetPassword,
} from "@/actions/admin";
import {
  linkGuardian,
  unlinkGuardian,
  getLinkedStudents,
  getLinkedGuardians,
} from "@/actions/guardians";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: Date;
  _count: {
    guardianLinks: number;
    studentLinks: number;
  };
};

type LinkedUser = {
  id: string;
  name: string;
  email: string;
};

export default function AdminUsersClient({ users: initialUsers }: { users: User[] }) {
  const router = useRouter();
  const [users] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [linkingUser, setLinkingUser] = useState<User | null>(null);
  const [linkedUsers, setLinkedUsers] = useState<LinkedUser[]>([]);
  const [allStudents, setAllStudents] = useState<LinkedUser[]>([]);
  const [allGuardians, setAllGuardians] = useState<LinkedUser[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedGuardianId, setSelectedGuardianId] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleCreateUser = async (formData: FormData) => {
    const result = await createUser(formData);
    if (result?.error) {
      setMessage({ type: "error", text: typeof result.error === "string" ? result.error : "Validation error" });
    } else {
      setMessage({ type: "success", text: "User created successfully" });
      setShowCreateForm(false);
      router.refresh();
    }
  };

  const handleUpdateUser = async (userId: string, formData: FormData) => {
    const result = await updateUser(userId, formData);
    if (result?.error) {
      setMessage({ type: "error", text: typeof result.error === "string" ? result.error : "Validation error" });
    } else {
      setMessage({ type: "success", text: "User updated successfully" });
      setEditingUser(null);
      router.refresh();
    }
  };

  const handleDeactivate = async (userId: string) => {
    const result = await deactivateUser(userId);
    if (result?.error) {
      setMessage({ type: "error", text: result.error as string });
    } else {
      setMessage({ type: "success", text: "User deactivated" });
      router.refresh();
    }
  };

  const handleActivate = async (userId: string) => {
    const result = await activateUser(userId);
    if (result?.error) {
      setMessage({ type: "error", text: result.error as string });
    } else {
      setMessage({ type: "success", text: "User activated" });
      router.refresh();
    }
  };

  const handleResetPassword = async (userId: string, newPassword: string) => {
    const result = await resetPassword(userId, newPassword);
    if (result?.error) {
      setMessage({ type: "error", text: result.error as string });
    } else {
      setMessage({ type: "success", text: "Password reset successfully" });
      setResetPasswordUser(null);
    }
  };

  // Guardian linking handlers
  useEffect(() => {
    if (linkingUser) {
      if (linkingUser.role === "GUARDIAN") {
        getLinkedStudents(linkingUser.id).then(setLinkedUsers);
        // Get all students for the dropdown
        const students = users.filter((u) => u.role === "STUDENT");
        setAllStudents(students);
      } else if (linkingUser.role === "STUDENT") {
        getLinkedGuardians(linkingUser.id).then(setLinkedUsers);
        // Get all guardians for the dropdown
        const guardians = users.filter((u) => u.role === "GUARDIAN");
        setAllGuardians(guardians);
      }
    }
  }, [linkingUser, users]);

  const handleLinkGuardian = async () => {
    if (!linkingUser || !selectedStudentId) return;
    const result = await linkGuardian(linkingUser.id, selectedStudentId);
    if (result?.error) {
      setMessage({ type: "error", text: result.error as string });
    } else {
      setMessage({ type: "success", text: "Guardian linked to student" });
      setSelectedStudentId("");
      // Refresh linked users
      const updated = await getLinkedStudents(linkingUser.id);
      setLinkedUsers(updated);
    }
  };

  const handleUnlinkGuardian = async (studentId: string) => {
    if (!linkingUser) return;
    const result = await unlinkGuardian(linkingUser.id, studentId);
    if (result?.error) {
      setMessage({ type: "error", text: result.error as string });
    } else {
      setMessage({ type: "success", text: "Guardian unlinked from student" });
      // Refresh linked users
      const updated = await getLinkedStudents(linkingUser.id);
      setLinkedUsers(updated);
    }
  };

  const handleLinkStudent = async () => {
    if (!linkingUser || !selectedGuardianId) return;
    const result = await linkGuardian(selectedGuardianId, linkingUser.id);
    if (result?.error) {
      setMessage({ type: "error", text: result.error as string });
    } else {
      setMessage({ type: "success", text: "Guardian linked to student" });
      setSelectedGuardianId("");
      // Refresh linked users
      const updated = await getLinkedGuardians(linkingUser.id);
      setLinkedUsers(updated);
    }
  };

  const handleUnlinkStudent = async (guardianId: string) => {
    if (!linkingUser) return;
    const result = await unlinkGuardian(guardianId, linkingUser.id);
    if (result?.error) {
      setMessage({ type: "error", text: result.error as string });
    } else {
      setMessage({ type: "success", text: "Guardian unlinked from student" });
      // Refresh linked users
      const updated = await getLinkedGuardians(linkingUser.id);
      setLinkedUsers(updated);
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`rounded-lg p-4 ${
            message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
          <button
            onClick={() => setMessage(null)}
            className="ml-2 underline text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="ALL">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="INSTRUCTOR">Instructor</option>
          <option value="STUDENT">Student</option>
          <option value="GUARDIAN">Guardian</option>
        </select>
        <button
          onClick={() => setShowCreateForm(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Create User
        </button>
      </div>

      {/* Users Table */}
      <div className="rounded-lg border bg-white overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <tr key={user.id} className={!user.active ? "bg-gray-50" : ""}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      user.role === "ADMIN"
                        ? "bg-purple-100 text-purple-800"
                        : user.role === "INSTRUCTOR"
                        ? "bg-blue-100 text-blue-800"
                        : user.role === "STUDENT"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      user.active
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {user.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingUser(user)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setResetPasswordUser(user)}
                      className="text-yellow-600 hover:text-yellow-800"
                    >
                      Reset Password
                    </button>
                    {(user.role === "GUARDIAN" || user.role === "STUDENT") && (
                      <button
                        onClick={() => setLinkingUser(user)}
                        className="text-purple-600 hover:text-purple-800"
                      >
                        Link
                      </button>
                    )}
                    {user.active ? (
                      <button
                        onClick={() => handleDeactivate(user.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivate(user.id)}
                        className="text-green-600 hover:text-green-800"
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <div className="p-6 text-center text-gray-500">No users found</div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Create User</h2>
            <form action={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  name="name"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  name="role"
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="STUDENT">Student</option>
                  <option value="INSTRUCTOR">Instructor</option>
                  <option value="GUARDIAN">Guardian</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Edit User</h2>
            <form
              action={(formData) => handleUpdateUser(editingUser.id, formData)}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  name="name"
                  defaultValue={editingUser.name}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  name="email"
                  type="email"
                  defaultValue={editingUser.email}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  name="role"
                  defaultValue={editingUser.role}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="STUDENT">Student</option>
                  <option value="INSTRUCTOR">Instructor</option>
                  <option value="GUARDIAN">Guardian</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">
              Reset Password for {resetPasswordUser.name}
            </h2>
            <form
              action={(formData) =>
                handleResetPassword(
                  resetPasswordUser.id,
                  formData.get("newPassword") as string
                )
              }
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <input
                  name="newPassword"
                  type="password"
                  required
                  minLength={6}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setResetPasswordUser(null)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Guardian Linking Modal */}
      {linkingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">
              {linkingUser.role === "GUARDIAN"
                ? `Link Students to ${linkingUser.name}`
                : `Link Guardians to ${linkingUser.name}`}
            </h2>

            {/* Current Links */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Current Links</h3>
              {linkedUsers.length === 0 ? (
                <p className="text-sm text-gray-500">No links yet</p>
              ) : (
                <div className="space-y-2">
                  {linkedUsers.map((linked) => (
                    <div
                      key={linked.id}
                      className="flex items-center justify-between bg-gray-50 rounded-lg p-2"
                    >
                      <div>
                        <p className="text-sm font-medium">{linked.name}</p>
                        <p className="text-xs text-gray-500">{linked.email}</p>
                      </div>
                      <button
                        onClick={() =>
                          linkingUser.role === "GUARDIAN"
                            ? handleUnlinkGuardian(linked.id)
                            : handleUnlinkStudent(linked.id)
                        }
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Link */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Add New Link</h3>
              {linkingUser.role === "GUARDIAN" ? (
                <div className="flex gap-2">
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select a student</option>
                    {allStudents
                      .filter((s) => !linkedUsers.some((l) => l.id === s.id))
                      .map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.name} ({student.email})
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={handleLinkGuardian}
                    disabled={!selectedStudentId}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Link
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={selectedGuardianId}
                    onChange={(e) => setSelectedGuardianId(e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select a guardian</option>
                    {allGuardians
                      .filter((g) => !linkedUsers.some((l) => l.id === g.id))
                      .map((guardian) => (
                        <option key={guardian.id} value={guardian.id}>
                          {guardian.name} ({guardian.email})
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={handleLinkStudent}
                    disabled={!selectedGuardianId}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Link
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setLinkingUser(null);
                  setLinkedUsers([]);
                  setSelectedStudentId("");
                  setSelectedGuardianId("");
                }}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
