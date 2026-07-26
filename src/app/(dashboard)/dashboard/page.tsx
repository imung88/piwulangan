import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  // Fetch data based on role
  let dashboardData: any = {};

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
    });

    const progress = await db.progress.findMany({
      where: { userId, completed: true },
    });

    const bookings = await db.classSession.findMany({
      where: {
        attendees: { some: { studentId: userId } },
        status: "SCHEDULED",
        date: { gte: new Date() },
      },
      include: { course: true },
      orderBy: { date: "asc" },
      take: 5,
    });

    // Fetch announcements from enrolled courses
    const enrolledCourseIds = enrollments.map((e: any) => e.courseId);
    const announcements = await db.announcement.findMany({
      where: { courseId: { in: enrolledCourseIds } },
      include: { author: true, course: true },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 5,
    });

    dashboardData = { enrollments, progress, bookings, announcements };
  } else if (role === "INSTRUCTOR") {
    const courses = await db.course.findMany({
      where: { instructorId: userId },
      include: {
        enrollments: { include: { user: true } },
        modules: { include: { lessons: true } },
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayBookings = await db.classSession.findMany({
      where: {
        instructorId: userId,
        date: { gte: today, lt: tomorrow },
        status: "SCHEDULED",
      },
      include: { attendees: { include: { student: true } }, course: true },
      orderBy: { startTime: "asc" },
    });

    // Quick stats: sessions this week
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekBookingsCount = await db.classSession.count({
      where: {
        instructorId: userId,
        date: { gte: weekStart, lt: weekEnd },
        status: "SCHEDULED",
      },
    });

    // Quick stats: students at 80%+ progress
    const courseIds = courses.map((c: any) => c.id);
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
    });

    const allProgress = await db.progress.findMany({
      where: {
        userId: { in: allEnrollments.map((e: any) => e.userId) },
        completed: true,
      },
    });

    let highProgressCount = 0;
    const seen = new Set<string>();
    for (const enrollment of allEnrollments) {
      if (seen.has(enrollment.userId)) continue;
      seen.add(enrollment.userId);
      const totalLessons = enrollment.course.modules.reduce(
        (sum: number, mod: any) => sum + mod.lessons.length,
        0
      );
      if (totalLessons === 0) continue;
      const completed = allProgress.filter(
        (p) =>
          p.userId === enrollment.userId &&
          enrollment.course.modules.some((mod: any) =>
            mod.lessons.some((l: any) => l.id === p.lessonId)
          )
      ).length;
      if (completed / totalLessons >= 0.8) {
        highProgressCount++;
      }
    }

    dashboardData = {
      courses,
      todayBookings,
      weekBookingsCount,
      highProgressCount,
    };
  } else if (role === "GUARDIAN") {
    const links = await db.guardianStudent.findMany({
      where: { guardianId: userId },
      include: {
        student: {
          include: {
            enrollments: {
              include: { course: true },
            },
            progress: { where: { completed: true } },
          },
        },
      },
    });

    // Fetch announcements from linked students' courses
    const allLinkedCourseIds = links.flatMap((link: any) =>
      link.student.enrollments.map((e: any) => e.courseId)
    );
    const linkedCourseIds = Array.from(new Set(allLinkedCourseIds));
    const announcements = linkedCourseIds.length > 0
      ? await db.announcement.findMany({
          where: { courseId: { in: linkedCourseIds } },
          include: { author: true, course: true },
          orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
          take: 5,
        })
      : [];

    dashboardData = { links, announcements };
  } else if (role === "ADMIN") {
    // Overview stats
    const userCounts = await db.user.groupBy({
      by: ["role"],
      _count: true,
    });
    const totalUsers = userCounts.reduce(
      (sum: number, g: any) => sum + g._count,
      0
    );

    const totalCourses = await db.course.count();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const sessionsToday = await db.classSession.count({
      where: {
        date: { gte: todayStart, lt: todayEnd },
        status: "SCHEDULED",
      },
    });

    dashboardData = { totalUsers, totalCourses, sessionsToday, userCounts };
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">
        Welcome, {session.user.name} 👋
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Role: {role.toLowerCase()}
      </p>

      <div className="mt-8">
        {role === "STUDENT" && <StudentDashboard data={dashboardData} />}
        {role === "INSTRUCTOR" && <InstructorDashboard data={dashboardData} />}
        {role === "GUARDIAN" && <GuardianDashboard data={dashboardData} />}
        {role === "ADMIN" && <AdminDashboard data={dashboardData} />}
      </div>
    </div>
  );
}

