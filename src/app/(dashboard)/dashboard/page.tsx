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
    const enrollments = await db.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            modules: {
              include: { lessons: true },
            },
          },
        },
      },
    })
    const progress = await db.progress.findMany({
      where: { userId, completed: true },
    })
    const bookings = await db.classSession.findMany({
      where: {
        attendees: { some: { studentId: userId } },
        status: "SCHEDULED",
        date: { gte: new Date() },
      },
      include: { course: true },
      orderBy: { date: "asc" },
      take: 5,
    })

    const enrolledCourseIds = enrollments.map((e: any) => e.courseId)
    const announcements = await db.announcement.findMany({
      where: { courseId: { in: enrolledCourseIds } },
      include: { author: true, course: true },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 5,
    })

    dashboardData = { enrollments, progress, bookings, announcements }
  } else if (role === "INSTRUCTOR") {
    const courses = await db.course.findMany({
      where: { instructorId: userId },
      include: {
        enrollments: { include: { user: true } },
        modules: { include: { lessons: true } },
      },
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayBookings = await db.classSession.findMany({
      where: {
        instructorId: userId,
        date: { gte: today, lt: tomorrow },
        status: "SCHEDULED",
      },
      include: { attendees: { include: { student: true } }, course: true },
      orderBy: { startTime: "asc" },
    })

    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    const weekBookingsCount = await db.classSession.count({
      where: {
        instructorId: userId,
        date: { gte: weekStart, lt: weekEnd },
        status: "SCHEDULED",
      },
    })

    const courseIds = courses.map((c: any) => c.id)
    const allEnrollments = await db.enrollment.findMany({
      where: { courseId: { in: courseIds } },
      include: {
        user: true,
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
    }
  } else if (role === "GUARDIAN") {
    const links = await db.guardianStudent.findMany({
      where: { guardianId: userId },
      include: {
        student: {
          include: {
            enrollments: {
              include: { course: true },
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
    const announcements =
      linkedCourseIds.length > 0
        ? await db.announcement.findMany({
            where: { courseId: { in: linkedCourseIds } },
            include: { author: true, course: true },
            orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
            take: 5,
          })
        : []

    dashboardData = { links, announcements }
  } else if (role === "ADMIN") {
    const userCounts = await db.user.groupBy({
      by: ["role"],
      _count: true,
    })
    const totalUsers = userCounts.reduce(
      (sum: number, g: any) => sum + g._count,
      0,
    )
    const totalCourses = await db.course.count()

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(todayStart)
    todayEnd.setDate(todayEnd.getDate() + 1)

    const sessionsToday = await db.classSession.count({
      where: {
        date: { gte: todayStart, lt: todayEnd },
        status: "SCHEDULED",
      },
    })

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
