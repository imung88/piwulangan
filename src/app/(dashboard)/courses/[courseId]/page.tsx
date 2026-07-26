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

  // Guardian: read-only view if a linked student is enrolled here
  let guardianStudents: { id: string; name: string }[] = [];
  if (role === "GUARDIAN") {
    const links = await db.guardianStudent.findMany({
      where: {
        guardianId: userId,
        student: { enrollments: { some: { courseId: course.id } } },
      },
      include: { student: { select: { id: true, name: true } } },
    });
    guardianStudents = links.map((l) => l.student);
  }
  const isGuardianViewer = guardianStudents.length > 0;
  const guardianStudentIds = guardianStudents.map((s) => s.id);

  // Next upcoming session (owner: any; student: only sessions they attend)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextSession =
    isOwner || isEnrolled || isGuardianViewer
      ? await db.classSession.findFirst({
          where: {
            courseId: course.id,
            status: "SCHEDULED",
            date: { gte: today },
            ...(isOwner
              ? {}
              : {
                  attendees: {
                    some: {
                      studentId: isGuardianViewer
                        ? { in: guardianStudentIds }
                        : userId,
                    },
                  },
                }),
          },
          include: { lesson: { select: { id: true, title: true } } },
          orderBy: [{ date: "asc" }, { startTime: "asc" }],
        })
      : null;

  // Check if student can view (enrolled, published, owner, or guardian of an enrolled student)
  if (!isOwner && !isEnrolled && !isGuardianViewer) {
    if (course.visibility !== "PUBLISHED") {
      return (
        <div className="text-center py-12">
          <p className="text-metro-text-secondary">This course is not available.</p>
        </div>
      );
    }

    // Published but not enrolled: preview only (no content list)
    return (
      <div className="max-w-2xl mx-auto py-8">
        <h1 className="metro-page-title">{course.title}</h1>
        <p className="mt-1 text-sm text-metro-text-secondary">👤 {course.instructor.name}</p>
        {course.description && (
          <p className="mt-4 text-metro-text-secondary">{course.description}</p>
        )}
        <p className="mt-4 text-sm text-metro-text-secondary">
          {course.modules.length} module{course.modules.length !== 1 ? "s" : ""} ·{" "}
          {course.modules.reduce((sum, m) => sum + m.lessons.length, 0)} lessons
        </p>

        <div className="mt-8 metro-card p-6 text-center">
          {role !== "STUDENT" ? (
            <p className="text-sm text-metro-text-secondary">
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
              <p className="mb-3 text-sm text-metro-text-secondary">
                This course is open for enrollment.
              </p>
              <button
                type="submit"
                className="bg-metro-green px-6 py-2 text-sm font-medium text-white hover:bg-metro-green-hover"
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
                className="metro-input px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="bg-metro-green px-4 py-2 text-sm font-medium text-white hover:bg-metro-green-hover"
              >
                Join
              </button>
            </form>
          ) : (
            <p className="text-sm text-metro-text-secondary">
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

  // Guardian: linked students' completed lessons in this course
  const completedByStudent = new Map<string, Set<string>>();
  if (isGuardianViewer) {
    const lessonIds = allLessons.map((l) => l.id);
    const guardianProgress = await db.progress.findMany({
      where: {
        userId: { in: guardianStudentIds },
        lessonId: { in: lessonIds },
        completed: true,
      },
      select: { userId: true, lessonId: true },
    });
    for (const p of guardianProgress) {
      if (!completedByStudent.has(p.userId)) {
        completedByStudent.set(p.userId, new Set());
      }
      completedByStudent.get(p.userId)!.add(p.lessonId);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="metro-page-title">{course.title}</h1>
            {course.visibility === "DRAFT" && (
              <span className="metro-badge bg-metro-border text-metro-text-secondary">
                Draft
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-metro-text-secondary">
            👤 {course.instructor.name}
            {isOwner && course.inviteCode && (
              <span className="ml-3">🔑 Code: {course.inviteCode}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/courses/${course.id}/schedule`}
            className="border border-metro-border px-3 py-2 text-sm text-metro-text-secondary hover:bg-metro-blue-light"
          >
            📅 Schedule
          </Link>
          {isOwner && (
            <Link
              href={`/courses/${course.id}/manage/settings`}
              className="border border-metro-border px-3 py-2 text-sm text-metro-text-secondary hover:bg-metro-blue-light"
            >
              ⚙️ Settings
            </Link>
          )}
        </div>
      </div>

      {course.description && (
        <p className="mt-4 text-metro-text-secondary">{course.description}</p>
      )}

      {/* Next session */}
      {nextSession && (
        <div className="mt-6 border border-metro-blue bg-metro-blue-light p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-metro-blue">
                Next Session
              </p>
              <p className="mt-1 font-medium text-metro-text">{nextSession.title}</p>
              <p className="mt-0.5 text-sm text-metro-text-secondary">
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
                  className="mt-1 inline-block text-sm text-metro-blue hover:underline"
                >
                  Lesson: {nextSession.lesson.title} →
                </Link>
              )}
            </div>
            <Link
              href={`/courses/${course.id}/schedule`}
              className="text-sm font-medium text-metro-blue hover:text-metro-blue-hover"
            >
              View schedule →
            </Link>
          </div>
        </div>
      )}

      {/* Progress per linked student (guardians) */}
      {isGuardianViewer && totalLessons > 0 && (
        <div className="mt-6 metro-card space-y-4">
          {guardianStudents.map((s) => {
            const done = completedByStudent.get(s.id)?.size ?? 0;
            const pct = Math.round((done / totalLessons) * 100);
            return (
              <div key={s.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-metro-text-secondary">
                    🎓 {s.name}: {done} of {totalLessons} lessons completed
                  </span>
                  <span className="font-semibold">{pct}%</span>
                </div>
                <div className="mt-2 h-3 bg-metro-border">
                  <div
                    className="h-3 bg-metro-blue transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Progress bar (students) */}
      {(isEnrolled || isOwner) && totalLessons > 0 && (
        <div className="mt-6 metro-card">
          <div className="flex items-center justify-between text-sm">
            <span className="text-metro-text-secondary">
              {completedLessons.length} of {totalLessons} lessons completed
            </span>
            <span className="font-semibold">{percentage}%</span>
          </div>
          <div className="mt-2 h-3 bg-metro-border">
            <div
              className="h-3 bg-metro-green transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>
          {nextLesson && isEnrolled && (
            <Link
              href={`/courses/${course.id}/lessons/${nextLesson.id}`}
              className="mt-3 inline-block text-sm font-medium text-metro-blue hover:underline"
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
            <h2 className="metro-section-title">announcements</h2>
            <div className="flex items-center gap-3">
              {isOwner && (
                <Link
                  href={`/courses/${course.id}/manage/announcements`}
                  className="text-sm text-metro-text-secondary hover:text-metro-text"
                >
                  Manage
                </Link>
              )}
              <Link
                href={`/courses/${course.id}/announcements`}
                className="text-sm text-metro-blue hover:text-metro-blue-hover font-medium"
              >
                View All →
              </Link>
            </div>
          </div>
          <div className="space-y-2">
            {course.announcements.map((a) => (
              <div
                key={a.id}
                className={`metro-card p-3 ${
                  a.pinned ? "metro-card-accent" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  {a.pinned && <span className="text-xs text-metro-blue">📌</span>}
                  <h3 className="text-sm font-medium">{a.title}</h3>
                </div>
                <p className="mt-1 text-sm text-metro-text-secondary line-clamp-2">{a.body}</p>
                <p className="mt-1 text-xs text-metro-text-secondary">
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
          <h2 className="metro-section-title">course content</h2>
          {isOwner && (
            <Link
              href={`/courses/${course.id}/manage/content`}
              className="text-sm text-metro-blue hover:underline"
            >
              Edit content →
            </Link>
          )}
        </div>

        <div className="space-y-4">
          {course.modules.map((mod) => (
            <div key={mod.id} className="border border-metro-border bg-metro-surface">
              <div className="border-b border-metro-border px-4 py-3">
                <h3 className="font-medium text-metro-text">
                  Module {mod.order}: {mod.title}
                </h3>
              </div>
              <div className="divide-y">
                {mod.lessons.map((lesson) => {
                  const isCompleted = isGuardianViewer
                    ? guardianStudents.every((s) =>
                        completedByStudent.get(s.id)?.has(lesson.id)
                      )
                    : lesson.progress.some((p) => p.completed);
                  return (
                    <Link
                      key={lesson.id}
                      href={`/courses/${course.id}/lessons/${lesson.id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-metro-blue-light transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">
                          {isCompleted ? "✅" : "⬜"}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-metro-text">
                            {lesson.title}
                          </p>
                          {lesson.duration && (
                            <p className="text-xs text-metro-text-secondary">
                              ~{lesson.duration} min
                            </p>
                          )}
                        </div>
                      </div>
                      {lesson.resources.length > 0 && (
                        <span className="text-xs text-metro-text-secondary">
                          📎 {lesson.resources.length}
                        </span>
                      )}
                    </Link>
                  );
                })}
                {mod.lessons.length === 0 && (
                  <p className="px-4 py-3 text-sm text-metro-text-secondary">
                    No lessons yet
                  </p>
                )}
              </div>
            </div>
          ))}
          {course.modules.length === 0 && (
            <p className="text-center text-metro-text-secondary py-8">
              No content yet.
              {isOwner && (
                <Link
                  href={`/courses/${course.id}/manage/content`}
                  className="ml-1 text-metro-blue hover:underline"
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
            className="text-sm text-metro-text-secondary hover:text-metro-text"
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
