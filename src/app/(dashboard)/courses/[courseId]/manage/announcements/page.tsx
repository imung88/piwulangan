import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  createAnnouncement,
  deleteAnnouncement,
  togglePin,
} from "@/actions/announcements";
import { getServerT, formatT } from "@/lib/i18n/serverT";

export default async function ManageAnnouncementsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const t = await getServerT();
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

  const labels = {
    back: t("courseManage.back"),
    title: t("courseManage.announceTitle"),
    newAnnouncement: t("courseManage.newAnnouncement"),
    allAnnouncements: t("courseManage.allAnnouncements"),
    titleLbl: t("courseManage.title"),
    body: t("courseManage.body"),
    pinAnnouncement: t("courseManage.pinAnnouncement"),
    createAnnouncement: t("courseManage.createAnnouncement"),
    noAnnouncements: t("courseManage.noAnnouncements"),
    unpin: t("courseManage.unpin"),
    pin: t("courseManage.pin"),
    delete: t("courseManage.delete"),
  };

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <Link
            href={`/courses/${courseId}`}
            className="text-sm text-metro-text-secondary hover:text-metro-text"
          >
            {labels.back}
          </Link>
          <h1 className="metro-page-title mt-2">
            {formatT(labels.title, { title: course.title })}
          </h1>
        </div>
      </div>

      {/* Create form */}
      <div className="mt-6 metro-card p-6">
        <h2 className="metro-section-title mb-4">{labels.newAnnouncement}</h2>
        <form
          action={async (formData: FormData) => {
            "use server";
            await createAnnouncement(courseId, formData);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-metro-text">
              {labels.titleLbl}
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
              {labels.body}
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
              {labels.pinAnnouncement}
            </label>
          </div>
          <button
            type="submit"
            className="bg-metro-blue px-4 py-2 text-sm font-medium text-white hover:bg-metro-blue-hover"
          >
            {labels.createAnnouncement}
          </button>
        </form>
      </div>

      {/* Announcements list */}
      <div className="mt-8">
        <h2 className="metro-section-title mb-4">
          {formatT(labels.allAnnouncements, { n: announcements.length })}
        </h2>
        {announcements.length === 0 ? (
          <p className="text-sm text-metro-text-secondary">{labels.noAnnouncements}</p>
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
                        title={a.pinned ? labels.unpin : labels.pin}
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
                        title={labels.delete}
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
