import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { updateCourse, publishCourse, unpublishCourse, deleteCourse, archiveCourse, unarchiveCourse } from "@/actions/courses";
import { serverT, formatT } from "@/lib/i18n/serverT";

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

  const labels = {
    back: await serverT("settings.back"),
    title: await serverT("settings.title"),
    courseDetails: await serverT("settings.courseDetails"),
    titleLbl: await serverT("settings.titleLbl"),
    description: await serverT("settings.description"),
    coverImage: await serverT("settings.coverImage"),
    enrollmentMode: await serverT("settings.enrollmentMode"),
    enrollmentOpen: await serverT("settings.enrollmentOpen"),
    enrollmentInvite: await serverT("settings.enrollmentInvite"),
    enrollmentManual: await serverT("settings.enrollmentManual"),
    saveChanges: await serverT("settings.saveChanges"),
    visibility: await serverT("settings.visibility"),
    publishedDesc: await serverT("settings.publishedDesc"),
    archivedDesc: await serverT("settings.archivedDesc"),
    draftDesc: await serverT("settings.draftDesc"),
    publish: await serverT("settings.publish"),
    unpublish: await serverT("settings.unpublish"),
    archive: await serverT("settings.archive"),
    unarchive: await serverT("settings.unarchive"),
    inviteCode: await serverT("settings.inviteCode"),
    inviteDesc: await serverT("settings.inviteDesc"),
    danger: await serverT("settings.danger"),
    dangerDesc: await serverT("settings.dangerDesc"),
    delete: await serverT("settings.delete"),
  };

  return (
    <div>
      <Link
        href={`/courses/${courseId}`}
        className="text-sm text-metro-text-secondary hover:text-metro-text"
      >
        {labels.back}
      </Link>
      <h1 className="metro-page-title mt-2">
        {labels.title}
      </h1>

      {/* Edit form */}
      <div className="mt-6 metro-card p-6">
        <h2 className="metro-section-title mb-4">{labels.courseDetails}</h2>
        <form
          action={async (formData: FormData) => {
            "use server";
            await updateCourse(courseId, formData);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-metro-text">{labels.titleLbl}</label>
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
              {labels.description}
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
              {labels.coverImage}
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
              {labels.enrollmentMode}
            </label>
            <select
              name="enrollmentMode"
              defaultValue={course.enrollmentMode}
              className="metro-input mt-1 block w-full px-3 py-2 text-sm"
            >
              <option value="OPEN">{labels.enrollmentOpen}</option>
              <option value="INVITE_CODE">{labels.enrollmentInvite}</option>
              <option value="MANUAL">{labels.enrollmentManual}</option>
            </select>
          </div>
          <button
            type="submit"
            className="bg-metro-blue px-4 py-2 text-sm font-medium text-white hover:bg-metro-blue-hover"
          >
            {labels.saveChanges}
          </button>
        </form>
      </div>

      {/* Publish/Unpublish */}
      <div className="mt-6 metro-card p-6">
        <h2 className="metro-section-title mb-2">{labels.visibility}</h2>
        <p className="text-sm text-metro-text-secondary mb-4">
          {course.visibility === "PUBLISHED"
            ? labels.publishedDesc
            : course.visibility === "ARCHIVED"
            ? labels.archivedDesc
            : labels.draftDesc}
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
              {labels.publish}
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
                {labels.unpublish}
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
                  {labels.archive}
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
              {labels.unarchive}
            </button>
          </form>
        )}
      </div>

      {/* Invite Code */}
      {course.inviteCode && (
        <div className="mt-6 metro-card p-6">
          <h2 className="metro-section-title mb-2">{labels.inviteCode}</h2>
          <p className="text-sm text-metro-text-secondary mb-2">
            {labels.inviteDesc}
          </p>
          <code className="text-2xl font-mono font-bold tracking-wider text-metro-blue">
            {course.inviteCode}
          </code>
        </div>
      )}

      {/* Danger Zone */}
      <div className="mt-6 metro-card p-6" style={{ borderLeftColor: "var(--metro-error)" }}>
        <h2 className="metro-section-title mb-2 text-metro-error">{labels.danger}</h2>
        <p className="text-sm text-metro-error mb-4">
          {labels.dangerDesc}
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
            {labels.delete}
          </button>
        </form>
      </div>
    </div>
  );
}
