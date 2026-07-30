import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import DashboardClient from "./DashboardClient"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login")
  }

  const userId = (session.user as any).id
  const role = (session.user as any).role

  // Fetch data based on role
  let dashboardData: any = {}
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
              modules: {
                include: { lessons: true },
              },
            },
          },
        },
      }),
      db.progress.findMany({
        where: { userId, completed: true },
      }),
      db.classSession.findMany({
        where: {
          attendees: { some: { studentId: userId } },
          status: "SCHEDULED",
          date: { gte: todayStart },
        },
        include: { course: true },
        orderBy: { date: "asc" },
        take: 5,
      }),
    ])

    const enrolledCourseIds = enrollments.map((e: any) => e.courseId)
    const announcements = await db.announcement.findMany({
      where: { courseId: { in: enrolledCourseIds } },
      include: { author: { select: { id: true, name: true } }, course: true },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 5,
    })

    dashboardData = { enrollments, progress, bookings, announcements }
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
            enrollments: { include: { user: { select: { id: true, name: true } } } },
            modules: { include: { lessons: true } },
          },
        }),
        db.classSession.findMany({
          where: {
            instructorId: userId,
            date: { gte: today, lt: tomorrow },
            status: "SCHEDULED",
          },
          include: { attendees: { include: { student: { select: { id: true, name: true } } } }, course: true },
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

    const courseIds = courses.map((c: any) => c.id)
    const allEnrollments = await db.enrollment.findMany({
      where: { courseId: { in: courseIds } },
      include: {
        user: { select: { id: true } },
        course: {
          include: {
            modules: { include: { lessons: true } },
          },
        },
      },
    })
    const allProgress = await db.progress.findMany({
      where: {
        userId: { in: allEnrollments.map((e: any) => e.userId) },
        completed: true,
      },
    })

    let highProgressCount = 0
    const seen = new Set<string>()
    for (const enrollment of allEnrollments) {
      if (seen.has(enrollment.userId)) continue
      seen.add(enrollment.userId)
      const totalLessons = enrollment.course.modules.reduce(
        (sum: number, mod: any) => sum + mod.lessons.length,
        0,
      )
      if (totalLessons === 0) continue
      const completed = allProgress.filter(
        (p) =>
          p.userId === enrollment.userId &&
          enrollment.course.modules.some((mod: any) =>
            mod.lessons.some((l: any) => l.id === p.lessonId),
          ),
      ).length
      if (completed / totalLessons >= 0.8) {
        highProgressCount++
      }
    }

    dashboardData = {
      courses,
      todayBookings,
      weekBookingsCount,
      highProgressCount,
      unmarkedCount,
      unmarkedSessions,
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
                    modules: { include: { lessons: true } },
                  },
                },
              },
            },
            progress: { where: { completed: true} },
          },
        },
      },
    })

    const allLinkedCourseIds = links.flatMap((link: any) =>
      link.student.enrollments.map((e: any) => e.courseId),
    )
    const linkedCourseIds = Array.from(new Set(allLinkedCourseIds))
    const studentIds = links.map((link: any) => link.studentId)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [announcements, upcomingSessions, recentAttendance] = await Promise.all([
      linkedCourseIds.length > 0
        ? db.announcement.findMany({
            where: { courseId: { in: linkedCourseIds } },
            include: { author: { select: { id: true, name: true } }, course: true },
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

    dashboardData = { links, announcements, upcomingSessions, recentAttendance }
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
    const totalUsers = userCounts.reduce(
      (sum: number, g: any) => sum + g._count,
      0,
    )

    dashboardData = { totalUsers, totalCourses, sessionsToday, userCounts }
  }

  return (
    <DashboardClient
      data={dashboardData}
      role={role}
      userName={(session.user as any).name ?? null}
    />
  )
}
