import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerT } from "@/lib/i18n/serverT";

export default async function AnnouncementsPage() {
  const t = await getServerT();
  const labels = {
    title: t("announcementsPage.title"),
    descAdmin: t("announcementsPage.descAdmin"),
    descInstructor: t("announcementsPage.descInstructor"),
    descStudent: t("announcementsPage.descStudent"),
    descGuardian: t("announcementsPage.descGuardian"),
    noAnnouncements: t("announcementsPage.noAnnouncements"),
    manage: t("announcementsPage.manage"),
    pinned: t("announcementsPage.pinned"),
  };

  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;
  const role = session.user.role;

  let announcements: any[] = [];

  if (role === "ADMIN") {
    // Admin sees all announcements
    announcements = await db.announcement.findMany({
      include: { author: { select: { id: true, name: true } }, course: true },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 50,
    });
  } else if (role === "INSTRUCTOR") {
    // Instructor sees announcements from their courses (owned or co-taught)
    announcements = await db.announcement.findMany({
      where: {
        course: {
          OR: [{ instructorId: userId }, { coInstructors: { some: { userId } } }],
        },
      },
      include: { author: { select: { id: true, name: true } }, course: true },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 50,
    });
  } else if (role === "STUDENT") {
    // Student sees announcements from enrolled courses
    const enrolledCourseIds = (
      await db.enrollment.findMany({
        where: { userId },
        select: { courseId: true },
      })
    ).map((e) => e.courseId);

    if (enrolledCourseIds.length > 0) {
      announcements = await db.announcement.findMany({
        where: { courseId: { in: enrolledCourseIds } },
        include: { author: { select: { id: true, name: true } }, course: true },
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
        take: 50,
      });
    }
  } else if (role === "GUARDIAN") {
    // Guardian sees announcements from linked students' courses
    const links = await db.guardianStudent.findMany({
      where: { guardianId: userId },
      include: {
        student: {
          include: {
            enrollments: { select: { courseId: true } },
          },
        },
      },
    });

    const linkedCourseIds = Array.from(
      new Set(links.flatMap((l) => l.student.enrollments.map((e) => e.courseId)))
    );

    if (linkedCourseIds.length > 0) {
      announcements = await db.announcement.findMany({
        where: { courseId: { in: linkedCourseIds } },
        include: { author: { select: { id: true, name: true } }, course: true },
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
        take: 50,
      });
    }
  }

  const isOwner = role === "ADMIN" || role === "INSTRUCTOR";

  return (
    <div>
      <h1 className="metro-page-title">{labels.title}</h1>
      <p className="mt-1 text-sm text-metro-text-secondary">
        {role === "ADMIN" && labels.descAdmin}
        {role === "INSTRUCTOR" && labels.descInstructor}
        {role === "STUDENT" && labels.descStudent}
        {role === "GUARDIAN" && labels.descGuardian}
      </p>

      <div className="mt-6">
        {announcements.length === 0 ? (
          <p className="text-sm text-metro-text-secondary">{labels.noAnnouncements}</p>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <div
                key={a.id}
                className={`metro-card ${
                  a.pinned ? "metro-card-accent bg-metro-blue-light" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {a.pinned && (
                        <span className="metro-badge bg-metro-blue text-white">
                          {labels.pinned}
                        </span>
                      )}
                      <h3 className="font-medium text-metro-text">{a.title}</h3>
                    </div>
                    <p className="mt-1 text-sm text-metro-text-secondary line-clamp-2">
                      {a.body}
                    </p>
                    <p className="mt-2 text-xs text-metro-text-secondary">
                      <Link
                        href={`/courses/${a.courseId}`}
                        className="hover:text-metro-blue"
                      >
                        {a.course.title}
                      </Link>
                      {" · "}
                      {a.author.name} ·{" "}
                      {new Date(a.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {isOwner && (
                    <Link
                      href={`/courses/${a.courseId}/announcements`}
                      className="text-xs text-metro-text-secondary hover:text-metro-blue ml-4 whitespace-nowrap"
                    >
                      {labels.manage}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
