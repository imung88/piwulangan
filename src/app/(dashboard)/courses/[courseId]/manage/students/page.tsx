import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { AddStudentForm, RemoveStudentButton } from "./StudentActions";

export default async function ManageStudentsPage({
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
        href={`/courses/${params.courseId}`}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        ← Back to course
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mt-2">
        Students: {course.title}
      </h1>
      <p className="text-sm text-gray-500 mt-1">
        {course.enrollments.length} enrolled · {totalLessons} lessons total
      </p>

      <div className="mt-6 rounded-lg border bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          ➕ Add Student
        </h2>
        <AddStudentForm courseId={params.courseId} candidates={candidates} />
      </div>

      <div className="mt-6 rounded-lg border bg-white overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Student</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Progress</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Completed</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Enrolled</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600"></th>
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
                <tr key={enrollment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{student.name}</td>
                  <td className="px-4 py-3 text-gray-500">{student.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-blue-600"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{percentage}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {completedCount}/{totalLessons}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(enrollment.enrolledAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <RemoveStudentButton
                      courseId={params.courseId}
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
          <p className="px-4 py-8 text-center text-gray-500">
            No students enrolled yet. Add students above or share the invite code.
          </p>
        )}
      </div>
    </div>
  );
}
