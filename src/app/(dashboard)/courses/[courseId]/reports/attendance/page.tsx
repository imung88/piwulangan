import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canManageCourse } from "@/lib/coursePerms";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getServerT, formatT } from "@/lib/i18n/serverT";

const ATT_BADGE: Record<string, string> = {
  PRESENT: "bg-metro-green text-white",
  LATE: "bg-metro-orange text-white",
  ABSENT: "bg-metro-error text-white",
  NONE: "bg-metro-border text-metro-text-secondary",
};

export default async function AttendanceRecordPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ student?: string }>;
}) {
  const t = await getServerT();
  const { courseId } = await params;
  const { student: studentParam } = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  const course = await db.course.findUnique({ where: { id: courseId } });
  if (!course) notFound();

  const isManager = await canManageCourse(userId, role, course);

  // Students this viewer may inspect
  let allowedStudents: { id: string; name: string }[] = [];
  if (isManager) {
    const enrollments = await db.enrollment.findMany({
      where: { courseId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { user: { name: "asc" } },
    });
    allowedStudents = enrollments.map((e) => e.user);
  } else if (role === "STUDENT") {
    const enrollment = await db.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: { user: { select: { id: true, name: true } } },
    });
    if (!enrollment) redirect(`/courses/${courseId}`);
    allowedStudents = [enrollment.user];
  } else if (role === "GUARDIAN") {
    const links = await db.guardianStudent.findMany({
      where: {
        guardianId: userId,
        student: { enrollments: { some: { courseId } } },
      },
      include: { student: { select: { id: true, name: true } } },
    });
    allowedStudents = links.map((l) => l.student);
    if (allowedStudents.length === 0) redirect(`/courses/${courseId}`);
  } else {
    redirect(`/courses/${courseId}`);
  }

  const target =
    allowedStudents.find((s) => s.id === studentParam) ?? allowedStudents[0];

  const labels = {
    back: t("reports.backToReports"),
    title: t("reports.attendanceTitle"),
    subtitle: t("reports.attendanceSubtitle"),
    noSessions: t("reports.noSessions"),
    notes: t("reports.notes"),
    cancelled: t("statusLabels.CANCELLED"),
    attPresent: t("attendanceLabels.PRESENT"),
    attLate: t("attendanceLabels.LATE"),
    attAbsent: t("attendanceLabels.ABSENT"),
    attNone: t("attendanceLabels.NONE"),
  };
  const attLabel: Record<string, string> = {
    PRESENT: labels.attPresent,
    LATE: labels.attLate,
    ABSENT: labels.attAbsent,
    NONE: labels.attNone,
  };

  if (!target) {
    return (
      <div>
        <Link
          href={`/courses/${courseId}/${isManager ? "manage/reports" : "reports"}`}
          className="text-sm text-metro-text-secondary hover:text-metro-text"
        >
          {labels.back}
        </Link>
        <h1 className="metro-page-title mt-2">{labels.title}</h1>
        <p className="mt-6 border border-metro-border bg-metro-surface px-4 py-8 text-center text-metro-text-secondary">
          {labels.noSessions}
        </p>
      </div>
    );
  }

  const records = await db.sessionAttendee.findMany({
    where: {
      studentId: target.id,
      session: { courseId },
    },
    include: {
      session: {
        select: {
          id: true,
          title: true,
          date: true,
          startTime: true,
          endTime: true,
          status: true,
        },
      },
    },
    orderBy: { session: { date: "desc" } },
  });

  const active = records.filter((r) => r.session.status !== "CANCELLED");
  const counts = { PRESENT: 0, LATE: 0, ABSENT: 0, NONE: 0 };
  for (const r of active) counts[(r.attendance ?? "NONE") as keyof typeof counts]++;

  return (
    <div>
      <Link
        href={`/courses/${courseId}/${isManager ? "manage/reports" : "reports"}`}
        className="text-sm text-metro-text-secondary hover:text-metro-text"
      >
        {labels.back}
      </Link>
      <h1 className="metro-page-title mt-2">{labels.title}</h1>
      <p className="text-sm text-metro-text-secondary mt-1">
        {formatT(labels.subtitle, { name: target.name, title: course.title })}
      </p>

      {/* Student switcher (guardian with several kids / teacher) */}
      {allowedStudents.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {allowedStudents.map((s) => (
            <Link
              key={s.id}
              href={`/courses/${courseId}/reports/attendance?student=${s.id}`}
              className={`inline-flex min-h-[44px] items-center px-4 text-sm font-medium ${
                s.id === target.id
                  ? "bg-metro-blue text-white"
                  : "border border-metro-border text-metro-text-secondary hover:bg-metro-blue-light"
              }`}
            >
              {s.name}
            </Link>
          ))}
        </div>
      )}

      {/* Summary tiles */}
      <div className="mt-6 grid grid-cols-3 gap-2 max-w-md">
        <div className="bg-metro-green p-3 text-center text-white">
          <p className="text-3xl font-bold">{counts.PRESENT}</p>
          <p className="text-xs font-semibold">{labels.attPresent}</p>
        </div>
        <div className="bg-metro-orange p-3 text-center text-white">
          <p className="text-3xl font-bold">{counts.LATE}</p>
          <p className="text-xs font-semibold">{labels.attLate}</p>
        </div>
        <div className="bg-metro-error p-3 text-center text-white">
          <p className="text-3xl font-bold">{counts.ABSENT}</p>
          <p className="text-xs font-semibold">{labels.attAbsent}</p>
        </div>
      </div>

      {/* Session history */}
      {records.length === 0 ? (
        <p className="mt-6 border border-metro-border bg-metro-surface px-4 py-8 text-center text-metro-text-secondary">
          {labels.noSessions}
        </p>
      ) : (
        <div className="mt-6 divide-y divide-metro-border border border-metro-border bg-metro-surface">
          {records.map((r) => {
            const cancelled = r.session.status === "CANCELLED";
            const status = cancelled ? null : r.attendance ?? "NONE";
            return (
              <div key={r.id} className={`p-4 ${cancelled ? "opacity-50" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-metro-text">
                      <Link
                        href={`/courses/${courseId}/schedule/${r.session.id}`}
                        className="hover:underline"
                      >
                        {r.session.title}
                      </Link>
                    </p>
                    <p className="mt-0.5 text-sm text-metro-text-secondary">
                      {new Date(r.session.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      · {r.session.startTime} – {r.session.endTime}
                    </p>
                  </div>
                  <span
                    className={`metro-badge shrink-0 ${
                      cancelled ? ATT_BADGE.NONE : ATT_BADGE[status!]
                    }`}
                  >
                    {cancelled ? labels.cancelled : attLabel[status!]}
                  </span>
                </div>
                {r.notes && !cancelled && (
                  <p className="mt-2 text-sm text-metro-text-secondary">
                    {labels.notes}: {r.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
