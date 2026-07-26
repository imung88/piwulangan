import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { toggleProgress } from "@/actions/progress";

export default async function LessonPage({
  params,
}: {
  params: { courseId: string; lessonId: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  const course = await db.course.findUnique({
    where: { id: params.courseId },
    include: {
      instructor: true,
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

  const isOwner = course.instructorId === userId || role === "ADMIN";
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

  if (!isOwner && !isEnrolled && !isGuardianViewer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">You don&apos;t have access to this lesson.</p>
      </div>
    );
  }

  // Find the lesson
  const allLessons = course.modules.flatMap((m) =>
    m.lessons.map((l) => ({ ...l, moduleTitle: m.title, moduleOrder: m.order }))
  );
  const lessonIndex = allLessons.findIndex((l) => l.id === params.lessonId);
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
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href={`/courses/${params.courseId}`} className="hover:text-gray-700">
          ← Back
        </Link>
        <span>/</span>
        <span>
          Module {lesson.moduleOrder}: {lesson.moduleTitle}
        </span>
        <span>/</span>
        <span className="text-gray-900">{lesson.title}</span>
      </div>

      {/* Lesson header */}
      <h1 className="text-2xl font-bold text-gray-900">{lesson.title}</h1>
      {lesson.duration && (
        <p className="mt-1 text-sm text-gray-500">~{lesson.duration} min read</p>
      )}

      {/* Linked sessions */}
      {linkedSessions.length > 0 && (
        <div className="mt-4 space-y-1">
          {linkedSessions.map((s) => (
            <Link
              key={s.id}
              href={`/courses/${params.courseId}/schedule`}
              className="block rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700 hover:bg-blue-100"
            >
              📅 Scheduled:{" "}
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
          <p className="text-gray-400 italic">No content yet</p>
        )}
      </div>

      {/* Resources */}
      {lesson.resources.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">📎 Resources</h3>
          <div className="space-y-2">
            {lesson.resources.map((r) => (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
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
        <div className="mt-8 border-t pt-6">
          <form
            action={async () => {
              "use server";
              await toggleProgress(params.lessonId);
            }}
          >
            <button
              type="submit"
              className={`w-full rounded-lg border-2 py-3 text-sm font-semibold transition-colors ${
                isCompleted
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-gray-300 bg-white text-gray-700 hover:border-blue-500 hover:bg-blue-50"
              }`}
            >
              {isCompleted ? "✅ Completed — Click to Unmark" : "⬜ Mark as Complete"}
            </button>
          </form>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between border-t pt-6">
        {prevLesson ? (
          <Link
            href={`/courses/${params.courseId}/lessons/${prevLesson.id}`}
            className="text-sm text-blue-600 hover:underline"
          >
            ← {prevLesson.title}
          </Link>
        ) : (
          <div />
        )}
        {nextLesson ? (
          <Link
            href={`/courses/${params.courseId}/lessons/${nextLesson.id}`}
            className="text-sm text-blue-600 hover:underline"
          >
            {nextLesson.title} →
          </Link>
        ) : (
          <Link
            href={`/courses/${params.courseId}`}
            className="text-sm text-blue-600 hover:underline"
          >
            Back to course →
          </Link>
        )}
      </div>
    </div>
  );
}

// Simple markdown renderer (paragraphs, headings, bold, italic, lists, code)
function renderMarkdown(md: string): string {
  return md
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
