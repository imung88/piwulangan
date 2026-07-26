import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createModule, createLesson, deleteModule, deleteLesson } from "@/actions/lessons";

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
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to course
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
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
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add Module
          </button>
        </form>
      </div>

      {/* Modules */}
      <div className="mt-6 space-y-6">
        {course.modules.map((mod) => (
          <div key={mod.id} className="rounded-lg border bg-white">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="font-semibold text-gray-900">
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
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </form>
            </div>

            {/* Lessons */}
            <div className="divide-y">
              {mod.lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {lesson.order}. {lesson.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      {lesson.duration && (
                        <span className="text-xs text-gray-400">
                          ~{lesson.duration} min
                        </span>
                      )}
                      {lesson.resources.length > 0 && (
                        <span className="text-xs text-gray-400">
                          📎 {lesson.resources.length} resources
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {lesson.content ? `${lesson.content.length} chars` : "No content"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/courses/${params.courseId}/lessons/${lesson.id}`}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View
                    </Link>
                    <form
                      action={async () => {
                        "use server";
                        await deleteLesson(lesson.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Lesson */}
            <div className="border-t px-4 py-3">
              <AddLessonForm moduleId={mod.id} courseId={params.courseId} />
            </div>
          </div>
        ))}
      </div>

      {course.modules.length === 0 && (
        <p className="mt-8 text-center text-gray-500">
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
        className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <input
        name="duration"
        type="number"
        placeholder="Min"
        className="w-20 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <button
        type="submit"
        className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
      >
        + Lesson
      </button>
    </form>
  );
}
