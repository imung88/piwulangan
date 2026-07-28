import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import Link from "next/link"
import { redirect, notFound } from "next/navigation"
import UnenrollButton from "./UnenrollButton"
import { serverT, formatT } from "@/lib/i18n/serverT"

export default async function CoursePage({
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
  const isGuardianViewer = guardianStudents.length > 0
  const guardianStudentIds = guardianStudents.map((s) => s.id)

  // Server-side translations (async function — safe here)
  const labels = {
    notAvailable: await serverT("courseDetail.notAvailable"),
    schedule: await serverT("courseDetail.schedule"),
    settings: await serverT("courseDetail.settings"),
    code: await serverT("courseDetail.code"),
    nextSession: await serverT("courseDetail.nextSession"),
    lesson: await serverT("courseDetail.lesson"),
    viewSchedule: await serverT("courseDetail.viewSchedule"),
    announcements: await serverT("courseDetail.announcements"),
    manage: await serverT("courseDetail.manage"),
    viewAll: await serverT("courseDetail.viewAll"),
    courseContent: await serverT("courseDetail.courseContent"),
    editContent: await serverT("courseDetail.editContent"),
    moduleLabel: await serverT("courseDetail.module"),
    noLessons: await serverT("courseDetail.noLessons"),
    noContent: await serverT("courseDetail.noContent"),
    addModules: await serverT("courseDetail.addModulesAndLessons"),
    viewMembers: await serverT("courseDetail.viewMembers"),
    previewEnroll: await serverT("courseDetail.previewEnroll"),
    previewOpen: await serverT("courseDetail.previewOpen"),
    enrollNow: await serverT("courseDetail.enrollNow"),
    previewInvite: await serverT("courseDetail.previewInvite"),
    previewInvitePh: await serverT("courseDetail.previewInvitePlaceholder"),
    previewManaged: await serverT("courseDetail.previewManaged"),
    modulePlural: await serverT("common.modulePlural"),
    lessonPlural: await serverT("common.lessonPlural"),
    duration: await serverT("courseDetail.duration"),
    lessonsCompleted: await serverT("courseDetail.lessonsCompleted"),
    continueLabel: await serverT("courseDetail.continue"),
  }

  const moduleWord = labels.modulePlural
  const lessonWord = labels.lessonPlural
  const durationWord = labels.duration

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
          <p className="text-metro-text-secondary">{labels.notAvailable}</p>
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
          {course.modules.length} {moduleWord} ·{" "}
          {course.modules.reduce((sum, m) => sum + m.lessons.length, 0)} {lessonWord}
        </p>

        <div className="mt-8 metro-card p-6 text-center">
          {role !== "STUDENT" ? (
            <p className="text-sm text-metro-text-secondary">
              {labels.previewEnroll}
            </p>
          ) : course.enrollmentMode === "OPEN" ? (
            <form
              action={async () => {
                "use server"
                const { enrollOpen } = await import("@/actions/courses")
                await enrollOpen(course.id)
              }}
            >
              <p className="mb-3 text-sm text-metro-text-secondary">
                {labels.previewOpen}
              </p>
              <button
                type="submit"
                className="bg-metro-green px-6 py-2 text-sm font-medium text-white hover:bg-metro-green-hover"
              >
                {labels.enrollNow}
              </button>
            </form>
          ) : course.enrollmentMode === "INVITE_CODE" ? (
            <form
              action={async (formData: FormData) => {
                "use server"
                const code = formData.get("code") as string
                if (!code) return
                const { enrollByCode } = await import("@/actions/courses")
                await enrollByCode(code)
              }}
              className="flex justify-center gap-2"
            >
              <input
                name="code"
                placeholder={labels.previewInvitePh}
                className="metro-input px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="bg-metro-green px-4 py-2 text-sm font-medium text-white hover:bg-metro-green-hover"
              >
                {labels.previewInvite}
              </button>
            </form>
          ) : (
            <p className="text-sm text-metro-text-secondary">
              {labels.previewManaged}
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
              <span className="ml-3">🔑 {labels.code}: {course.inviteCode}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/courses/${course.id}/schedule`}
            className="border border-metro-border px-3 py-2 text-sm text-metro-text-secondary hover:bg-metro-blue-light"
          >
            📅 {labels.schedule}
          </Link>
          {isOwner && (
            <Link
              href={`/courses/${course.id}/manage/settings`}
              className="border border-metro-border px-3 py-2 text-sm text-metro-text-secondary hover:bg-metro-blue-light"
            >
              ⚙️ {labels.settings}
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
                {labels.nextSession}
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
                  {labels.lesson}: {nextSession.lesson.title} →
                </Link>
              )}
            </div>
            <Link
              href={`/courses/${course.id}/schedule`}
              className="text-sm font-medium text-metro-blue hover:text-metro-blue-hover"
            >
              {labels.viewSchedule}
            </Link>
          </div>
        </div>
      )}

      {/* Progress per linked student (guardians) */}
      {isGuardianViewer && totalLessons > 0 && (
        <div className="mt-6 metro-card space-y-4">
          {guardianStudents.map((s) => {
            const done = completedByStudent.get(s.id)?.size ?? 0
            const pct = Math.round((done / totalLessons) * 100)
            return (
              <div key={s.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-metro-text-secondary">
                    🎓 {s.name}: {formatT(labels.lessonsCompleted, { done, total: totalLessons })}
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
            )
          })}
        </div>
      )}

      {/* Progress bar (students) */}
      {(isEnrolled || isOwner) && totalLessons > 0 && (
        <div className="mt-6 metro-card">
          <div className="flex items-center justify-between text-sm">
            <span className="text-metro-text-secondary">
              {formatT(labels.lessonsCompleted, { done: completedLessons.length, total: totalLessons })}
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
              {formatT(labels.continueLabel, { title: nextLesson.title })}
            </Link>
          )}
        </div>
      )}

      {/* Announcements */}
      {course.announcements.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="metro-section-title">{labels.announcements}</h2>
            <div className="flex items-center gap-3">
              {isOwner && (
                <Link
                  href={`/courses/${course.id}/manage/announcements`}
                  className="text-sm text-metro-text-secondary hover:text-metro-text"
                >
                  {labels.manage}
                </Link>
              )}
              <Link
                href={`/courses/${course.id}/announcements`}
                className="text-sm text-metro-blue hover:text-metro-blue-hover font-medium"
              >
                {labels.viewAll}
              </Link>
            </div>
          </div>
          <div className="space-y-2">
            {course.announcements.map((a) => (
              <div
                key={a.id}
                className={`metro-card p-3 ${a.pinned ? "metro-card-accent" : ""}`}
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
          <h2 className="metro-section-title">{labels.courseContent}</h2>
          {isOwner && (
            <Link
              href={`/courses/${course.id}/manage/content`}
              className="text-sm text-metro-blue hover:underline"
            >
              {labels.editContent}
            </Link>
          )}
        </div>

        <div className="space-y-4">
          {course.modules.map((mod) => (
            <div key={mod.id} className="border border-metro-border bg-metro-surface">
              <div className="border-b border-metro-border px-4 py-3">
                <h3 className="font-medium text-metro-text">
                  {formatT(labels.moduleLabel, { order: mod.order })}: {mod.title}
                </h3>
              </div>
              <div className="divide-y">
                {mod.lessons.map((lesson) => {
                  const isCompleted = isGuardianViewer
                    ? guardianStudents.every((s) =>
                        completedByStudent.get(s.id)?.has(lesson.id),
                      )
                    : lesson.progress.some((p) => p.completed)
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
                              {formatT(durationWord, { n: lesson.duration })}
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
                  )
                })}
                {mod.lessons.length === 0 && (
                  <p className="px-4 py-3 text-sm text-metro-text-secondary">
                    {labels.noLessons}
                  </p>
                )}
              </div>
            </div>
          ))}
          {course.modules.length === 0 && (
            <p className="text-center text-metro-text-secondary py-8">
              {labels.noContent}
              {isOwner && (
                <Link
                  href={`/courses/${course.id}/manage/content`}
                  className="ml-1 text-metro-blue hover:underline"
                >
                  {labels.addModules}
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
            {labels.viewMembers}
          </Link>
          {isEnrolled && !isOwner && (
            <UnenrollButton courseId={course.id} courseTitle={course.title} />
          )}
        </div>
      )}
    </div>
  )
}
