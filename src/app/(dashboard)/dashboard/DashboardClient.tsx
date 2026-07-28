"use client"

import { useT } from "@/lib/i18n/useT"

/* ------------------------------------------------------------------ */
/*  DashboardClient — server-rendered data, client-side labels        */
/* ------------------------------------------------------------------ */
type DashboardData = {
  // student
  enrollments?: any[]
  progress?: any[]
  bookings?: any[]
  announcements?: any[]
  // instructor
  courses?: any[]
  todayBookings?: any[]
  weekBookingsCount?: number
  highProgressCount?: number
  // guardian
  links?: any[]
  // admin
  totalUsers?: number
  totalCourses?: number
  sessionsToday?: number
  userCounts?: any[]
}

type Props = { data: DashboardData; role: string; userName: string | null }

export default function DashboardClient({ data, role, userName }: Props) {
  const t = useT()

  return (
    <div>
      <h1 className="metro-page-title">
        {t("student.welcome")}, {userName ?? "—"}
      </h1>
      <span className="metro-badge mt-2 bg-metro-blue text-white">
        {role.toLowerCase()}
      </span>
      <div className="mt-6">
        {role === "STUDENT" && <StudentDashboard data={data} t={t} />}
        {role === "INSTRUCTOR" && <InstructorDashboard data={data} t={t} />}
        {role === "GUARDIAN" && <GuardianDashboard data={data} t={t} />}
        {role === "ADMIN" && <AdminDashboard data={data} t={t} />}
      </div>
    </div>
  )
}

/* ---- helpers ---- */
function pct(progress: any[], course: any): number {
  const totalLessons = course.modules.reduce(
    (sum: number, mod: any) => sum + mod.lessons.length,
    0,
  )
  const completedLessons = progress.filter((p: any) =>
    course.modules.some((mod: any) =>
      mod.lessons.some((lesson: any) => lesson.id === p.lessonId),
    ),
  ).length
  return totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
}

