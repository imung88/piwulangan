import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AnnouncementsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  let announcements: any[] = [];

  if (role === "ADMIN") {
    // Admin sees all announcements
    announcements = await db.announcement.findMany({
      include: { author: true, course: true },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 50,
    });
  } else if (role === "INSTRUCTOR") {
    // Instructor sees announcements from their courses
    announcements = await db.announcement.findMany({
      where: { course: { instructorId: userId } },
      include: { author: true, course: true },
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
        include: { author: true, course: true },
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
        include: { author: true, course: true },
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
        take: 50,
      });
    }
  }

  const isOwner = role === "ADMIN" || role === "INSTRUCTOR";

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">📢 Announcements</h1>
      <p className="mt-1 text-sm text-gray-500">
        {role === "ADMIN" && "All announcements across all courses."}
        {role === "INSTRUCTOR" && "Announcements from your courses."}
        {role === "STUDENT" && "Announcements from your enrolled courses."}
        {role === "GUARDIAN" && "Announcements from your linked students' courses."}
      </p>

      <div className="mt-6">
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
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                      {a.body}
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
                      <Link
                        href={`/courses/${a.courseId}`}
                        className="hover:text-blue-600"
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
                      href={`/courses/${a.courseId}/manage/announcements`}
                      className="text-xs text-gray-400 hover:text-blue-600 ml-4 whitespace-nowrap"
                    >
                      Manage →
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
