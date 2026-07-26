import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";

export default async function AnnouncementsPage({
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
    include: { enrollments: true },
  });
  if (!course) notFound();

  const isOwner = course.instructorId === userId || role === "ADMIN";
  const isEnrolled = course.enrollments.some((e) => e.userId === userId);

  // Guardian: check if linked student is enrolled
  let isGuardianLinked = false;
  if (role === "GUARDIAN") {
    const link = await db.guardianStudent.findFirst({
      where: {
        guardianId: userId,
        student: { enrollments: { some: { courseId: params.courseId } } },
      },
    });
    isGuardianLinked = !!link;
  }

  if (!isOwner && !isEnrolled && !isGuardianLinked) {
    if (course.visibility !== "PUBLISHED") {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">This course is not available.</p>
        </div>
      );
    }
  }

  const announcements = await db.announcement.findMany({
    where: { courseId: params.courseId },
    include: { author: true },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div>
      <Link
        href={`/courses/${params.courseId}`}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        ← Back to course
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mt-2">
        📢 Announcements: {course.title}
      </h1>

      {isOwner && (
        <Link
          href={`/courses/${params.courseId}/manage/announcements`}
          className="mt-3 inline-block text-sm text-blue-600 hover:underline"
        >
          Manage announcements →
        </Link>
      )}

      <div className="mt-6">
        {announcements.length === 0 ? (
          <p className="text-sm text-gray-500">No announcements yet.</p>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <div
                key={a.id}
                className={`rounded-lg border bg-white p-4 ${
                  a.pinned ? "border-blue-200 bg-blue-50" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  {a.pinned && (
                    <span className="text-xs text-blue-600">📌</span>
                  )}
                  <h3 className="font-medium">{a.title}</h3>
                </div>
                <p className="mt-2 text-sm text-gray-600 whitespace-pre-wrap">
                  {a.body}
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  {a.author.name} ·{" "}
                  {new Date(a.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
