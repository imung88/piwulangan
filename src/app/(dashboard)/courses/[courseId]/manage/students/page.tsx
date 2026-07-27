import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { AddStudentForm, RemoveStudentButton } from "./StudentActions";

export default async function ManageStudentsPage({
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
    include: {
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
        orderBy: { order: "asc" },
      },
    },
  });

  if (!course) notFound();

  if (role !== "ADMIN" && course.instructorId !== userId) {
    redirect("/courses");
  }

  const enrolledIds = course.enrollments.map((e) => e.userId);
  const candidates = await db.user.findMany({
    where: { role: "STUDENT", id: { notIn: enrolledIds } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  const totalLessons = course.modules.reduce(
    (sum, m) => sum + m.lessons.length,
    0
  );

  return (
    <div>
      <Link
        href={`/courses/${courseId}`}
        className="text-sm text-metro-text-secondary hover:text-metro-text"
      >
        ← Back to course
      </Link>
      <h1 className="metro-page-title mt-2">
        Students: {course.title}
      </h1>
      <p className="text-sm text-metro-text-secondary mt-1">
        {course.enrollments.length} enrolled · {totalLessons} lessons total
      </p>

      <div className="mt-6 metro-card">
        <h2 className="metro-section-title mb-3">
          add student
        </h2>
        <AddStudentForm courseId={courseId} candidates={candidates} />
      </div>

      <div className="mt-6 border border-metro-border bg-metro-surface overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-metro-bg border-b border-metro-border">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-metro-text-secondary">Student</th>
              <th className="px-4 py-3 text-left font-medium text-metro-text-secondary">Email</th>
              <th className="px-4 py-3 text-left font-medium text-metro-text-secondary">Progress</th>
              <th className="px-4 py-3 text-left font-medium text-metro-text-secondary">Completed</th>
              <th className="px-4 py-3 text-left font-medium text-metro-text-secondary">Enrolled</th>
              <th className="px-4 py-3 text-right font-medium text-metro-text-secondary"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
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
                <tr key={enrollment.id} className="hover:bg-metro-blue-light">
                  <td className="px-4 py-3 font-medium">{student.name}</td>
                  <td className="px-4 py-3 text-metro-text-secondary">{student.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-metro-border">
                        <div
                          className="h-2 bg-metro-blue"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-metro-text-secondary">{percentage}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-metro-text-secondary">
                    {completedCount}/{totalLessons}
                  </td>
                  <td className="px-4 py-3 text-metro-text-secondary text-xs">
                    {new Date(enrollment.enrolledAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <RemoveStudentButton
                      courseId={courseId}
                      studentId={student.id}
                      studentName={student.name}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {course.enrollments.length === 0 && (
          <p className="px-4 py-8 text-center text-metro-text-secondary">
            No students enrolled yet. Add students above or share the invite code.
          </p>
        )}
      </div>
    </div>
  );
}
