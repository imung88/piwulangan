import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createModule, createLesson, deleteModule } from "@/actions/lessons";
import { LessonEditForm } from "./LessonEditForm";

export default async function ManageContentPage({
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

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/courses/${params.courseId}`}
            className="text-sm text-metro-text-secondary hover:text-metro-text"
          >
            ← Back to course
          </Link>
          <h1 className="metro-page-title mt-2">
            Edit Content: {course.title}
          </h1>
        </div>
      </div>

      {/* Add Module */}
      <div className="mt-6">
        <form
          action={async (formData: FormData) => {
            "use server";
            const title = formData.get("moduleTitle") as string;
            if (title) await createModule(params.courseId, title);
          }}
          className="flex gap-2"
        >
          <input
            name="moduleTitle"
            placeholder="New module title"
            required
            className="metro-input flex-1 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="bg-metro-blue px-4 py-2 text-sm font-medium text-white hover:bg-metro-blue-hover"
          >
            Add Module
          </button>
        </form>
      </div>

      {/* Modules */}
      <div className="mt-6 space-y-6">
        {course.modules.map((mod) => (
          <div key={mod.id} className="border border-metro-border bg-metro-surface">
            <div className="flex items-center justify-between border-b border-metro-border px-4 py-3">
              <h2 className="font-semibold text-metro-text">
                Module {mod.order}: {mod.title}
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
                  Delete
                </button>
              </form>
            </div>

            {/* Lessons */}
            <div className="divide-y">
              {mod.lessons.map((lesson) => (
                <LessonEditForm
                  key={lesson.id}
                  lessonId={lesson.id}
                  courseId={params.courseId}
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
              <AddLessonForm moduleId={mod.id} courseId={params.courseId} />
            </div>
          </div>
        ))}
      </div>

      {course.modules.length === 0 && (
        <p className="mt-8 text-center text-metro-text-secondary">
          No modules yet. Add your first module above.
        </p>
      )}
    </div>
  );
}

function AddLessonForm({ moduleId }: { moduleId: string; courseId: string }) {
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
        placeholder="New lesson title"
        required
        className="metro-input flex-1 px-3 py-1.5 text-sm"
      />
      <input
        name="duration"
        type="number"
        placeholder="Min"
        className="metro-input w-20 px-3 py-1.5 text-sm"
      />
      <button
        type="submit"
        className="bg-metro-border px-3 py-1.5 text-sm font-medium text-metro-text hover:bg-metro-blue-light"
      >
        + Lesson
      </button>
    </form>
  );
}
