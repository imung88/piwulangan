import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import DashboardClient, {
  type AnnouncementCard,
  type AttendanceCard,
  type CourseCard,
  type DashboardData,
  type EnrollmentCard,
  type GuardianStudentCard,
  type SessionCard,
} from "./DashboardClient"

// Students at ≥80% progress in one of their courses, counted once per student
// (their first enrollment, matching the original behavior). Uses Map/Set
// indexes instead of nested filter/some loops so it stays O(n).
async function countHighProgressStudents(courseIds: string[]): Promise<number> {
  if (courseIds.length === 0) return 0

  const [enrollments, lessons] = await Promise.all([
    db.enrollment.findMany({
      where: { courseId: { in: courseIds } },
      select: { userId: true, courseId: true },
    }),
    db.lesson.findMany({
      where: { module: { courseId: { in: courseIds } } },
      select: { id: true, module: { select: { courseId: true } } },
    }),
  ])
  if (enrollments.length === 0) return 0

  const progress = await db.progress.findMany({
    where: {
      userId: { in: Array.from(new Set(enrollments.map((e) => e.userId))) },
      completed: true,
    },
    select: { userId: true, lessonId: true },
  })

  const lessonsByCourse = new Map<string, Set<string>>()
  for (const l of lessons) {
    if (!lessonsByCourse.has(l.module.courseId)) {
      lessonsByCourse.set(l.module.courseId, new Set())
    }
    lessonsByCourse.get(l.module.courseId)!.add(l.id)
  }
  const completedByUser = new Map<string, Set<string>>()
  for (const p of progress) {
    if (!completedByUser.has(p.userId)) {
      completedByUser.set(p.userId, new Set())
    }
    completedByUser.get(p.userId)!.add(p.lessonId)
  }

  let count = 0
  const counted = new Set<string>()
  for (const e of enrollments) {
    if (counted.has(e.userId)) continue
    counted.add(e.userId)
    const courseLessons = lessonsByCourse.get(e.courseId)
    if (!courseLessons || courseLessons.size === 0) continue
    const userCompleted = completedByUser.get(e.userId) ?? new Set<string>()
    let completed = 0
    for (const lessonId of courseLessons) {
      if (userCompleted.has(lessonId)) completed++
    }
    if (completed / courseLessons.size >= 0.8) count++
  }
  return count
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  const userId = (session.user as any).id
  const role = (session.user as any).role

  // Build lean, role-specific summary data. Only fields the client actually
  // renders are fetched/shaped here — see the card types in DashboardClient.tsx.
  // When extending the dashboard, add fields to those types, not whole ORM rows.
  let dashboardData: DashboardData = {}

  if (role === "STUDENT") {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const [enrollments, progress, bookings] = await Promise.all([
      db.enrollment.findMany({
        where: { userId },
        include: {
          course: {
            include: {
              instructor: { select: { name: true } },
              // Only lesson ids are needed — completion is computed below.
              modules: { select: { lessons: { select: { id: true } } } },
            },
          },
        },
      }),
      db.progress.findMany({
        where: { userId, completed: true },
        select: { lessonId: true },
      }),
      db.classSession.findMany({
        where: {
          attendees: { some: { studentId: userId } },
          status: "SCHEDULED",
          date: { gte: todayStart },
        },
        include: { course: { select: { title: true } } },
        orderBy: { date: "asc" },
        take: 5,
      }),
    ])

    // Announcements depend on the enrollment list — the only dependent query
    // in this branch.
    const announcements = await db.announcement.findMany({
      where: { courseId: { in: enrollments.map((e) => e.courseId) } },
      include: { author: { select: { name: true } }, course: { select: { title: true } } },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 5,
    })

    const completedLessonIds = new Set(progress.map((p) => p.lessonId))
    dashboardData = {
      enrollments: enrollments.map((e): EnrollmentCard => {
        const course = e.course
        const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0)
        const completedLessons = course.modules.reduce(
          (sum, m) => sum + m.lessons.filter((l) => completedLessonIds.has(l.id)).length,
          0,
        )
        return {
          enrollmentId: e.id,
          courseId: course.id,
          title: course.title,
          instructorName: course.instructor?.name,
          totalLessons,
          completedLessons,
          percentage: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
        }
      }),
      bookings: bookings.map((b): SessionCard => ({
        id: b.id,
        courseId: b.courseId,
        title: b.title,
        date: b.date.toISOString(),
        startTime: b.startTime,
        courseTitle: b.course.title,
        attendeeNames: [],
      })),
      announcements: announcements.map((a): AnnouncementCard => ({
        id: a.id,
        courseId: a.courseId,
        pinned: a.pinned,
        title: a.title,
        body: a.body,
        courseTitle: a.course.title,
        authorName: a.author.name,
        createdAt: a.createdAt.toISOString(),
      })),
    }
  } else if (role === "INSTRUCTOR") {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    const [courses, todayBookings, weekBookingsCount, unmarkedCount, unmarkedSessions] =
      await Promise.all([
        db.course.findMany({
          where: { instructorId: userId },
          include: {
            _count: { select: { enrollments: true } },
            modules: { select: { id: true } },
          },
        }),
        db.classSession.findMany({
          where: {
            instructorId: userId,
            date: { gte: today, lt: tomorrow },
            status: "SCHEDULED",
          },
          include: {
            attendees: { include: { student: { select: { name: true } } } },
            course: { select: { title: true } },
          },
          orderBy: { startTime: "asc" },
        }),
        db.classSession.count({
          where: {
            instructorId: userId,
            date: { gte: weekStart, lt: weekEnd },
            status: "SCHEDULED",
          },
        }),
        db.classSession.count({
          where: {
            instructorId: userId,
            date: { lt: tomorrow },
            status: "SCHEDULED",
            attendees: { some: { attendance: null } },
          },
        }),
        db.classSession.findMany({
          where: {
            instructorId: userId,
            date: { lt: tomorrow },
            status: "SCHEDULED",
            attendees: { some: { attendance: null } },
          },
          include: { course: { select: { title: true } } },
          orderBy: { date: "desc" },
          take: 5,
        }),
      ])

    // Depends on the course list above; computes with Map/Set indexes.
    const highProgressCount = await countHighProgressStudents(courses.map((c) => c.id))

    dashboardData = {
      courses: courses.map((c): CourseCard => ({
        id: c.id,
        title: c.title,
        visibility: c.visibility,
        studentCount: c._count.enrollments,
        moduleCount: c.modules.length,
      })),
      todayBookings: todayBookings.map((b): SessionCard => ({
        id: b.id,
        courseId: b.courseId,
        title: b.title,
        date: b.date.toISOString(),
        startTime: b.startTime,
        courseTitle: b.course.title,
        attendeeNames: b.attendees.map((a) => a.student.name),
      })),
      weekBookingsCount,
      highProgressCount,
      unmarkedCount,
      unmarkedSessions: unmarkedSessions.map((s): SessionCard => ({
        id: s.id,
        courseId: s.courseId,
        title: s.title,
        date: s.date.toISOString(),
        startTime: s.startTime,
        courseTitle: s.course.title,
        attendeeNames: [],
      })),
    }
  } else if (role === "GUARDIAN") {
    const links = await db.guardianStudent.findMany({
      where: { guardianId: userId },
      include: {
        student: {
          include: {
            enrollments: {
              include: {
                course: {
                  include: {
                    instructor: { select: { name: true } },
                    modules: { select: { lessons: { select: { id: true } } } },
                  },
                },
              },
            },
            progress: { where: { completed: true }, select: { lessonId: true } },
          },
        },
      },
    })

    const allLinkedCourseIds = links.flatMap((link) =>
      link.student.enrollments.map((e) => e.courseId),
    )
    const linkedCourseIds = Array.from(new Set(allLinkedCourseIds))
    const studentIds = links.map((link) => link.studentId)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [announcements, upcomingSessions, recentAttendance] = await Promise.all([
      linkedCourseIds.length > 0
        ? db.announcement.findMany({
            where: { courseId: { in: linkedCourseIds } },
            include: { author: { select: { name: true } }, course: { select: { title: true } } },
            orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
            take: 5,
          })
        : [],
      studentIds.length > 0
        ? db.classSession.findMany({
            where: {
              status: "SCHEDULED",
              date: { gte: todayStart },
              attendees: { some: { studentId: { in: studentIds } } },
            },
            include: {
              course: { select: { title: true } },
              attendees: {
                where: { studentId: { in: studentIds } },
                include: { student: { select: { name: true } } },
              },
            },
            orderBy: { date: "asc" },
            take: 5,
          })
        : [],
      studentIds.length > 0
        ? db.sessionAttendee.findMany({
            where: {
              studentId: { in: studentIds },
              attendance: { not: null },
            },
            include: {
              student: { select: { name: true } },
              session: {
                select: {
                  id: true,
                  courseId: true,
                  title: true,
                  date: true,
                  course: { select: { title: true } },
                },
              },
            },
            orderBy: { session: { date: "desc" } },
            take: 5,
          })
        : [],
    ])

    dashboardData = {
      links: links.map((link): GuardianStudentCard => {
        const completedLessonIds = new Set(link.student.progress.map((p) => p.lessonId))
        return {
          studentId: link.studentId,
          studentName: link.student.name,
          courses: link.student.enrollments.map((e): EnrollmentCard => {
            const course = e.course
            const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0)
            const completedLessons = course.modules.reduce(
              (sum, m) => sum + m.lessons.filter((l) => completedLessonIds.has(l.id)).length,
              0,
            )
            return {
              enrollmentId: e.id,
              courseId: course.id,
              title: course.title,
              instructorName: course.instructor?.name,
              totalLessons,
              completedLessons,
              percentage: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
            }
          }),
        }
      }),
      announcements: announcements.map((a): AnnouncementCard => ({
        id: a.id,
        courseId: a.courseId,
        pinned: a.pinned,
        title: a.title,
        body: a.body,
        courseTitle: a.course.title,
        authorName: a.author.name,
        createdAt: a.createdAt.toISOString(),
      })),
      upcomingSessions: upcomingSessions.map((s): SessionCard => ({
        id: s.id,
        courseId: s.courseId,
        title: s.title,
        date: s.date.toISOString(),
        startTime: s.startTime,
        courseTitle: s.course.title,
        attendeeNames: s.attendees.map((a) => a.student.name),
      })),
      recentAttendance: recentAttendance.map((r): AttendanceCard => ({
        id: r.id,
        studentName: r.student.name,
        attendance: r.attendance,
        session: {
          id: r.session.id,
          courseId: r.session.courseId,
          title: r.session.title,
          date: r.session.date.toISOString(),
          courseTitle: r.session.course.title,
        },
      })),
    }
  } else if (role === "ADMIN") {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(todayStart)
    todayEnd.setDate(todayEnd.getDate() + 1)

    const [userCounts, totalCourses, sessionsToday] = await Promise.all([
      db.user.groupBy({
        by: ["role"],
        _count: true,
      }),
      db.course.count(),
      db.classSession.count({
        where: {
          date: { gte: todayStart, lt: todayEnd },
          status: "SCHEDULED",
        },
      }),
    ])

    dashboardData = {
      totalUsers: userCounts.reduce((sum, g) => sum + g._count, 0),
      totalCourses,
      sessionsToday,
      userCounts: userCounts.map((g) => ({ role: g.role.toLowerCase(), count: g._count })),
    }
  }

  return (
    <DashboardClient
      data={dashboardData}
      role={role}
      userName={(session.user as any).name ?? null}
    />
  )
}
