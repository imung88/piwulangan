"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useT, format } from "@/lib/i18n/useT";
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
  const t = useT();
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
          className={`p-4 ${
            message.type === "success" ? "bg-metro-green-light text-metro-green" : "bg-metro-error text-white"
          }`}
        >
          {message.text}
          <button
            onClick={() => setMessage(null)}
            className="ml-2 underline text-sm"
          >
            {t("adminUsers.dismiss")}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder={t("adminUsers.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border-2 border-metro-border bg-metro-surface px-3 py-2 text-sm focus:border-metro-blue focus:outline-none"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border-2 border-metro-border bg-metro-surface px-3 py-2 text-sm focus:border-metro-blue focus:outline-none"
        >
          <option value="ALL">{t("adminUsers.allRoles")}</option>
          <option value="ADMIN">{t("adminUsers.admin")}</option>
          <option value="INSTRUCTOR">{t("adminUsers.instructor")}</option>
          <option value="STUDENT">{t("adminUsers.student")}</option>
          <option value="GUARDIAN">{t("adminUsers.guardian")}</option>
        </select>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-metro-blue px-4 py-2 text-sm font-medium text-white hover:bg-metro-blue-hover"
        >
          {t("adminUsers.createUser")}
        </button>
      </div>

      {/* Users Table */}
      <div className="border border-metro-border bg-metro-surface overflow-x-auto">
        <table className="min-w-full divide-y divide-metro-border">
          <thead className="bg-metro-bg">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-metro-text-secondary uppercase tracking-wider">
                {t("adminUsers.name")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-metro-text-secondary uppercase tracking-wider">
                {t("adminUsers.email")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-metro-text-secondary uppercase tracking-wider">
                {t("adminUsers.role")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-metro-text-secondary uppercase tracking-wider">
                {t("adminUsers.status")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-metro-text-secondary uppercase tracking-wider">
                {t("adminUsers.actions")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-metro-surface divide-y divide-metro-border">
            {filteredUsers.map((user) => (
              <tr key={user.id} className={!user.active ? "bg-metro-bg" : ""}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-metro-text">{user.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-metro-text-secondary">{user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`metro-badge ${
                      user.role === "ADMIN"
                        ? "bg-metro-chrome-dark text-white"
                        : user.role === "INSTRUCTOR"
                        ? "bg-metro-blue text-white"
                        : user.role === "STUDENT"
                        ? "bg-metro-green-light text-metro-green"
                        : "bg-metro-blue-light text-metro-blue"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`metro-badge ${
                      user.active
                        ? "bg-metro-green-light text-metro-green"
                        : "bg-metro-error text-white"
                    }`}
                  >
                    {user.active ? t("adminUsers.active") : t("adminUsers.inactive")}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingUser(user)}
                      className="text-metro-blue hover:text-metro-chrome-dark"
                    >
                      {t("adminUsers.edit")}
                    </button>
                    <button
                      onClick={() => setResetPasswordUser(user)}
                      className="text-metro-orange hover:text-metro-orange-hover"
                    >
                      {t("adminUsers.resetPassword")}
                    </button>
                    {(user.role === "GUARDIAN" || user.role === "STUDENT") && (
                      <button
                        onClick={() => setLinkingUser(user)}
                        className="text-metro-chrome-dark hover:text-metro-blue"
                      >
                        {t("adminUsers.link")}
                      </button>
                    )}
                    {user.active ? (
                      <button
                        onClick={() => handleDeactivate(user.id)}
                        className="text-metro-error hover:text-metro-orange-hover"
                      >
                        {t("adminUsers.deactivate")}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivate(user.id)}
                        className="text-metro-green hover:text-metro-green-hover"
                      >
                        {t("adminUsers.activate")}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <div className="p-6 text-center text-metro-text-secondary">{t("adminUsers.noUsersFound")}</div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-metro-surface p-6 w-full max-w-md">
            <h2 className="metro-section-title mb-4">{t("adminUsers.createUser")}</h2>
            <form action={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-metro-text">{t("adminUsers.name")}</label>
                <input
                  name="name"
                  required
                  className="mt-1 block w-full border-2 border-metro-border bg-metro-surface px-3 py-2 text-sm focus:border-metro-blue focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-metro-text">{t("adminUsers.email")}</label>
                <input
                  name="email"
                  type="email"
                  required
                  className="mt-1 block w-full border-2 border-metro-border bg-metro-surface px-3 py-2 text-sm focus:border-metro-blue focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-metro-text">{t("adminUsers.password")}</label>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  className="mt-1 block w-full border-2 border-metro-border bg-metro-surface px-3 py-2 text-sm focus:border-metro-blue focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-metro-text">{t("adminUsers.role")}</label>
                <select
                  name="role"
                  required
                  className="mt-1 block w-full border-2 border-metro-border bg-metro-surface px-3 py-2 text-sm focus:border-metro-blue focus:outline-none"
                >
                  <option value="STUDENT">{t("adminUsers.student")}</option>
                  <option value="INSTRUCTOR">{t("adminUsers.instructor")}</option>
                  <option value="GUARDIAN">{t("adminUsers.guardian")}</option>
                  <option value="ADMIN">{t("adminUsers.admin")}</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="border-2 border-metro-border px-4 py-2 text-sm font-medium text-metro-text hover:bg-metro-bg"
                >
                  {t("adminUsers.cancel")}
                </button>
                <button
                  type="submit"
                  className="bg-metro-blue px-4 py-2 text-sm font-medium text-white hover:bg-metro-blue-hover"
                >
                  {t("adminUsers.create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-metro-surface p-6 w-full max-w-md">
            <h2 className="metro-section-title mb-4">{t("adminUsers.editUser")}</h2>
            <form
              action={(formData) => handleUpdateUser(editingUser.id, formData)}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-metro-text">{t("adminUsers.name")}</label>
                <input
                  name="name"
                  defaultValue={editingUser.name}
                  required
                  className="mt-1 block w-full border-2 border-metro-border bg-metro-surface px-3 py-2 text-sm focus:border-metro-blue focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-metro-text">{t("adminUsers.email")}</label>
                <input
                  name="email"
                  type="email"
                  defaultValue={editingUser.email}
                  required
                  className="mt-1 block w-full border-2 border-metro-border bg-metro-surface px-3 py-2 text-sm focus:border-metro-blue focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-metro-text">{t("adminUsers.role")}</label>
                <select
                  name="role"
                  defaultValue={editingUser.role}
                  required
                  className="mt-1 block w-full border-2 border-metro-border bg-metro-surface px-3 py-2 text-sm focus:border-metro-blue focus:outline-none"
                >
                  <option value="STUDENT">{t("adminUsers.student")}</option>
                  <option value="INSTRUCTOR">{t("adminUsers.instructor")}</option>
                  <option value="GUARDIAN">{t("adminUsers.guardian")}</option>
                  <option value="ADMIN">{t("adminUsers.admin")}</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="border-2 border-metro-border px-4 py-2 text-sm font-medium text-metro-text hover:bg-metro-bg"
                >
                  {t("adminUsers.cancel")}
                </button>
                <button
                  type="submit"
                  className="bg-metro-blue px-4 py-2 text-sm font-medium text-white hover:bg-metro-blue-hover"
                >
                  {t("adminUsers.saveChanges")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-metro-surface p-6 w-full max-w-md">
            <h2 className="metro-section-title mb-4">
              {format(t("adminUsers.resetPasswordTitle"), { name: resetPasswordUser.name })}
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
                <label className="block text-sm font-medium text-metro-text">
                  {t("adminUsers.newPassword")}
                </label>
                <input
                  name="newPassword"
                  type="password"
                  required
                  minLength={6}
                  className="mt-1 block w-full border-2 border-metro-border bg-metro-surface px-3 py-2 text-sm focus:border-metro-blue focus:outline-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setResetPasswordUser(null)}
                  className="border-2 border-metro-border px-4 py-2 text-sm font-medium text-metro-text hover:bg-metro-bg"
                >
                  {t("adminUsers.cancel")}
                </button>
                <button
                  type="submit"
                  className="bg-metro-orange px-4 py-2 text-sm font-medium text-white hover:bg-metro-orange-hover"
                >
                  {t("adminUsers.resetPassword")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Guardian Linking Modal */}
      {linkingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-metro-surface p-6 w-full max-w-md">
            <h2 className="metro-section-title mb-4">
              {linkingUser.role === "GUARDIAN"
                ? format(t("adminUsers.linkStudentsTo"), { name: linkingUser.name })
                : format(t("adminUsers.linkGuardiansTo"), { name: linkingUser.name })}
            </h2>

            {/* Current Links */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-metro-text mb-2">{t("adminUsers.currentLinks")}</h3>
              {linkedUsers.length === 0 ? (
                <p className="text-sm text-metro-text-secondary">{t("adminUsers.noLinksYet")}</p>
              ) : (
                <div className="space-y-2">
                  {linkedUsers.map((linked) => (
                    <div
                      key={linked.id}
                      className="flex items-center justify-between bg-metro-bg p-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-metro-text">{linked.name}</p>
                        <p className="text-xs text-metro-text-secondary">{linked.email}</p>
                      </div>
                      <button
                        onClick={() =>
                          linkingUser.role === "GUARDIAN"
                            ? handleUnlinkGuardian(linked.id)
                            : handleUnlinkStudent(linked.id)
                        }
                        className="text-metro-error hover:text-metro-orange-hover text-sm"
                      >
                        {t("blocked.remove")}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Link */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-metro-text mb-2">{t("adminUsers.addNewLink")}</h3>
              {linkingUser.role === "GUARDIAN" ? (
                <div className="flex gap-2">
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="flex-1 border-2 border-metro-border bg-metro-surface px-3 py-2 text-sm focus:border-metro-blue focus:outline-none"
                  >
                    <option value="">{t("adminUsers.selectStudent")}</option>
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
                    className="bg-metro-blue px-4 py-2 text-sm font-medium text-white hover:bg-metro-blue-hover disabled:opacity-50"
                  >
                    Link
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={selectedGuardianId}
                    onChange={(e) => setSelectedGuardianId(e.target.value)}
                    className="flex-1 border-2 border-metro-border bg-metro-surface px-3 py-2 text-sm focus:border-metro-blue focus:outline-none"
                  >
                    <option value="">{t("adminUsers.selectGuardian")}</option>
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
                    className="bg-metro-blue px-4 py-2 text-sm font-medium text-white hover:bg-metro-blue-hover disabled:opacity-50"
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
                className="border-2 border-metro-border px-4 py-2 text-sm font-medium text-metro-text hover:bg-metro-bg"
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
