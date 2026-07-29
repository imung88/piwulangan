import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createModule, createLesson, deleteModule } from "@/actions/lessons";
import { LessonEditForm } from "./LessonEditForm";
import { getServerT, formatT } from "@/lib/i18n/serverT";

export default async function ManageContentPage({
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
      modules: {
        include: {
          lessons: {
            include: { resources: true },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!course) notFound();

  if (role !== "ADMIN" && course.instructorId !== userId) {
    redirect("/courses");
  }

  const labels = {
    back: t("content.back"),
    editContent: t("content.editContent"),
    newModuleTitle: t("content.newModuleTitle"),
    addModule: t("content.addModule"),
    module: t("content.module"),
    delete: t("content.deleteModule"),
    newLessonTitle: t("content.newLessonTitle"),
    duration: t("content.duration"),
    addLesson: t("content.addLesson"),
    noModules: t("content.noModules"),
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/courses/${courseId}`}
            className="text-sm text-metro-text-secondary hover:text-metro-text"
          >
            {labels.back}
          </Link>
          <h1 className="metro-page-title mt-2">
            {formatT(labels.editContent, { title: course.title })}
          </h1>
        </div>
      </div>

      {/* Add Module */}
      <div className="mt-6">
        <form
          action={async (formData: FormData) => {
            "use server";
            const title = formData.get("moduleTitle") as string;
            if (title) await createModule(courseId, title);
          }}
          className="flex gap-2"
        >
          <input
            name="moduleTitle"
            placeholder={labels.newModuleTitle}
            required
            className="metro-input flex-1 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="bg-metro-blue px-4 py-2 text-sm font-medium text-white hover:bg-metro-blue-hover"
          >
            {labels.addModule}
          </button>
        </form>
      </div>

      {/* Modules */}
      <div className="mt-6 space-y-6">
        {course.modules.map((mod) => (
          <div key={mod.id} className="border border-metro-border bg-metro-surface">
            <div className="flex items-center justify-between border-b border-metro-border px-4 py-3">
              <h2 className="font-semibold text-metro-text">
                {formatT(labels.module, { order: mod.order })}: {mod.title}
              </h2>
              <form
                action={async () => {
                  "use server";
                  await deleteModule(mod.id);
                }}
              >
                <button
                  type="submit"
                  className="text-xs text-metro-error hover:underline"
                >
                  {labels.delete}
                </button>
              </form>
            </div>
            {/* Lessons */}
            <div className="divide-y">
              {mod.lessons.map((lesson) => (
                <LessonEditForm
                  key={lesson.id}
                  lessonId={lesson.id}
                  courseId={courseId}
                  initialTitle={lesson.title}
                  initialDuration={lesson.duration}
                  initialContent={lesson.content}
                  order={lesson.order}
                  initialResources={lesson.resources}
                />
              ))}
            </div>
            {/* Add Lesson */}
            <div className="border-t border-metro-border px-4 py-3">
              <AddLessonForm moduleId={mod.id} courseId={courseId} labels={labels} />
            </div>
          </div>
        ))}
      </div>

      {course.modules.length === 0 && (
        <p className="mt-8 text-center text-metro-text-secondary">
          {labels.noModules}
        </p>
      )}
    </div>
  );
}

function AddLessonForm({ moduleId, labels }: { moduleId: string; courseId: string; labels: Record<string, string> }) {
  return (
    <form
      action={async (formData: FormData) => {
        "use server";
        const title = formData.get("title") as string;
        if (title) {
          await createLesson(moduleId, formData);
        }
      }}
      className="flex gap-2 w-full"
    >
      <input
        name="title"
        placeholder={labels.newLessonTitle}
        required
        className="metro-input flex-1 px-3 py-1.5 text-sm"
      />
      <input
        name="duration"
        type="number"
        placeholder={labels.duration}
        className="metro-input w-20 px-3 py-1.5 text-sm"
      />
      <button
        type="submit"
        className="bg-metro-border px-3 py-1.5 text-sm font-medium text-metro-text hover:bg-metro-blue-light"
      >
        {labels.addLesson}
      </button>
    </form>
  );
}
