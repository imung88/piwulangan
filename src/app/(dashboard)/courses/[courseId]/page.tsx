import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import UnenrollButton from "./UnenrollButton";

export default async function CoursePage({
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
      instructor: true,
      modules: {
        include: {
          lessons: {
            include: {
              progress: { where: { userId } },
              resources: true,
            },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { order: "asc" },
      },
      enrollments: { where: { userId } },
      announcements: {
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { author: true },
      },
    },
  });

  if (!course) notFound();

  const isOwner = course.instructorId === userId || role === "ADMIN";
  const isEnrolled = course.enrollments.length > 0;

  // Next upcoming session (owner: any; student: only sessions they attend)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextSession =
    isOwner || isEnrolled
      ? await db.classSession.findFirst({
          where: {
            courseId: course.id,
            status: "SCHEDULED",
            date: { gte: today },
            ...(isOwner ? {} : { attendees: { some: { studentId: userId } } }),
          },
          include: { lesson: { select: { id: true, title: true } } },
          orderBy: [{ date: "asc" }, { startTime: "asc" }],
        })
      : null;

  // Check if student can view (enrolled, published, or owner)
  if (!isOwner && !isEnrolled) {
    if (course.visibility !== "PUBLISHED") {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">This course is not available.</p>
        </div>
      );
    }

    // Published but not enrolled: preview only (no content list)
    return (
      <div className="max-w-2xl mx-auto py-8">
        <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
        <p className="mt-1 text-sm text-gray-500">👤 {course.instructor.name}</p>
        {course.description && (
          <p className="mt-4 text-gray-600">{course.description}</p>
        )}
        <p className="mt-4 text-sm text-gray-500">
          {course.modules.length} module{course.modules.length !== 1 ? "s" : ""} ·{" "}
          {course.modules.reduce((sum, m) => sum + m.lessons.length, 0)} lessons
        </p>

        <div className="mt-8 rounded-lg border bg-white p-6 text-center">
          {role !== "STUDENT" ? (
            <p className="text-sm text-gray-500">
              Enroll in this course to see its content.
            </p>
          ) : course.enrollmentMode === "OPEN" ? (
            <form
              action={async () => {
                "use server";
                const { enrollOpen } = await import("@/actions/courses");
                await enrollOpen(course.id);
              }}
            >
              <p className="mb-3 text-sm text-gray-600">
                This course is open for enrollment.
              </p>
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Enroll Now
              </button>
            </form>
          ) : course.enrollmentMode === "INVITE_CODE" ? (
            <form
              action={async (formData: FormData) => {
                "use server";
                const code = formData.get("code") as string;
                if (!code) return;
                const { enrollByCode } = await import("@/actions/courses");
                await enrollByCode(code);
              }}
              className="flex justify-center gap-2"
            >
              <input
                name="code"
                placeholder="Enter invite code"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Join
              </button>
            </form>
          ) : (
            <p className="text-sm text-gray-500">
              Enrollment for this course is managed by the instructor.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Calculate progress
  const allLessons = course.modules.flatMap((m) => m.lessons);
  const completedLessons = allLessons.filter((l) =>
    l.progress.some((p) => p.completed)
  );
  const totalLessons = allLessons.length;
  const percentage =
    totalLessons > 0
      ? Math.round((completedLessons.length / totalLessons) * 100)
      : 0;

  // Find next incomplete lesson
  const nextLesson = allLessons.find((l) => !l.progress.some((p) => p.completed));

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
            {course.visibility === "DRAFT" && (
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                Draft
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            👤 {course.instructor.name}
            {isOwner && course.inviteCode && (
              <span className="ml-3">🔑 Code: {course.inviteCode}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/courses/${course.id}/schedule`}
            className="rounded-md border px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            📅 Schedule
          </Link>
          {isOwner && (
            <Link
              href={`/courses/${course.id}/manage/settings`}
              className="rounded-md border px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              ⚙️ Settings
            </Link>
          )}
        </div>
      </div>

      {course.description && (
        <p className="mt-4 text-gray-600">{course.description}</p>
      )}

      {/* Next session */}
      {nextSession && (
        <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-blue-600">
                Next Session
              </p>
              <p className="mt-1 font-medium text-gray-900">{nextSession.title}</p>
              <p className="mt-0.5 text-sm text-gray-600">
                {new Date(nextSession.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}{" "}
                · {nextSession.startTime} – {nextSession.endTime}
                {nextSession.location && <> · {nextSession.location}</>}
              </p>
              {nextSession.lesson && (
                <Link
                  href={`/courses/${course.id}/lessons/${nextSession.lesson.id}`}
                  className="mt-1 inline-block text-sm text-blue-600 hover:underline"
                >
                  Lesson: {nextSession.lesson.title} →
                </Link>
              )}
            </div>
            <Link
              href={`/courses/${course.id}/schedule`}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View schedule →
            </Link>
          </div>
        </div>
      )}

      {/* Progress bar (students) */}
      {(isEnrolled || isOwner) && totalLessons > 0 && (
        <div className="mt-6 rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {completedLessons.length} of {totalLessons} lessons completed
            </span>
            <span className="font-semibold">{percentage}%</span>
          </div>
          <div className="mt-2 h-3 rounded-full bg-gray-200">
            <div
              className="h-3 rounded-full bg-blue-600 transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>
          {nextLesson && isEnrolled && (
            <Link
              href={`/courses/${course.id}/lessons/${nextLesson.id}`}
              className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline"
            >
              Continue: {nextLesson.title} →
            </Link>
          )}
        </div>
      )}

      {/* Announcements */}
      {course.announcements.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">📢 Announcements</h2>
            <div className="flex items-center gap-3">
              {isOwner && (
                <Link
                  href={`/courses/${course.id}/manage/announcements`}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Manage
                </Link>
              )}
              <Link
                href={`/courses/${course.id}/announcements`}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View All →
              </Link>
            </div>
          </div>
          <div className="space-y-2">
            {course.announcements.map((a) => (
              <div
                key={a.id}
                className={`rounded-lg border bg-white p-3 ${
                  a.pinned ? "border-blue-200 bg-blue-50" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  {a.pinned && <span className="text-xs text-blue-600">📌</span>}
                  <h3 className="text-sm font-medium">{a.title}</h3>
                </div>
                <p className="mt-1 text-sm text-gray-600 line-clamp-2">{a.body}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {a.author.name} · {new Date(a.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modules & Lessons */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">📚 Course Content</h2>
          {isOwner && (
            <Link
              href={`/courses/${course.id}/manage/content`}
              className="text-sm text-blue-600 hover:underline"
            >
              Edit content →
            </Link>
          )}
        </div>

        <div className="space-y-4">
          {course.modules.map((mod) => (
            <div key={mod.id} className="rounded-lg border bg-white">
              <div className="border-b px-4 py-3">
                <h3 className="font-medium text-gray-900">
                  Module {mod.order}: {mod.title}
                </h3>
              </div>
              <div className="divide-y">
                {mod.lessons.map((lesson) => {
                  const isCompleted = lesson.progress.some((p) => p.completed);
                  return (
                    <Link
                      key={lesson.id}
                      href={`/courses/${course.id}/lessons/${lesson.id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">
                          {isCompleted ? "✅" : "⬜"}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {lesson.title}
                          </p>
                          {lesson.duration && (
                            <p className="text-xs text-gray-400">
                              ~{lesson.duration} min
                            </p>
                          )}
                        </div>
                      </div>
                      {lesson.resources.length > 0 && (
                        <span className="text-xs text-gray-400">
                          📎 {lesson.resources.length}
                        </span>
                      )}
                    </Link>
                  );
                })}
                {mod.lessons.length === 0 && (
                  <p className="px-4 py-3 text-sm text-gray-400">
                    No lessons yet
                  </p>
                )}
              </div>
            </div>
          ))}
          {course.modules.length === 0 && (
            <p className="text-center text-gray-500 py-8">
              No content yet.
              {isOwner && (
                <Link
                  href={`/courses/${course.id}/manage/content`}
                  className="ml-1 text-blue-600 hover:underline"
                >
                  Add modules and lessons →
                </Link>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Members link */}
      {(isOwner || isEnrolled) && (
        <div className="mt-8 flex items-center justify-between">
          <Link
            href={`/courses/${course.id}/members`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            👥 View members
          </Link>
          {isEnrolled && !isOwner && (
            <UnenrollButton courseId={course.id} courseTitle={course.title} />
          )}
        </div>
      )}
    </div>
  );
}