function StudentDashboard({ data }: { data: any }) {
  const { enrollments, progress, bookings, announcements } = data;

  return (
    <div className="space-y-8">
      {/* Upcoming Sessions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">📅 Upcoming Sessions</h2>
          <a href="/schedule" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View All
          </a>
        </div>
        {bookings.length === 0 ? (
          <p className="text-sm text-gray-500">No upcoming sessions</p>
        ) : (
          <div className="space-y-2">
            {bookings.map((booking: any) => (
              <div
                key={booking.id}
                className="flex items-center justify-between rounded-lg border bg-white p-4"
              >
                <div>
                  <p className="font-medium">{booking.title}</p>
                  <p className="text-sm text-gray-500">
                    {booking.course.title} · {new Date(booking.date).toLocaleDateString()} at {booking.startTime}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* My Courses */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📚 My Courses</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {enrollments.map((enrollment: any) => {
            const course = enrollment.course;
            const totalLessons = course.modules.reduce(
              (sum: number, mod: any) => sum + mod.lessons.length,
              0
            );
            const completedLessons = progress.filter((p: any) =>
              course.modules.some((mod: any) =>
                mod.lessons.some((lesson: any) => lesson.id === p.lessonId)
              )
            ).length;
            const percentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

            return (
              <div
                key={enrollment.id}
                className="rounded-lg border bg-white p-4"
              >
                <h3 className="font-medium">{course.title}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {course.instructorId ? "Teacher" : ""}
                </p>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{completedLessons}/{totalLessons} lessons</span>
                    <span className="font-medium">{percentage}%</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-gray-200">
                    <div
                      className="h-2 rounded-full bg-blue-600"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent Announcements */}
      {announcements.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📢 Recent Announcements</h2>
          <div className="space-y-2">
            {announcements.map((a: any) => (
              <a
                key={a.id}
                href={`/courses/${a.courseId}`}
                className={`block rounded-lg border bg-white p-4 hover:shadow-sm transition-shadow ${
                  a.pinned ? "border-blue-200 bg-blue-50" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  {a.pinned && <span className="text-xs text-blue-600">📌</span>}
                  <h3 className="text-sm font-medium">{a.title}</h3>
                </div>
                <p className="mt-1 text-sm text-gray-600 line-clamp-2">{a.body}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {a.course.title} · {a.author.name} · {new Date(a.createdAt).toLocaleDateString()}
                </p>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function InstructorDashboard({ data }: { data: any }) {
  const { courses, todayBookings, weekBookingsCount, highProgressCount } = data;

  return (
    <div className="space-y-8">
      {/* Today's Sessions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">📅 Today&apos;s Sessions</h2>
          <a href="/schedule" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View Full Schedule
          </a>
        </div>
        {todayBookings.length === 0 ? (
          <p className="text-sm text-gray-500">No sessions today</p>
        ) : (
          <div className="space-y-2">
            {todayBookings.map((booking: any) => (
              <div
                key={booking.id}
                className="flex items-center justify-between rounded-lg border bg-white p-4"
              >
                <div>
                  <p className="font-medium">
                    {booking.startTime} — {booking.title}
                  </p>
                  <p className="text-sm text-gray-500">
                    {booking.course.title} · {booking.attendees.map((a: any) => a.student.name).join(", ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick Stats */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Quick Stats</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-500">Sessions This Week</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{weekBookingsCount}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-500">Students at 80%+</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{highProgressCount}</p>
          </div>
        </div>
      </section>

      {/* My Courses */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📚 My Courses</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {courses.map((course: any) => (
            <div
              key={course.id}
              className="rounded-lg border bg-white p-4"
            >
              <h3 className="font-medium">{course.title}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {course.enrollments.length} students · {course.modules.length} modules
              </p>
              <p className="text-xs text-gray-400 mt-2">
                {course.visibility === "PUBLISHED" ? "🟢 Published" : "📝 Draft"}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function GuardianDashboard({ data }: { data: any }) {
  const { links, announcements } = data;

  return (
    <div className="space-y-8">
      {links.map((link: any) => {
        const student = link.student;
        return (
          <section key={link.id}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {student.name}&apos;s Progress
              </h2>
              <a href="/schedule" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                View Schedule
              </a>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {student.enrollments.map((enrollment: any) => {
                const course = enrollment.course;
                const totalLessons = course.modules?.reduce(
                  (sum: number, mod: any) => sum + (mod.lessons?.length || 0),
                  0
                ) || 0;
                const completed = student.progress.filter((p: any) =>
                  course.modules?.some((mod: any) =>
                    mod.lessons?.some((l: any) => l.id === p.lessonId)
                  )
                ).length || 0;
                const pct = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;

                return (
                  <div
                    key={enrollment.id}
                    className="rounded-lg border bg-white p-4"
                  >
                    <h3 className="font-medium">{course.title}</h3>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{completed}/{totalLessons} lessons</span>
                        <span className="font-medium">{pct}%</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-blue-600"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              {student.enrollments.length === 0 && (
                <p className="text-sm text-gray-500">Not enrolled in any courses</p>
              )}
            </div>
          </section>
        );
      })}
      {links.length === 0 && (
        <p className="text-sm text-gray-500">No linked students. Ask an admin to link you.</p>
      )}

      {/* Recent Announcements */}
      {announcements.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📢 Recent Announcements</h2>
          <div className="space-y-2">
            {announcements.map((a: any) => (
              <a
                key={a.id}
                href={`/courses/${a.courseId}`}
                className={`block rounded-lg border bg-white p-4 hover:shadow-sm transition-shadow ${
                  a.pinned ? "border-blue-200 bg-blue-50" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  {a.pinned && <span className="text-xs text-blue-600">📌</span>}
                  <h3 className="text-sm font-medium">{a.title}</h3>
                </div>
                <p className="mt-1 text-sm text-gray-600 line-clamp-2">{a.body}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {a.course.title} · {a.author.name} · {new Date(a.createdAt).toLocaleDateString()}
                </p>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function AdminDashboard({ data }: { data: any }) {
  const { totalUsers, totalCourses, sessionsToday, userCounts } = data;

  const roleBreakdown = userCounts.map((g: any) => ({
    role: g.role.toLowerCase(),
    count: g._count,
  }));

  return (
    <div className="space-y-8">
      {/* Overview Stats */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Overview</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-500">Total Users</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalUsers}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {roleBreakdown.map((r: any) => (
                <span key={r.role} className="text-xs text-gray-500">
                  {r.count} {r.role}{r.count !== 1 ? "s" : ""}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-500">Courses</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalCourses}</p>
          </div>
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-gray-500">Sessions Today</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{sessionsToday}</p>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">⚙️ Quick Links</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <a
            href="/courses"
            className="rounded-lg border bg-white p-6 hover:shadow-md transition-shadow"
          >
            <span className="text-2xl">📖</span>
            <h3 className="mt-2 font-medium">Manage Courses</h3>
            <p className="text-sm text-gray-500 mt-1">View and manage all courses</p>
          </a>
          <a
            href="/schedule"
            className="rounded-lg border bg-white p-6 hover:shadow-md transition-shadow"
          >
            <span className="text-2xl">🗓️</span>
            <h3 className="mt-2 font-medium">Schedule</h3>
            <p className="text-sm text-gray-500 mt-1">View all sessions</p>
          </a>
          <a
            href="/announcements"
            className="rounded-lg border bg-white p-6 hover:shadow-md transition-shadow"
          >
            <span className="text-2xl">📢</span>
            <h3 className="mt-2 font-medium">Announcements</h3>
            <p className="text-sm text-gray-500 mt-1">View all announcements</p>
          </a>
          <a
            href="/admin/users"
            className="rounded-lg border bg-white p-6 hover:shadow-md transition-shadow"
          >
            <span className="text-2xl">👥</span>
            <h3 className="mt-2 font-medium">Manage Users</h3>
            <p className="text-sm text-gray-500 mt-1">Create, edit, and manage users</p>
          </a>
        </div>
      </section>
    </div>
  );
}
