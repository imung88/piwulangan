import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  createAnnouncement,
  deleteAnnouncement,
  togglePin,
} from "@/actions/announcements";

export default async function ManageAnnouncementsPage({
  params,
}: {
  params: { courseId: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  const course = await db.course.findUnique({
    where: { id: params.courseId },
  });
  if (!course) notFound();

  if (role !== "ADMIN" && course.instructorId !== userId) {
    redirect("/courses");
  }

  const announcements = await db.announcement.findMany({
    where: { courseId: params.courseId },
    include: { author: true },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <Link
            href={`/courses/${params.courseId}`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to course
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            Manage Announcements: {course.title}
          </h1>
        </div>
      </div>

      {/* Create form */}
      <div className="mt-6 rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">New Announcement</h2>
        <form
          action={async (formData: FormData) => {
            "use server";
            await createAnnouncement(params.courseId, formData);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              name="title"
              required
              maxLength={200}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Body
            </label>
            <textarea
              name="body"
              required
              rows={4}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="pinned"
              id="pinned"
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="pinned" className="text-sm text-gray-700">
              Pin this announcement
            </label>
          </div>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Create Announcement
          </button>
        </form>
      </div>

      {/* Announcements list */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          All Announcements ({announcements.length})
        </h2>
        {announcements.length === 0 ? (
          <p className="text-sm text-gray-500">No announcements yet.</p>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <div
                key={a.id}
                className={`rounded-lg border bg-white p-4 ${
                  a.pinned ? "border-blue-200 bg-blue-50" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {a.pinned && (
                        <span className="text-xs text-blue-600">📌</span>
                      )}
                      <h3 className="font-medium">{a.title}</h3>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
                      {a.body}
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
                      {a.author.name} ·{" "}
                      {new Date(a.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <form
                      action={async () => {
                        "use server";
                        await togglePin(a.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="text-sm text-gray-500 hover:text-blue-600"
                        title={a.pinned ? "Unpin" : "Pin"}
                      >
                        {a.pinned ? "📌" : "📍"}
                      </button>
                    </form>
                    <form
                      action={async () => {
                        "use server";
                        await deleteAnnouncement(a.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="text-sm text-gray-500 hover:text-red-600"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
