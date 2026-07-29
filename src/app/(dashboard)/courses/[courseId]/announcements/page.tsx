import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getServerT, formatT } from "@/lib/i18n/serverT";

export default async function AnnouncementsPage({
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
    include: { enrollments: true },
  });
  if (!course) notFound();

  const isOwner = course.instructorId === userId || role === "ADMIN";
  const isEnrolled = course.enrollments.some((e) => e.userId === userId);

  let isGuardianLinked = false;
  if (role === "GUARDIAN") {
    const link = await db.guardianStudent.findFirst({
      where: {
        guardianId: userId,
        student: { enrollments: { some: { courseId } } },
      },
    });
    isGuardianLinked = !!link;
  }

  if (!isOwner && !isEnrolled && !isGuardianLinked) {
    if (course.visibility !== "PUBLISHED") {
      const notAvailable = t("courseDetail.notAvailable");
      return (
        <div className="text-center py-12">
          <p className="text-metro-text-secondary">{notAvailable}</p>
        </div>
      );
    }
  }

  const labels = {
    back: t("courseManage.back"),
    title: t("courseDetail.announcements"),
    manageAnnouncements: t("courseManage.manageAnnouncements"),
    noAnnouncements: t("courseManage.noAnnouncements"),
  };

  const announcements = await db.announcement.findMany({
    where: { courseId },
    include: { author: true },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });

  return (
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

      {isOwner && (
        <Link
          href={`/courses/${courseId}/manage/announcements`}
          className="mt-3 inline-block text-sm text-metro-blue hover:underline"
        >
          {labels.manageAnnouncements}
        </Link>
      )}

      <div className="mt-6">
        {announcements.length === 0 ? (
          <p className="text-sm text-metro-text-secondary">{labels.noAnnouncements}</p>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <div
                key={a.id}
                className={`metro-card ${a.pinned ? "metro-card-accent" : ""}`}
              >
                <div className="flex items-center gap-2">
                  {a.pinned && <span className="text-xs text-metro-blue">📌</span>}
                  <h3 className="font-medium">{a.title}</h3>
                </div>
                <p className="mt-2 text-sm text-metro-text-secondary whitespace-pre-wrap">
                  {a.body}
                </p>
                <p className="mt-2 text-xs text-metro-text-secondary">
                  {a.author.name} · {new Date(a.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
