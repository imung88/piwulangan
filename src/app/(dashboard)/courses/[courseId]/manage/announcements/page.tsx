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
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  const course = await db.course.findUnique({
    where: { id: courseId },
  });
  if (!course) notFound();

  if (role !== "ADMIN" && course.instructorId !== userId) {
    redirect("/courses");
  }

  const announcements = await db.announcement.findMany({
    where: { courseId },
    include: { author: true },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <Link
            href={`/courses/${courseId}`}
            className="text-sm text-metro-text-secondary hover:text-metro-text"
          >
            ← Back to course
          </Link>
          <h1 className="metro-page-title mt-2">
            Manage Announcements: {course.title}
          </h1>
        </div>
      </div>

      {/* Create form */}
      <div className="mt-6 metro-card p-6">
        <h2 className="metro-section-title mb-4">new announcement</h2>
        <form
          action={async (formData: FormData) => {
            "use server";
            await createAnnouncement(courseId, formData);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-metro-text">
              Title
            </label>
            <input
              name="title"
              required
              maxLength={200}
              className="metro-input mt-1 block w-full px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-metro-text">
              Body
            </label>
            <textarea
              name="body"
              required
              rows={4}
              className="metro-input mt-1 block w-full px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="pinned"
              id="pinned"
              className="border-metro-border text-metro-blue"
            />
            <label htmlFor="pinned" className="text-sm text-metro-text">
              Pin this announcement
            </label>
          </div>
          <button
            type="submit"
            className="bg-metro-blue px-4 py-2 text-sm font-medium text-white hover:bg-metro-blue-hover"
          >
            Create Announcement
          </button>
        </form>
      </div>

      {/* Announcements list */}
      <div className="mt-8">
        <h2 className="metro-section-title mb-4">
          all announcements ({announcements.length})
        </h2>
        {announcements.length === 0 ? (
          <p className="text-sm text-metro-text-secondary">No announcements yet.</p>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <div
                key={a.id}
                className={`metro-card ${
                  a.pinned ? "metro-card-accent" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {a.pinned && (
                        <span className="text-xs text-metro-blue">📌</span>
                      )}
                      <h3 className="font-medium">{a.title}</h3>
                    </div>
                    <p className="mt-1 text-sm text-metro-text-secondary whitespace-pre-wrap">
                      {a.body}
                    </p>
                    <p className="mt-2 text-xs text-metro-text-secondary">
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
                        className="text-sm text-metro-text-secondary hover:text-metro-blue"
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
                        className="text-sm text-metro-text-secondary hover:text-metro-error"
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
