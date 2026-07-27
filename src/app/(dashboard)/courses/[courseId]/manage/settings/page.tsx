import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { updateCourse, publishCourse, unpublishCourse, deleteCourse, archiveCourse, unarchiveCourse } from "@/actions/courses";

export default async function CourseSettingsPage({
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
  });

  if (!course) notFound();

  if (role !== "ADMIN" && course.instructorId !== userId) {
    redirect("/courses");
  }

  return (
    <div>
      <Link
        href={`/courses/${courseId}`}
        className="text-sm text-metro-text-secondary hover:text-metro-text"
      >
        ← Back to course
      </Link>
      <h1 className="metro-page-title mt-2">
        Course Settings
      </h1>

      {/* Edit form */}
      <div className="mt-6 metro-card p-6">
        <h2 className="metro-section-title mb-4">course details</h2>
        <form
          action={async (formData: FormData) => {
            "use server";
            await updateCourse(courseId, formData);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-metro-text">Title</label>
            <input
              name="title"
              defaultValue={course.title}
              required
              maxLength={120}
              className="metro-input mt-1 block w-full px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-metro-text">
              Description
            </label>
            <textarea
              name="description"
              defaultValue={course.description || ""}
              rows={3}
              maxLength={2000}
              className="metro-input mt-1 block w-full px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-metro-text">
              Cover Image URL
            </label>
            <input
              name="coverImageUrl"
              defaultValue={course.coverImageUrl || ""}
              type="url"
              placeholder="https://..."
              className="metro-input mt-1 block w-full px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-metro-text">
              Enrollment Mode
            </label>
            <select
              name="enrollmentMode"
              defaultValue={course.enrollmentMode}
              className="metro-input mt-1 block w-full px-3 py-2 text-sm"
            >
              <option value="OPEN">Open — anyone with the link</option>
              <option value="INVITE_CODE">Invite Code — students enter a code</option>
              <option value="MANUAL">Manual — admin adds students</option>
            </select>
          </div>
          <button
            type="submit"
            className="bg-metro-blue px-4 py-2 text-sm font-medium text-white hover:bg-metro-blue-hover"
          >
            Save Changes
          </button>
        </form>
      </div>

      {/* Publish/Unpublish */}
      <div className="mt-6 metro-card p-6">
        <h2 className="metro-section-title mb-2">visibility</h2>
        <p className="text-sm text-metro-text-secondary mb-4">
          {course.visibility === "PUBLISHED"
            ? "This course is published and visible to enrolled students."
            : course.visibility === "ARCHIVED"
            ? "This course is archived. It is hidden from students and instructors."
            : "This course is a draft. Only you and admins can see it."}
        </p>
        {course.visibility === "DRAFT" && (
          <form
            action={async () => {
              "use server";
              await publishCourse(courseId);
            }}
          >
            <button
              type="submit"
              className="bg-metro-green px-4 py-2 text-sm font-medium text-white hover:bg-metro-green-hover"
            >
              Publish Course
            </button>
          </form>
        )}
        {course.visibility === "PUBLISHED" && (
          <div className="flex gap-2">
            <form
              action={async () => {
                "use server";
                await unpublishCourse(courseId);
              }}
            >
              <button
                type="submit"
                className="bg-metro-orange px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Unpublish (Back to Draft)
              </button>
            </form>
            {role === "ADMIN" && (
              <form
                action={async () => {
                  "use server";
                  await archiveCourse(courseId);
                }}
              >
                <button
                  type="submit"
                  className="bg-metro-chrome-dark px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  Archive Course
                </button>
              </form>
            )}
          </div>
        )}
        {course.visibility === "ARCHIVED" && role === "ADMIN" && (
          <form
            action={async () => {
              "use server";
              await unarchiveCourse(courseId);
            }}
          >
            <button
              type="submit"
              className="bg-metro-green px-4 py-2 text-sm font-medium text-white hover:bg-metro-green-hover"
            >
              Unarchive Course
            </button>
          </form>
        )}
      </div>

      {/* Invite Code */}
      {course.inviteCode && (
        <div className="mt-6 metro-card p-6">
          <h2 className="metro-section-title mb-2">invite code</h2>
          <p className="text-sm text-metro-text-secondary mb-2">
            Share this code with students so they can enroll.
          </p>
          <code className="text-2xl font-mono font-bold tracking-wider text-metro-blue">
            {course.inviteCode}
          </code>
        </div>
      )}

      {/* Danger Zone */}
      <div className="mt-6 metro-card p-6" style={{ borderLeftColor: "var(--metro-error)" }}>
        <h2 className="metro-section-title mb-2 text-metro-error">danger zone</h2>
        <p className="text-sm text-metro-error mb-4">
          Deleting a course is permanent. All lessons, progress, and enrollments will be
          lost.
        </p>
        <form
          action={async () => {
            "use server";
            await deleteCourse(courseId);
          }}
        >
          <button
            type="submit"
            className="bg-metro-error px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Delete Course
          </button>
        </form>
      </div>
    </div>
  );
}
