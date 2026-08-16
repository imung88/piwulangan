import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageCourse } from "@/lib/coursePerms";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getServerT, formatT } from "@/lib/i18n/serverT";

export default async function CourseReportsPage({
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

  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) notFound();

  if (await canManageCourse(userId, role, course)) {
    redirect(`/courses/${courseId}/manage/reports`);
  }

  // Whose reports can this viewer read?
  let studentIds: string[] = [];
  if (role === "STUDENT") {
    const enrollment = await db.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!enrollment) redirect(`/courses/${courseId}`);
    studentIds = [userId];
  } else if (role === "GUARDIAN") {
    const links = await db.guardianStudent.findMany({
      where: {
        guardianId: userId,
        student: { enrollments: { some: { courseId } } },
      },
      select: { studentId: true },
    });
    studentIds = links.map((l) => l.studentId);
    if (studentIds.length === 0) redirect(`/courses/${courseId}`);
  } else {
    redirect(`/courses/${courseId}`);
  }

  const reports = await db.studentReport.findMany({
    where: { courseId, studentId: { in: studentIds } },
    include: {
      student: { select: { id: true, name: true } },
      author: { select: { name: true } },
      module: { select: { title: true } },
      lesson: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const students = await db.user.findMany({
    where: { id: { in: studentIds } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const labels = {
    back: t("reports.back"),
    title: t("reports.title"),
    reportFor: t("reports.reportFor"),
    viewAttendance: t("reports.viewAttendance"),
    noReports: t("reports.noReportsYet"),
    wholeCourse: t("reports.wholeCourse"),
    byAuthor: t("reports.byAuthor"),
  };

  return (
    <div>
      <Link
        href={`/courses/${courseId}`}
        className="text-sm text-metro-text-secondary hover:text-metro-text"
      >
        {labels.back}
      </Link>
      <p className="mt-2 text-xs font-bold uppercase tracking-widest text-metro-blue">
        {labels.title}
      </p>
      <h1 className="metro-page-title mt-1">{course.title}</h1>

      <div className="mt-6 space-y-8">
        {students.map((student) => {
          const studentReports = reports.filter((r) => r.studentId === student.id);
          return (
            <section key={student.id}>
              <div className="border-l-4 border-metro-blue bg-metro-blue-light px-4 py-3">
                <h2 className="text-lg font-semibold text-metro-text md:text-2xl">
                  🎓 {formatT(labels.reportFor, { name: student.name })}
                </h2>
              </div>
              <Link
                href={`/courses/${courseId}/reports/attendance?student=${student.id}`}
                className="mt-3 inline-flex min-h-[44px] items-center border border-metro-blue px-4 text-sm font-medium text-metro-blue hover:bg-metro-blue-light"
              >
                📋 {labels.viewAttendance}
              </Link>

              {studentReports.length === 0 ? (
                <p className="mt-3 border border-metro-border bg-metro-surface px-4 py-8 text-center text-metro-text-secondary">
                  {labels.noReports}
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {studentReports.map((r) => (
                    <article key={r.id} className="metro-card border-l-4 border-l-metro-blue">
                      <h3 className="text-base font-semibold text-metro-text md:text-lg">
                        {r.lesson?.title ?? r.module?.title ?? labels.wholeCourse}
                      </h3>
                      <p className="mt-1 text-sm text-metro-text-secondary">
                        {new Date(r.createdAt).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}{" "}
                        · {formatT(labels.byAuthor, { name: r.author.name })}
                      </p>
                      <p className="metro-body mt-3 whitespace-pre-wrap text-metro-text">
                        {r.body}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
