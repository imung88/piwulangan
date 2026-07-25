import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { updateCourse, publishCourse, unpublishCourse, deleteCourse } from "@/actions/courses";

export default async function CourseSettingsPage({
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
  });

  if (!course) notFound();

  if (role !== "ADMIN" && course.instructorId !== userId) {
    redirect("/courses");
  }

  return (
    <div>
      <Link
        href={`/courses/${params.courseId}`}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        ← Back to course
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mt-2">
        Course Settings
      </h1>

      {/* Edit form */}
      <div className="mt-6 rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Course Details</h2>
        <form
          action={async (formData: FormData) => {
            "use server";
            await updateCourse(params.courseId, formData);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              name="title"
              defaultValue={course.title}
              required
              maxLength={120}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="description"
              defaultValue={course.description || ""}
              rows={3}
              maxLength={2000}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Cover Image URL
            </label>
            <input
              name="coverImageUrl"
              defaultValue={course.coverImageUrl || ""}
              type="url"
              placeholder="https://..."
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Enrollment Mode
            </label>
            <select
              name="enrollmentMode"
              defaultValue={course.enrollmentMode}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="OPEN">Open — anyone with the link</option>
              <option value="INVITE_CODE">Invite Code — students enter a code</option>
              <option value="MANUAL">Manual — admin adds students</option>
            </select>
          </div>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Save Changes
          </button>
        </form>
      </div>

      {/* Publish/Unpublish */}
      <div className="mt-6 rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold mb-2">Visibility</h2>
        <p className="text-sm text-gray-500 mb-4">
          {course.visibility === "PUBLISHED"
            ? "This course is published and visible to enrolled students."
            : "This course is a draft. Only you and admins can see it."}
        </p>
        {course.visibility === "DRAFT" ? (
          <form
            action={async () => {
              "use server";
              await publishCourse(params.courseId);
            }}
          >
            <button
              type="submit"
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Publish Course
            </button>
          </form>
        ) : (
          <form
            action={async () => {
              "use server";
              await unpublishCourse(params.courseId);
            }}
          >
            <button
              type="submit"
              className="rounded-md bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700"
            >
              Unpublish (Back to Draft)
            </button>
          </form>
        )}
      </div>

      {/* Invite Code */}
      {course.inviteCode && (
        <div className="mt-6 rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold mb-2">Invite Code</h2>
          <p className="text-sm text-gray-500 mb-2">
            Share this code with students so they can enroll.
          </p>
          <code className="text-2xl font-mono font-bold tracking-wider text-blue-600">
            {course.inviteCode}
          </code>
        </div>
      )}

      {/* Danger Zone */}
      <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-semibold text-red-800 mb-2">Danger Zone</h2>
        <p className="text-sm text-red-600 mb-4">
          Deleting a course is permanent. All lessons, progress, and enrollments will be
          lost.
        </p>
        <form
          action={async () => {
            "use server";
            await deleteCourse(params.courseId);
          }}
        >
          <button
            type="submit"
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Delete Course
          </button>
        </form>
      </div>
    </div>
  );
}
