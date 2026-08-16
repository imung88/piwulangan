import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageCourse } from "@/lib/coursePerms";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { LessonEditForm } from "./LessonEditForm";
import { AddModuleForm, AddLessonForm, DeleteModuleButton } from "./AddContentForms";
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

  const userId = session.user.id;
  const role = session.user.role;

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

  if (!(await canManageCourse(userId, role, course))) {
    redirect("/courses");
  }

  const labels = {
    back: t("content.back"),
    editContent: t("content.editContent"),
    module: t("content.module"),
    delete: t("content.deleteModule"),
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
        <AddModuleForm courseId={courseId} />
      </div>

      {/* Modules */}
      <div className="mt-6 space-y-6">
        {course.modules.map((mod) => (
          <div key={mod.id} className="border border-metro-border bg-metro-surface">
            <div className="flex items-center justify-between border-b border-metro-border px-4 py-3">
              <h2 className="font-semibold text-metro-text">
                {formatT(labels.module, { order: mod.order })}: {mod.title}
              </h2>
              <DeleteModuleButton moduleId={mod.id} moduleTitle={mod.title} />
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
              <AddLessonForm moduleId={mod.id} />
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
