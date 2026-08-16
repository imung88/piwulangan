import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { canManageCourse } from "@/lib/coursePerms"
import Link from "next/link"
import { redirect, notFound } from "next/navigation"
import UnenrollButton from "./UnenrollButton"
import { PreviewEnroll } from "./PreviewEnroll"
import CourseActionsMenu from "./CourseActionsMenu"
import CopyInviteCode from "./CopyInviteCode"
import { getServerT, formatT } from "@/lib/i18n/serverT"

export default async function CoursePage({
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
    include: {
      instructor: { select: { id: true, name: true } },
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
      _count: { select: { enrollments: true } },
      announcements: {
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { author: { select: { id: true, name: true } } },
      },
    },
  });

  if (!course) notFound();

  // Owner/co-instructor check and guardian links are independent — fetch in parallel.
  const [isOwner, guardianStudents] = await Promise.all([
    canManageCourse(userId, role, course),
    role === "GUARDIAN"
      ? db.guardianStudent
          .findMany({
            where: {
              guardianId: userId,
              student: { enrollments: { some: { courseId: course.id } } },
            },
            include: { student: { select: { id: true, name: true } } },
          })
          .then((links) => links.map((l) => l.student))
      : Promise.resolve([] as { id: string; name: string }[]),
  ]);
  const isEnrolled = course.enrollments.length > 0;

  // Guardian: read-only view if a linked student is enrolled here
  const isGuardianViewer = guardianStudents.length > 0;
  const guardianStudentIds = guardianStudents.map((s) => s.id);

  // Server-side translations (async function — safe here)
  const labels = {
    notAvailable: t("courseDetail.notAvailable"),
    schedule: t("courseDetail.schedule"),
    reports: t("courseDetail.reports"),
    settings: t("courseDetail.settings"),
    code: t("courseDetail.code"),
    nextSession: t("courseDetail.nextSession"),
    lesson: t("courseDetail.lesson"),
    viewSchedule: t("courseDetail.viewSchedule"),
    announcements: t("courseDetail.announcements"),
    viewAll: t("courseDetail.viewAll"),
    courseContent: t("courseDetail.courseContent"),
    editContent: t("courseDetail.editContent"),
    moduleLabel: t("courseDetail.module"),
    noLessons: t("courseDetail.noLessons"),
    noContent: t("courseDetail.noContent"),
    addModules: t("courseDetail.addModulesAndLessons"),
    viewMembers: t("courseDetail.viewMembers"),
    manageStudents: t("courseDetail.manageStudents"),
    manageSchedule: t("courseDetail.manageSchedule"),
    previewEnroll: t("courseDetail.previewEnroll"),
    modulePlural: t("common.modulePlural"),
    lessonPlural: t("common.lessonPlural"),
    duration: t("courseDetail.duration"),
    lessonsCompleted: t("courseDetail.lessonsCompleted"),
    continueLabel: t("courseDetail.continue"),
    studentsEnrolled: t("courseDetail.studentsEnrolled"),
  }

  const moduleWord = labels.modulePlural
  const lessonWord = labels.lessonPlural
  const durationWord = labels.duration

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
          ) : (
            <PreviewEnroll courseId={course.id} enrollmentMode={course.enrollmentMode} />
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

  // Next upcoming session + guardian progress are independent of each other, so
  // fetch in parallel. Both are deferred past the access check above so preview
  // / non-enrolled visitors skip these queries entirely.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [nextSession, guardianProgress] = await Promise.all([
    isOwner || isEnrolled || isGuardianViewer
      ? db.classSession.findFirst({
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
      : null,
    isGuardianViewer
      ? db.progress.findMany({
          where: {
            userId: { in: guardianStudentIds },
            lessonId: { in: allLessons.map((l) => l.id) },
            completed: true,
          },
          select: { userId: true, lessonId: true },
        })
      : [],
  ]);

  // Guardian: linked students' completed lessons in this course
  const completedByStudent = new Map<string, Set<string>>();
  for (const p of guardianProgress) {
    if (!completedByStudent.has(p.userId)) {
      completedByStudent.set(p.userId, new Set());
    }
    completedByStudent.get(p.userId)!.add(p.lessonId);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="metro-page-title">{course.title}</h1>
            {course.visibility === "DRAFT" && (
              <span className="metro-badge bg-metro-border text-metro-text-secondary">
                Draft
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-sm text-metro-text-secondary">
              👤 {course.instructor.name}
            </p>
            {isOwner && course.inviteCode && (
              <CopyInviteCode code={course.inviteCode} />
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {(isOwner || isGuardianViewer || (isEnrolled && role === "STUDENT")) && (
            <Link
              href={`/courses/${course.id}/reports`}
              className="border border-metro-border px-3 py-2 text-sm text-metro-text-secondary hover:bg-metro-blue-light"
            >
              📝 {labels.reports}
            </Link>
          )}
          <Link
            href={`/courses/${course.id}/schedule`}
            className="border border-metro-border px-3 py-2 text-sm text-metro-text-secondary hover:bg-metro-blue-light"
          >
            📅 {labels.schedule}
          </Link>
        </div>
      </div>

      {/* Manage command bar (owners) */}
      {isOwner && (
        <div className="mt-4">
          <CourseActionsMenu courseId={course.id} />
        </div>
      )}

      {course.description && (
        <p className="mt-4 text-metro-text-secondary">{course.description}</p>
      )}

      {/* Owner quick stats */}
      {isOwner && (
        <div className="mt-6 grid max-w-md grid-cols-3 gap-2">
          <div className="bg-metro-surface p-3 text-center">
            <p className="text-2xl font-bold text-metro-text">{course._count.enrollments}</p>
            <p className="text-xs text-metro-text-secondary">{labels.studentsEnrolled}</p>
          </div>
          <div className="bg-metro-surface p-3 text-center">
            <p className="text-2xl font-bold text-metro-text">{course.modules.length}</p>
            <p className="text-xs text-metro-text-secondary">{moduleWord}</p>
          </div>
          <div className="bg-metro-surface p-3 text-center">
            <p className="text-2xl font-bold text-metro-text">{totalLessons}</p>
            <p className="text-xs text-metro-text-secondary">{lessonWord}</p>
          </div>
        </div>
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
      {isEnrolled && !isOwner && totalLessons > 0 && (
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
              className="mt-3 block w-full bg-metro-blue px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-metro-blue-hover sm:inline-block sm:w-auto"
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
            <Link
              href={`/courses/${course.id}/announcements`}
              className="text-sm text-metro-blue hover:text-metro-blue-hover font-medium"
            >
              {labels.viewAll}
            </Link>
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
          {course.modules.map((mod, index) => {
            const isOpen = nextLesson
              ? mod.lessons.some((l) => l.id === nextLesson.id)
              : index === 0
            return (
            <details
              key={mod.id}
              open={isOpen}
              className="group border border-metro-border bg-metro-surface"
            >
              <summary className="flex cursor-pointer select-none list-none items-center justify-between border-b border-metro-border px-4 py-3 [&::-webkit-details-marker]:hidden">
                <h3 className="font-medium text-metro-text">
                  {formatT(labels.moduleLabel, { order: mod.order })}: {mod.title}
                </h3>
                <span className="ml-3 text-metro-text-secondary transition-transform group-open:rotate-180">
                  ▾
                </span>
              </summary>
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
            </details>
            )
          })}
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
      {isEnrolled && !isOwner && (
        <div className="mt-8 flex items-center justify-between">
          <Link
            href={`/courses/${course.id}/members`}
            className="text-sm text-metro-text-secondary hover:text-metro-text"
          >
            {labels.viewMembers}
          </Link>
          <UnenrollButton courseId={course.id} courseTitle={course.title} />
        </div>
      )}
    </div>
  )
}
