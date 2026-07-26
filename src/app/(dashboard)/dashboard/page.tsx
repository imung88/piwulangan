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
      <h1 className="metro-page-title">
        Welcome, {session.user.name}
      </h1>
      <span className="metro-badge mt-2 bg-metro-blue text-white">
        {role.toLowerCase()}
      </span>

      <div className="mt-6">
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
    <div className="space-y-6">
      {/* Upcoming Sessions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="metro-section-title">upcoming sessions</h2>
          <a href="/schedule" className="text-sm text-metro-blue hover:text-metro-blue-hover font-medium">
            View All
          </a>
        </div>
        {bookings.length === 0 ? (
          <p className="text-sm text-metro-text-secondary">No upcoming sessions</p>
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
        <h2 className="metro-section-title mb-4">my courses</h2>
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
                className="metro-card"
                style={{ borderLeftColor: "var(--metro-green)" }}
              >
                <h3 className="text-base font-medium text-metro-text">{course.title}</h3>
                <p className="text-sm text-metro-text-secondary mt-1 leading-relaxed">
                  {course.instructorId ? "Teacher" : ""}
                </p>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-metro-text-secondary">{completedLessons}/{totalLessons} lessons</span>
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
            );
          })}
        </div>
      </section>

      {/* Recent Announcements */}
      {announcements.length > 0 && (
        <section>
          <h2 className="metro-section-title mb-4">recent announcements</h2>
          <div className="space-y-2">
            {announcements.map((a: any) => (
              <a
                key={a.id}
                href={`/courses/${a.courseId}`}
                className={`metro-card ${a.pinned ? "metro-card-accent bg-metro-blue-light" : ""}`}
              >
                <div className="flex items-center gap-2">
                  {a.pinned && <span className="metro-badge bg-metro-blue text-white">Pinned</span>}
                  <h3 className="text-sm font-medium text-metro-text">{a.title}</h3>
                </div>
                <p className="mt-1 text-sm text-metro-text-secondary line-clamp-2 leading-relaxed">{a.body}</p>
                <p className="mt-1 text-sm text-metro-text-secondary">
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
    <div className="space-y-6">
      {/* Quick Stats */}
      <section>
        <h2 className="metro-section-title mb-4">quick stats</h2>
        <div className="grid gap-2 grid-cols-2 sm:max-w-md">
          <a href="/schedule" className="metro-tile metro-tile-blue">
            <span className="metro-tile-value">{weekBookingsCount}</span>
            <span className="metro-tile-label">Sessions This Week</span>
          </a>
          <a href="/courses" className="metro-tile metro-tile-green">
            <span className="metro-tile-value">{highProgressCount}</span>
            <span className="metro-tile-label">Students at 80%+</span>
          </a>
        </div>
      </section>

      {/* Today's Sessions */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="metro-section-title">today&apos;s sessions</h2>
          <a href="/schedule" className="text-sm text-metro-blue hover:text-metro-blue-hover font-medium">
            View Full Schedule
          </a>
        </div>
        {todayBookings.length === 0 ? (
          <p className="text-sm text-metro-text-secondary">No sessions today</p>
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
                    {booking.course.title} · {booking.attendees.map((a: any) => a.student.name).join(", ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* My Courses */}
      <section>
        <h2 className="metro-section-title mb-4">my courses</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {courses.map((course: any) => (
            <div
              key={course.id}
              className="metro-card"
              style={{ borderLeftColor: course.visibility === "PUBLISHED" ? "var(--metro-green)" : "var(--metro-border)" }}
            >
              <h3 className="text-base font-medium text-metro-text">{course.title}</h3>
              <p className="text-sm text-metro-text-secondary mt-1 leading-relaxed">
                {course.enrollments.length} students · {course.modules.length} modules
              </p>
              <span className={`metro-badge mt-2 ${
                course.visibility === "PUBLISHED"
                  ? "bg-metro-green-light text-metro-green"
                  : "bg-metro-border text-metro-text-secondary"
              }`}>
                {course.visibility === "PUBLISHED" ? "Published" : "Draft"}
              </span>
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
    <div className="space-y-6">
      {links.map((link: any) => {
        const student = link.student;
        return (
          <section key={link.id}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="metro-section-title">
                {student.name}&apos;s progress
              </h2>
              <a href="/schedule" className="text-sm text-metro-blue hover:text-metro-blue-hover font-medium">
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
                    className="metro-card"
                    style={{ borderLeftColor: "var(--metro-green)" }}
                  >
                    <h3 className="text-base font-medium text-metro-text">{course.title}</h3>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-metro-text-secondary">{completed}/{totalLessons} lessons</span>
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
                );
              })}
              {student.enrollments.length === 0 && (
                <p className="text-sm text-metro-text-secondary">Not enrolled in any courses</p>
              )}
            </div>
          </section>
        );
      })}
      {links.length === 0 && (
        <p className="text-sm text-metro-text-secondary">No linked students. Ask an admin to link you.</p>
      )}

      {/* Recent Announcements */}
      {announcements.length > 0 && (
        <section>
          <h2 className="metro-section-title mb-4">recent announcements</h2>
          <div className="space-y-2">
            {announcements.map((a: any) => (
              <a
                key={a.id}
                href={`/courses/${a.courseId}`}
                className={`metro-card ${a.pinned ? "metro-card-accent bg-metro-blue-light" : ""}`}
              >
                <div className="flex items-center gap-2">
                  {a.pinned && <span className="metro-badge bg-metro-blue text-white">Pinned</span>}
                  <h3 className="text-sm font-medium text-metro-text">{a.title}</h3>
                </div>
                <p className="mt-1 text-sm text-metro-text-secondary line-clamp-2 leading-relaxed">{a.body}</p>
                <p className="mt-1 text-sm text-metro-text-secondary">
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
    <div className="space-y-6">
      {/* Overview Stats */}
      <section>
        <h2 className="metro-section-title mb-4">overview</h2>
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 max-w-3xl">
          <a href="/admin/users" className="metro-tile metro-tile-blue col-span-2">
            <span className="metro-tile-value">{totalUsers}</span>
            <div>
              <span className="metro-tile-label block">Total Users</span>
              <span className="mt-1 block text-xs text-white/80">
                {roleBreakdown.map((r: any) => `${r.count} ${r.role}${r.count !== 1 ? "s" : ""}`).join(" · ")}
              </span>
            </div>
          </a>
          <a href="/courses" className="metro-tile metro-tile-green">
            <span className="metro-tile-value">{totalCourses}</span>
            <span className="metro-tile-label">Courses</span>
          </a>
          <a href="/schedule" className="metro-tile metro-tile-orange">
            <span className="metro-tile-value">{sessionsToday}</span>
            <span className="metro-tile-label">Sessions Today</span>
          </a>
        </div>
      </section>

      {/* Quick Links */}
      <section>
        <h2 className="metro-section-title mb-4">quick links</h2>
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 max-w-3xl">
          <a href="/courses" className="metro-tile metro-tile-blue">
            <span className="text-3xl">📖</span>
            <span className="metro-tile-label">Manage Courses</span>
          </a>
          <a href="/schedule" className="metro-tile metro-tile-dark">
            <span className="text-3xl">🗓️</span>
            <span className="metro-tile-label">Schedule</span>
          </a>
          <a href="/announcements" className="metro-tile metro-tile-green">
            <span className="text-3xl">📢</span>
            <span className="metro-tile-label">Announcements</span>
          </a>
          <a href="/admin/users" className="metro-tile metro-tile-orange">
            <span className="text-3xl">👥</span>
            <span className="metro-tile-label">Manage Users</span>
          </a>
        </div>
      </section>
    </div>
  );
}
