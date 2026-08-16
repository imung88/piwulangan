import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageCourse } from "@/lib/coursePerms";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getServerT, formatT } from "@/lib/i18n/serverT";
import { CreateAnnouncementForm } from "./CreateAnnouncementForm";
import { AnnouncementItem } from "./AnnouncementItem";

export default async function AnnouncementsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const t = await getServerT();
  const { courseId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;
  const role = session.user.role;

  const course = await db.course.findUnique({
    where: { id: courseId },
    include: { enrollments: true },
  });
  if (!course) notFound();

  const isOwner = await canManageCourse(userId, role, course);
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
    return (
      <div className="text-center py-12">
        <p className="text-metro-text-secondary">{t("courseDetail.notAvailable")}</p>
      </div>
    );
  }

  const labels = {
    back: t("courseManage.back"),
    title: t("courseDetail.announcementsTitle"),
    newAnnouncement: t("courseManage.newAnnouncement"),
    allAnnouncements: t("courseManage.allAnnouncements"),
    noAnnouncements: t("courseManage.noAnnouncements"),
  };

  const announcements = await db.announcement.findMany({
    where: { courseId },
    include: { author: { select: { id: true, name: true } } },
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
        <div className="mt-6 metro-card p-6">
          <h2 className="metro-section-title mb-4">{labels.newAnnouncement}</h2>
          <CreateAnnouncementForm courseId={courseId} />
        </div>
      )}

      <div className="mt-6">
        {isOwner && (
          <h2 className="metro-section-title mb-4">
            {formatT(labels.allAnnouncements, { n: announcements.length })}
          </h2>
        )}
        {announcements.length === 0 ? (
          <p className="text-sm text-metro-text-secondary">{labels.noAnnouncements}</p>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <AnnouncementItem
                key={a.id}
                id={a.id}
                title={a.title}
                body={a.body}
                pinned={a.pinned}
                authorName={a.author.name}
                dateLabel={new Date(a.createdAt).toLocaleDateString()}
                canManage={isOwner}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
