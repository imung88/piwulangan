import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageCourse } from "@/lib/coursePerms";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { toggleProgress } from "@/actions/progress";
import { PendingButton } from "@/components/ui/PendingButton";
import { getServerT, formatT } from "@/lib/i18n/serverT";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const t = await getServerT();
  const { courseId, lessonId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      instructor: { select: { id: true, name: true } },
      enrollments: { where: { userId } },
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
    },
  });

  if (!course) notFound();

  const isOwner = await canManageCourse(userId, role, course);
  const isEnrolled = course.enrollments.length > 0;

  // Guardian: read-only view if a linked student is enrolled here
  let guardianStudentIds: string[] = [];
  if (role === "GUARDIAN") {
    const links = await db.guardianStudent.findMany({
      where: {
        guardianId: userId,
        student: { enrollments: { some: { courseId: course.id } } },
      },
      select: { studentId: true },
    });
    guardianStudentIds = links.map((l) => l.studentId);
  }
  const isGuardianViewer = guardianStudentIds.length > 0;

  const labels = {
    noAccess: t("lesson.noAccess"),
    back: t("lesson.back"),
    module: t("lesson.module"),
    duration: t("lesson.readDuration"),
    scheduled: t("lesson.scheduled"),
    noContent: t("lesson.noContent"),
    resources: t("lesson.resources"),
    completed: t("lesson.completed"),
    markComplete: t("lesson.markComplete"),
    backToCourse: t("lesson.backToCourse"),
  };

  if (!isOwner && !isEnrolled && !isGuardianViewer) {
    return (
      <div className="text-center py-12">
        <p className="text-metro-text-secondary">{labels.noAccess}</p>
      </div>
    );
  }

  // Find the lesson
  const allLessons = course.modules.flatMap((m) =>
    m.lessons.map((l) => ({ ...l, moduleTitle: m.title, moduleOrder: m.order }))
  );
  const lessonIndex = allLessons.findIndex((l) => l.id === lessonId);
  if (lessonIndex === -1) notFound();

  const lesson = allLessons[lessonIndex];
  const prevLesson = lessonIndex > 0 ? allLessons[lessonIndex - 1] : null;
  const nextLesson =
    lessonIndex < allLessons.length - 1 ? allLessons[lessonIndex + 1] : null;
  const isCompleted = lesson.progress.some((p) => p.completed);

  // Upcoming sessions linked to this lesson
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const linkedSessions = await db.classSession.findMany({
    where: {
      lessonId: lesson.id,
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
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    take: 3,
  });

  return (
    <div className="max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-metro-text-secondary mb-6">
        <Link href={`/courses/${courseId}`} className="hover:text-metro-text">
          {labels.back}
        </Link>
        <span>/</span>
        <span>
          {formatT(labels.module, { order: lesson.moduleOrder })}: {lesson.moduleTitle}
        </span>
        <span>/</span>
        <span className="text-metro-text">{lesson.title}</span>
      </div>

      {/* Lesson header */}
      <h1 className="metro-page-title">{lesson.title}</h1>
      {lesson.duration && (
        <p className="mt-1 text-sm text-metro-text-secondary">{formatT(labels.duration, { n: lesson.duration })}</p>
      )}

      {/* Linked sessions */}
      {linkedSessions.length > 0 && (
        <div className="mt-4 space-y-1">
          {linkedSessions.map((s) => (
            <Link
              key={s.id}
              href={`/courses/${courseId}/schedule/${s.id}`}
              className="block border border-metro-blue bg-metro-blue-light px-3 py-2 text-sm text-metro-blue hover:bg-metro-blue-light"
            >
              📅 {labels.scheduled}
              {new Date(s.date).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}{" "}
              {s.startTime} – {s.endTime}
              {s.location && <> · {s.location}</>}
            </Link>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="mt-6 prose prose-sm max-w-none">
        {lesson.content ? (
          <div
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(lesson.content),
            }}
          />
        ) : (
          <p className="text-metro-text-secondary italic">{labels.noContent}</p>
        )}
      </div>

      {/* Resources */}
      {lesson.resources.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-metro-text mb-2">{labels.resources}</h3>
          <div className="space-y-2">
            {lesson.resources.map((r) => (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 border border-metro-border bg-metro-surface px-4 py-2 text-sm text-metro-blue hover:bg-metro-blue-light transition-colors"
              >
                {r.type === "VIDEO" ? "▶" : r.type === "DOCUMENT" ? "📄" : "🔗"}
                {r.title}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Mark as Complete */}
      {isEnrolled && (
        <div className="mt-8 border-t border-metro-border pt-6">
          <form
            action={async () => {
              "use server";
              await toggleProgress(lessonId);
            }}
          >
            <PendingButton
              pendingLabel={t("common.loading")}
              className={`w-full border-2 py-3 text-sm font-semibold transition-colors ${
                isCompleted
                  ? "border-metro-green bg-metro-green-light text-metro-green"
                  : "border-metro-border bg-metro-surface text-metro-text hover:border-metro-blue hover:bg-metro-blue-light"
              }`}
            >
              {isCompleted ? labels.completed : labels.markComplete}
            </PendingButton>
          </form>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between border-t border-metro-border pt-6">
        {prevLesson ? (
          <Link
            href={`/courses/${courseId}/lessons/${prevLesson.id}`}
            className="text-sm text-metro-blue hover:underline"
          >
            ← {prevLesson.title}
          </Link>
        ) : (
          <div />
        )}
        {nextLesson ? (
          <Link
            href={`/courses/${courseId}/lessons/${nextLesson.id}`}
            className="text-sm text-metro-blue hover:underline"
          >
            {nextLesson.title} →
          </Link>
        ) : (
          <Link
            href={`/courses/${courseId}`}
            className="text-sm text-metro-blue hover:underline"
          >
            {labels.backToCourse}
          </Link>
        )}
      </div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Simple markdown renderer (paragraphs, headings, bold, italic, lists, code)
function renderMarkdown(md: string): string {
  return escapeHtml(md)
    // Headings
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Paragraphs (double newlines)
    .replace(/\n\n/g, '</p><p>')
    // Single newlines to <br>
    .replace(/\n/g, '<br>')
    // Wrap in paragraph
    .replace(/^(.+)/, '<p>$1')
    .replace(/(.+)$/, '$1</p>');
}
