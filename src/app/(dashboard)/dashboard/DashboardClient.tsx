"use client"

import Link from "next/link"
import { useT, format } from "@/lib/i18n/useT"
import { ATTENDANCE_COLORS, attendanceLabel } from "@/components/schedule/types"
import RoleBadge from "@/components/RoleBadge"
import PublishCourseButton from "@/components/PublishCourseButton"

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
  unmarkedCount?: number
  unmarkedSessions?: any[]
  // guardian
  links?: any[]
  upcomingSessions?: any[]
  recentAttendance?: any[]
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
      <span className="mt-2 inline-block">
        <RoleBadge role={role} />
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
function courseProgress(progress: any[], course: any) {
  const totalLessons =
    course.modules?.reduce(
      (sum: number, mod: any) => sum + (mod.lessons?.length || 0),
      0,
    ) || 0
  const completedLessons = progress.filter((p: any) =>
    course.modules?.some((mod: any) =>
      mod.lessons?.some((lesson: any) => lesson.id === p.lessonId),
    ),
  ).length
  const percentage =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
  return { totalLessons, completedLessons, percentage }
}

function SectionHeader({
  title,
  linkHref,
  linkLabel,
}: {
  title: string
  linkHref: string
  linkLabel: string
}) {
  return (
    <div className="flex items-baseline gap-3 mb-4">
      <h2 className="metro-section-title">{title}</h2>
      <Link
        href={linkHref}
        className="text-sm text-metro-blue hover:text-metro-blue-hover font-medium"
      >
        {linkLabel}
      </Link>
    </div>
  )
}

function ProgressCard({
  href,
  title,
  subtitle,
  completedLessons,
  totalLessons,
  percentage,
  lessonsLabel,
}: {
  href: string
  title: string
  subtitle?: string
  completedLessons: number
  totalLessons: number
  percentage: number
  lessonsLabel: string
}) {
  return (
    <Link
      href={href}
      className="metro-card"
      style={{ borderLeftColor: "var(--metro-green)" }}
    >
      <h3 className="text-base font-medium text-metro-text">{title}</h3>
      {subtitle && (
        <p className="text-sm text-metro-text-secondary mt-1 leading-relaxed">
          {subtitle}
        </p>
      )}
      <div className="mt-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-metro-text-secondary">
            {completedLessons}/{totalLessons} {lessonsLabel}
          </span>
          <span className="font-medium text-metro-text">{percentage}%</span>
        </div>
        <div className="mt-1 h-2 bg-metro-border">
          <div className="h-2 bg-metro-green" style={{ width: `${percentage}%` }} />
        </div>
      </div>
    </Link>
  )
}

