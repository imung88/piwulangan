import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageCourse } from "@/lib/coursePerms";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getServerT, formatT } from "@/lib/i18n/serverT";

export default async function MembersPage({
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
    include: {
      instructor: true,
      coInstructors: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { addedAt: "asc" },
      },
      enrollments: {
        include: {
          user: {
            include: {
              progress: { where: { completed: true } },
            },
          },
        },
      },
      modules: {
        include: { lessons: true },
      },
    },
  });
  if (!course) notFound();

  const isOwner = await canManageCourse(userId, role, course);
  const isEnrolled = course.enrollments.some((e) => e.userId === userId);

  if (!isOwner && !isEnrolled) {
    redirect("/courses");
  }

  const totalLessons = course.modules.reduce(
    (sum, m) => sum + m.lessons.length,
    0
  );

  const labels = {
    back: t("members.back"),
    title: t("members.title"),
    instructor: t("members.instructor"),
    coTeacher: t("members.coTeacher"),
    students: t("members.students"),
    noStudents: t("members.noStudents"),
    lessonsCompleted: t("members.lessonsCompleted"),
  };

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

      <div className="mt-6">
        <h2 className="metro-section-title">{labels.instructor}</h2>
        <div className="mt-2 metro-card">
          <p className="font-medium">👤 {course.instructor.name}</p>
          <p className="text-sm text-metro-text-secondary">{course.instructor.email}</p>
        </div>
        {course.coInstructors.map((ci) => (
          <div key={ci.id} className="mt-2 metro-card">
            <p className="font-medium">👤 {ci.user.name}</p>
            <p className="text-sm text-metro-text-secondary">
              {ci.user.email} · {labels.coTeacher}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <h2 className="metro-section-title">
          {formatT(labels.students, { n: course.enrollments.length })}
        </h2>
        <div className="mt-2 space-y-2">
          {course.enrollments.map((enrollment) => {
            const student = enrollment.user;
            const completedCount = student.progress.filter((p) =>
              course.modules.some((m) =>
                m.lessons.some((l) => l.id === p.lessonId)
              )
            ).length;
            const percentage =
              totalLessons > 0
                ? Math.round((completedCount / totalLessons) * 100)
                : 0;

            return (
              <div
                key={enrollment.id}
                className="metro-card flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{student.name}</p>
                  <p className="text-sm text-metro-text-secondary">{student.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{percentage}%</p>
                  <p className="text-xs text-metro-text-secondary">
                    {formatT(labels.lessonsCompleted, { done: completedCount, total: totalLessons })}
                  </p>
                </div>
              </div>
            );
          })}
          {course.enrollments.length === 0 && (
            <p className="text-sm text-metro-text-secondary py-4">{labels.noStudents}</p>
          )}
        </div>
      </div>
    </div>
  );
}