/* ---- Student ---- */
function StudentDashboard({
  data,
  t,
}: {
  data: DashboardData
  t: (p: string) => string
}) {
  const { enrollments = [], progress = [], bookings = [], announcements = [] } =
    data

  return (
    <div className="space-y-6">
      {/* Upcoming Sessions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="metro-section-title">{t("student.upcomingSessions")}</h2>
          <a
            href="/schedule"
            className="text-sm text-metro-blue hover:text-metro-blue-hover font-medium"
          >
            {t("student.viewAll")}
          </a>
        </div>
        {bookings.length === 0 ? (
          <p className="text-sm text-metro-text-secondary">{t("student.noUpcomingSessions")}</p>
        ) : (
          <div className="space-y-2">
            {bookings.map((booking: any) => (
              <div
                key={booking.id}
                className="metro-card metro-card-accent flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-metro-text">{booking.title}</p>
                  <p className="text-sm text-metro-text-secondary">
                    {booking.course.title} ·{" "}
                    {new Date(booking.date).toLocaleDateString()} at {booking.startTime}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* My Courses */}
      <section>
        <h2 className="metro-section-title mb-4">{t("student.myCourses")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {enrollments.map((enrollment: any) => {
            const course = enrollment.course
            const totalLessons = course.modules.reduce(
              (sum: number, mod: any) => sum + mod.lessons.length,
              0,
            )
            const completedLessons = progress.filter((p: any) =>
              course.modules.some((mod: any) =>
                mod.lessons.some((lesson: any) => lesson.id === p.lessonId),
              ),
            ).length
            const percentage =
              totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

            return (
              <div
                key={enrollment.id}
                className="metro-card"
                style={{ borderLeftColor: "var(--metro-green)" }}
              >
                <h3 className="text-base font-medium text-metro-text">{course.title}</h3>
                <p className="text-sm text-metro-text-secondary mt-1 leading-relaxed">
                  {course.instructorId ? t("student.teacher") : ""}
                </p>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-metro-text-secondary">
                      {completedLessons}/{totalLessons} {t("student.lessons")}
                    </span>
                    <span className="font-medium text-metro-text">{percentage}%</span>
                  </div>
                  <div className="mt-1 h-2 bg-metro-border">
                    <div
                      className="h-2 bg-metro-green"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Recent Announcements */}
      {announcements.length > 0 && (
        <section>
          <h2 className="metro-section-title mb-4">{t("student.recentAnnouncements")}</h2>
          <div className="space-y-2">
            {announcements.map((a: any) => (
              <a
                key={a.id}
                href={`/courses/${a.courseId}`}
                className={
                  "metro-card" +
                  (a.pinned ? " metro-card-accent bg-metro-blue-light" : "")
                }
              >
                <div className="flex items-center gap-2">
                  {a.pinned && (
                    <span className="metro-badge bg-metro-blue text-white">
                      {t("common.pin")}
                    </span>
                  )}
                  <h3 className="text-sm font-medium text-metro-text">{a.title}</h3>
                </div>
                <p className="mt-1 text-sm text-metro-text-secondary line-clamp-2 leading-relaxed">
                  {a.body}
                </p>
                <p className="mt-1 text-sm text-metro-text-secondary">
                  {a.course.title} · {a.author.name} ·{" "}
                  {new Date(a.createdAt).toLocaleDateString()}
                </p>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

/* ---- Instructor ---- */
function InstructorDashboard({
  data,
  t,
}: {
  data: DashboardData
  t: (p: string) => string
}) {
  const {
    courses = [],
    todayBookings = [],
    weekBookingsCount = 0,
    highProgressCount = 0,
  } = data

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <section>
        <h2 className="metro-section-title mb-4">{t("instructor.quickStats")}</h2>
        <div className="grid gap-2 grid-cols-2 sm:max-w-md">
          <a href="/schedule" className="metro-tile metro-tile-blue">
            <span className="metro-tile-value">{weekBookingsCount}</span>
            <span className="metro-tile-label">{t("instructor.sessionsThisWeek")}</span>
          </a>
          <a href="/courses" className="metro-tile metro-tile-green">
            <span className="metro-tile-value">{highProgressCount}</span>
            <span className="metro-tile-label">{t("instructor.studentsAt80plus")}</span>
          </a>
        </div>
      </section>

      {/* Today's Sessions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="metro-section-title">{t("instructor.todaysSessions")}</h2>
          <a
            href="/schedule"
            className="text-sm text-metro-blue hover:text-metro-blue-hover font-medium"
          >
            {t("instructor.viewFullSchedule")}
          </a>
        </div>
        {todayBookings.length === 0 ? (
          <p className="text-sm text-metro-text-secondary">{t("instructor.noSessionsToday")}</p>
        ) : (
          <div className="space-y-2">
            {todayBookings.map((booking: any) => (
              <div
                key={booking.id}
                className="metro-card metro-card-accent flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-metro-text">
                    {booking.startTime} — {booking.title}
                  </p>
                  <p className="text-sm text-metro-text-secondary">
                    {booking.course.title} ·{" "}
                    {booking.attendees.map((a: any) => a.student.name).join(", ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* My Courses */}
      <section>
        <h2 className="metro-section-title mb-4">{t("instructor.myCourses")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {courses.map((course: any) => (
            <div
              key={course.id}
              className="metro-card"
              style={{
                borderLeftColor:
                  course.visibility === "PUBLISHED"
                    ? "var(--metro-green)"
                    : "var(--metro-border)",
              }}
            >
              <h3 className="text-base font-medium text-metro-text">{course.title}</h3>
              <p className="text-sm text-metro-text-secondary mt-1 leading-relaxed">
                {course.enrollments.length} {t("instructor.students")} ·{" "}
                {course.modules.length} {t("instructor.modules")}
              </p>
              <span
                className={
                  "metro-badge mt-2 " +
                  (course.visibility === "PUBLISHED"
                    ? "bg-metro-green-light text-metro-green"
                    : "bg-metro-border text-metro-text-secondary")
                }
              >
                {course.visibility === "PUBLISHED"
                  ? t("common.published")
                  : t("common.draft")}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

/* ---- Guardian ---- */
function GuardianDashboard({
  data,
  t,
}: {
  data: DashboardData
  t: (p: string) => string
}) {
  const { links = [], announcements = [] } = data

  return (
    <div className="space-y-6">
      {links.map((link: any) => {
        const student = link.student

        return (
          <section key={link.id}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="metro-section-title">
                {student.name}&apos;s {t("guardian.progress")}
              </h2>
              <a
                href="/schedule"
                className="text-sm text-metro-blue hover:text-metro-blue-hover font-medium"
              >
                {t("guardian.viewSchedule")}
              </a>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {student.enrollments?.map((enrollment: any) => {
                const course = enrollment.course
                const totalLessons = course.modules?.reduce(
                  (sum: number, mod: any) => sum + (mod.lessons?.length || 0),
                  0,
                ) || 0
                const completed =
                  student.progress?.filter((p: any) =>
                    course.modules?.some((mod: any) =>
                      mod.lessons?.some((l: any) => l.id === p.lessonId),
                    ),
                  ).length || 0
                const pct =
                  totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0

                return (
                  <div
                    key={enrollment.id}
                    className="metro-card"
                    style={{ borderLeftColor: "var(--metro-green)" }}
                  >
                    <h3 className="text-base font-medium text-metro-text">{course.title}</h3>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-metro-text-secondary">
                          {completed}/{totalLessons} {t("guardian.lessons")}
                        </span>
                        <span className="font-medium text-metro-text">{pct}%</span>
                      </div>
                      <div className="mt-1 h-2 bg-metro-border">
                        <div
                          className="h-2 bg-metro-green"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
              {(!student.enrollments || student.enrollments.length === 0) && (
                <p className="text-sm text-metro-text-secondary">{t("guardian.notEnrolled")}</p>
              )}
            </div>
          </section>
        )
      })}
      {links.length === 0 && (
        <p className="text-sm text-metro-text-secondary">{t("guardian.noLinkedStudents")}</p>
      )}

      {/* Recent Announcements */}
      {announcements.length > 0 && (
        <section>
          <h2 className="metro-section-title mb-4">{t("student.recentAnnouncements")}</h2>
          <div className="space-y-2">
            {announcements.map((a: any) => (
              <a
                key={a.id}
                href={`/courses/${a.courseId}`}
                className={
                  "metro-card" +
                  (a.pinned ? " metro-card-accent bg-metro-blue-light" : "")
                }
              >
                <div className="flex items-center gap-2">
                  {a.pinned && (
                    <span className="metro-badge bg-metro-blue text-white">
                      {t("common.pin")}
                    </span>
                  )}
                  <h3 className="text-sm font-medium text-metro-text">{a.title}</h3>
                </div>
                <p className="mt-1 text-sm text-metro-text-secondary line-clamp-2 leading-relaxed">
                  {a.body}
                </p>
                <p className="mt-1 text-sm text-metro-text-secondary">
                  {a.course.title} · {a.author.name} ·{" "}
                  {new Date(a.createdAt).toLocaleDateString()}
                </p>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

/* ---- Admin ---- */
function AdminDashboard({
  data,
  t,
}: {
  data: DashboardData
  t: (p: string) => string
}) {
  const {
    totalUsers = 0,
    totalCourses = 0,
    sessionsToday = 0,
    userCounts = [],
  } = data

  const roleBreakdown = (userCounts as any[]).map((g) => ({
    role: g.role.toLowerCase(),
    count: g._count,
  }))

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <section>
        <h2 className="metro-section-title mb-4">{t("admin.overview")}</h2>
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 max-w-3xl">
          <a href="/admin/users" className="metro-tile metro-tile-blue col-span-2">
            <span className="metro-tile-value">{totalUsers}</span>
            <div>
              <span className="metro-tile-label block">{t("admin.totalUsers")}</span>
              <span className="mt-1 block text-xs text-white/80">
                {roleBreakdown
                  .map(
                    (r) =>
                      `${r.count} ${r.role}${r.count !== 1 ? "s" : ""}`,
                  )
                  .join(" · ")}
              </span>
            </div>
          </a>
          <a href="/courses" className="metro-tile metro-tile-green">
            <span className="metro-tile-value">{totalCourses}</span>
            <span className="metro-tile-label">{t("admin.courses")}</span>
          </a>
          <a href="/schedule" className="metro-tile metro-tile-orange">
            <span className="metro-tile-value">{sessionsToday}</span>
            <span className="metro-tile-label">{t("admin.sessionsToday")}</span>
          </a>
        </div>
      </section>

      {/* Quick Links */}
      <section>
        <h2 className="metro-section-title mb-4">{t("admin.quickLinks")}</h2>
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 max-w-3xl">
          <a href="/courses" className="metro-tile metro-tile-blue">
            <span className="text-3xl">📖</span>
            <span className="metro-tile-label">{t("admin.manageCourses")}</span>
          </a>
          <a href="/schedule" className="metro-tile metro-tile-dark">
            <span className="text-3xl">🗓️</span>
            <span className="metro-tile-label">{t("admin.schedule")}</span>
          </a>
          <a href="/announcements" className="metro-tile metro-tile-green">
            <span className="text-3xl">📢</span>
            <span className="metro-tile-label">{t("admin.announcements")}</span>
          </a>
          <a href="/admin/users" className="metro-tile metro-tile-orange">
            <span className="text-3xl">👥</span>
            <span className="metro-tile-label">{t("admin.manageUsers")}</span>
          </a>
        </div>
      </section>
    </div>
  )
}