function AnnouncementList({
  announcements,
  t,
}: {
  announcements: any[]
  t: (p: string) => string
}) {
  if (announcements.length === 0) return null

  return (
    <section>
      <h2 className="metro-section-title mb-4">{t("student.recentAnnouncements")}</h2>
      <div className="space-y-2">
        {announcements.map((a: any) => (
          <Link
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
          </Link>
        ))}
      </div>
    </section>
  )
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
        <SectionHeader
          title={t("student.upcomingSessions")}
          linkHref="/schedule"
          linkLabel={t("student.viewAll")}
        />
        {bookings.length === 0 ? (
          <p className="text-sm text-metro-text-secondary">{t("student.noUpcomingSessions")}</p>
        ) : (
          <div className="space-y-2">
            {bookings.map((booking: any) => (
              <Link
                key={booking.id}
                href={`/courses/${booking.courseId}/schedule/${booking.id}`}
                className="metro-card metro-card-accent flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-metro-text">{booking.title}</p>
                  <p className="text-sm text-metro-text-secondary">
                    {booking.course.title} ·{" "}
                    {new Date(booking.date).toLocaleDateString()} at {booking.startTime}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* My Courses */}
      <section>
        <h2 className="metro-section-title mb-4">{t("student.myCourses")}</h2>
        {enrollments.length === 0 ? (
          <div>
            <p className="text-sm text-metro-text-secondary">{t("student.noCourses")}</p>
            <Link
              href="/courses"
              className="mt-2 inline-block text-sm text-metro-blue hover:text-metro-blue-hover font-medium"
            >
              {t("student.browseCourses")}
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {enrollments.map((enrollment: any) => {
              const course = enrollment.course
              const { totalLessons, completedLessons, percentage } =
                courseProgress(progress, course)

              return (
                <ProgressCard
                  key={enrollment.id}
                  href={`/courses/${course.id}`}
                  title={course.title}
                  subtitle={
                    course.instructor?.name
                      ? `${t("student.teacher")}: ${course.instructor.name}`
                      : undefined
                  }
                  completedLessons={completedLessons}
                  totalLessons={totalLessons}
                  percentage={percentage}
                  lessonsLabel={t("student.lessons")}
                />
              )
            })}
          </div>
        )}
      </section>

      {/* Recent Announcements */}
      <AnnouncementList announcements={announcements} t={t} />
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
    unmarkedCount = 0,
    unmarkedSessions = [],
  } = data

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <section>
        <h2 className="metro-section-title mb-4">{t("instructor.quickStats")}</h2>
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 sm:max-w-2xl">
          <Link href="/schedule" className="metro-tile metro-tile-blue">
            <span className="metro-tile-value">{weekBookingsCount}</span>
            <span className="metro-tile-label">{t("instructor.sessionsThisWeek")}</span>
          </Link>
          <Link href="/courses" className="metro-tile metro-tile-green">
            <span className="metro-tile-value">{highProgressCount}</span>
            <span className="metro-tile-label">{t("instructor.studentsAt80plus")}</span>
          </Link>
          {unmarkedCount > 0 && (
            <Link
              href="/schedule"
              className="metro-tile metro-tile-orange col-span-2 sm:col-span-1"
            >
              <span className="metro-tile-value">{unmarkedCount}</span>
              <span className="metro-tile-label">{t("instructor.needsAttendance")}</span>
            </Link>
          )}
        </div>
      </section>

      {/* Sessions awaiting attendance */}
      {unmarkedSessions.length > 0 && (
        <section>
          <h2 className="metro-section-title mb-4">{t("instructor.needsAttendance")}</h2>
          <div className="space-y-2">
            {unmarkedSessions.map((s: any) => (
              <Link
                key={s.id}
                href={`/courses/${s.courseId}/schedule/${s.id}`}
                className="metro-card flex items-center justify-between gap-2"
                style={{ borderLeftColor: "var(--metro-orange)" }}
              >
                <div className="min-w-0">
                  <p className="font-medium text-metro-text truncate">{s.title}</p>
                  <p className="text-sm text-metro-text-secondary">
                    {s.course.title} · {new Date(s.date).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-sm text-metro-orange font-medium shrink-0">
                  {t("instructor.markAttendance")}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Today's Sessions */}
      <section>
        <SectionHeader
          title={t("instructor.todaysSessions")}
          linkHref="/schedule"
          linkLabel={t("instructor.viewFullSchedule")}
        />
        {todayBookings.length === 0 ? (
          <p className="text-sm text-metro-text-secondary">{t("instructor.noSessionsToday")}</p>
        ) : (
          <div className="space-y-2">
            {todayBookings.map((booking: any) => (
              <Link
                key={booking.id}
                href={`/courses/${booking.courseId}/schedule/${booking.id}`}
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
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* My Courses */}
      <section>
        <h2 className="metro-section-title mb-4">{t("instructor.myCourses")}</h2>
        {courses.length === 0 ? (
          <div>
            <p className="text-sm text-metro-text-secondary">{t("instructor.noCourses")}</p>
            <Link
              href="/courses"
              className="mt-2 inline-block text-sm text-metro-blue hover:text-metro-blue-hover font-medium"
            >
              {t("student.browseCourses")}
            </Link>
          </div>
        ) : (
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
                <Link href={`/courses/${course.id}`} className="block">
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
                </Link>
                {course.visibility === "DRAFT" && (
                  <div className="mt-3 pt-3 border-t border-metro-border">
                    <PublishCourseButton courseId={course.id} title={course.title} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
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
  const {
    links = [],
    announcements = [],
    upcomingSessions = [],
    recentAttendance = [],
  } = data

  return (
    <div className="space-y-6">
      {links.map((link: any) => {
        const student = link.student

        return (
          <section key={link.id}>
            <SectionHeader
              title={format(t("guardian.progressOf"), { name: student.name })}
              linkHref="/schedule"
              linkLabel={t("guardian.viewSchedule")}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {student.enrollments?.map((enrollment: any) => {
                const course = enrollment.course
                const { totalLessons, completedLessons, percentage } =
                  courseProgress(student.progress || [], course)

                return (
                  <ProgressCard
                    key={enrollment.id}
                    href={`/courses/${course.id}`}
                    title={course.title}
                    completedLessons={completedLessons}
                    totalLessons={totalLessons}
                    percentage={percentage}
                    lessonsLabel={t("guardian.lessons")}
                  />
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

      {/* Upcoming sessions for linked students */}
      {links.length > 0 && (
        <section>
          <h2 className="metro-section-title mb-4">{t("guardian.upcomingSessions")}</h2>
          {upcomingSessions.length === 0 ? (
            <p className="text-sm text-metro-text-secondary">
              {t("guardian.noUpcomingSessions")}
            </p>
          ) : (
            <div className="space-y-2">
              {upcomingSessions.map((s: any) => (
                <Link
                  key={s.id}
                  href={`/courses/${s.courseId}/schedule/${s.id}`}
                  className="metro-card metro-card-accent"
                >
                  <p className="font-medium text-metro-text">{s.title}</p>
                  <p className="text-sm text-metro-text-secondary">
                    {s.course.title} · {new Date(s.date).toLocaleDateString()} · {s.startTime}
                    {" · "}
                    {s.attendees.map((a: any) => a.student.name).join(", ")}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Recent attendance for linked students */}
      {recentAttendance.length > 0 && (
        <section>
          <h2 className="metro-section-title mb-4">{t("guardian.recentAttendance")}</h2>
          <div className="space-y-2">
            {recentAttendance.map((r: any) => (
              <Link
                key={r.id}
                href={`/courses/${r.session.courseId}/schedule/${r.session.id}`}
                className="metro-card flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="font-medium text-metro-text truncate">
                    {r.student.name} · {r.session.title}
                  </p>
                  <p className="text-sm text-metro-text-secondary">
                    {r.session.course.title} ·{" "}
                    {new Date(r.session.date).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={
                    "text-sm font-medium shrink-0 " +
                    (ATTENDANCE_COLORS[r.attendance] || "")
                  }
                >
                  {attendanceLabel(r.attendance, t)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recent Announcements */}
      <AnnouncementList announcements={announcements} t={t} />
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
          <Link href="/admin/users" className="metro-tile metro-tile-blue col-span-2">
            <span className="metro-tile-value">{totalUsers}</span>
            <div>
              <span className="metro-tile-label block">{t("admin.totalUsers")}</span>
              <span className="mt-1 block text-xs text-white/80">
                {roleBreakdown
                  .map((r) => `${r.count} ${t(`roles.${r.role}`)}`)
                  .join(" · ")}
              </span>
            </div>
          </Link>
          <Link href="/courses" className="metro-tile metro-tile-green">
            <span className="metro-tile-value">{totalCourses}</span>
            <span className="metro-tile-label">{t("admin.courses")}</span>
          </Link>
          <Link href="/schedule" className="metro-tile metro-tile-orange">
            <span className="metro-tile-value">{sessionsToday}</span>
            <span className="metro-tile-label">{t("admin.sessionsToday")}</span>
          </Link>
        </div>
      </section>

      {/* Quick Links */}
      <section>
        <h2 className="metro-section-title mb-4">{t("admin.quickLinks")}</h2>
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 max-w-3xl">
          <Link href="/courses" className="metro-tile metro-tile-blue">
            <span className="text-3xl">📖</span>
            <span className="metro-tile-label">{t("admin.manageCourses")}</span>
          </Link>
          <Link href="/schedule" className="metro-tile metro-tile-dark">
            <span className="text-3xl">🗓️</span>
            <span className="metro-tile-label">{t("admin.schedule")}</span>
          </Link>
          <Link href="/announcements" className="metro-tile metro-tile-green">
            <span className="text-3xl">📢</span>
            <span className="metro-tile-label">{t("admin.announcements")}</span>
          </Link>
          <Link href="/admin/users" className="metro-tile metro-tile-orange">
            <span className="text-3xl">👥</span>
            <span className="metro-tile-label">{t("admin.manageUsers")}</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
