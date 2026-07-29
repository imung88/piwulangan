import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageCourse } from "@/lib/coursePerms";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { publishCourse, unpublishCourse, deleteCourse, archiveCourse, unarchiveCourse } from "@/actions/courses";
import {
  AddCoInstructorForm,
  RemoveCoInstructorButton,
  TransferOwnershipForm,
} from "./TeacherActions";
import { CourseDetailsForm } from "./CourseDetailsForm";
import { getServerT, formatT } from "@/lib/i18n/serverT";

export default async function CourseSettingsPage({
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
      instructor: { select: { id: true, name: true, email: true } },
      coInstructors: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { addedAt: "asc" },
      },
    },
  });

  if (!course) notFound();

  if (!(await canManageCourse(userId, role, course))) {
    redirect("/courses");
  }

  const isOwnerLevel = role === "ADMIN" || course.instructorId === userId;

  const coInstructorIds = course.coInstructors.map((c) => c.userId);
  const teacherCandidates = isOwnerLevel
    ? await db.user.findMany({
        where: {
          role: "INSTRUCTOR",
          active: true,
          id: { notIn: [...coInstructorIds, course.instructorId] },
        },
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
      })
    : [];

  const labels = {
    back: t("settings.back"),
    title: t("settings.title"),
    courseDetails: t("settings.courseDetails"),
    visibility: t("settings.visibility"),
    publishedDesc: t("settings.publishedDesc"),
    archivedDesc: t("settings.archivedDesc"),
    draftDesc: t("settings.draftDesc"),
    publish: t("settings.publish"),
    unpublish: t("settings.unpublish"),
    archive: t("settings.archive"),
    unarchive: t("settings.unarchive"),
    inviteCode: t("settings.inviteCode"),
    inviteDesc: t("settings.inviteDesc"),
    danger: t("settings.danger"),
    dangerDesc: t("settings.dangerDesc"),
    delete: t("settings.delete"),
    teachers: t("settings.teachers"),
    ownerLbl: t("settings.ownerLbl"),
    coTeachers: t("settings.coTeachers"),
    noCoTeachers: t("settings.noCoTeachers"),
    addCoTeacher: t("settings.addCoTeacher"),
    transferOwnership: t("settings.transferOwnership"),
    transferDesc: t("settings.transferDesc"),
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
        <CourseDetailsForm
          courseId={courseId}
          initial={{
            title: course.title,
            description: course.description || "",
            coverImageUrl: course.coverImageUrl || "",
            enrollmentMode: course.enrollmentMode,
          }}
        />
      </div>

      {/* Teachers */}
      <div className="mt-6 metro-card p-6">
        <h2 className="metro-section-title mb-4">{labels.teachers}</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-metro-text-secondary">
              {labels.ownerLbl}
            </p>
            <p className="mt-1 font-medium">👤 {course.instructor.name}</p>
            <p className="text-sm text-metro-text-secondary">{course.instructor.email}</p>
          </div>
        </div>

        <div className="mt-4 border-t border-metro-border pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-metro-text-secondary">
            {labels.coTeachers}
          </p>
          {course.coInstructors.length === 0 ? (
            <p className="mt-2 text-sm text-metro-text-secondary">{labels.noCoTeachers}</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {course.coInstructors.map((ci) => (
                <li key={ci.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">👤 {ci.user.name}</p>
                    <p className="text-xs text-metro-text-secondary">{ci.user.email}</p>
                  </div>
                  {isOwnerLevel && (
                    <RemoveCoInstructorButton
                      courseId={courseId}
                      instructorId={ci.userId}
                      instructorName={ci.user.name}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
          {isOwnerLevel && (
            <div className="mt-3">
              <p className="mb-2 text-sm font-medium text-metro-text">{labels.addCoTeacher}</p>
              <AddCoInstructorForm courseId={courseId} candidates={teacherCandidates} />
            </div>
          )}
        </div>

        {isOwnerLevel && (
          <div className="mt-4 border-t border-metro-border pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-metro-text-secondary">
              {labels.transferOwnership}
            </p>
            <p className="mt-1 mb-2 text-sm text-metro-text-secondary">{labels.transferDesc}</p>
            <TransferOwnershipForm
              courseId={courseId}
              candidates={[
                ...course.coInstructors.map((ci) => ci.user),
                ...teacherCandidates,
              ]}
            />
          </div>
        )}
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
      {isOwnerLevel && (
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
      )}
    </div>
  );
}
