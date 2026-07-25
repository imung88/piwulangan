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

    const bookings = await db.booking.findMany({
      where: {
        studentId: userId,
        status: "CONFIRMED",
        date: { gte: new Date() },
      },
      include: { course: true },
      orderBy: { date: "asc" },
      take: 5,
    });

    dashboardData = { enrollments, progress, bookings };
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

    const todayBookings = await db.booking.findMany({
      where: {
        instructorId: userId,
        date: { gte: today, lt: tomorrow },
        status: "CONFIRMED",
      },
      include: { student: true, course: true },
      orderBy: { startTime: "asc" },
    });

    dashboardData = { courses, todayBookings };
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

    dashboardData = { links };
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
        {role === "ADMIN" && <AdminDashboard />}
      </div>
    </div>
  );
}

function StudentDashboard({ data }: { data: any }) {
  const { enrollments, progress, bookings } = data;

  return (
    <div className="space-y-8">
      {/* Upcoming Sessions */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📅 Upcoming Sessions</h2>
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
                  <p className="font-medium">{booking.course.title}</p>
                  <p className="text-sm text-gray-500">
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
    </div>
  );
}

function InstructorDashboard({ data }: { data: any }) {
  const { courses, todayBookings } = data;

  return (
    <div className="space-y-8">
      {/* Today's Sessions */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📅 Today&apos;s Sessions</h2>
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
                    {booking.startTime} — {booking.student.name}
                  </p>
                  <p className="text-sm text-gray-500">{booking.course.title}</p>
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
  const { links } = data;

  return (
    <div className="space-y-8">
      {links.map((link: any) => {
        const student = link.student;
        return (
          <section key={link.id}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {student.name}&apos;s Progress
            </h2>
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
    </div>
  );
}

function AdminDashboard() {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">⚙️ Admin Panel</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/admin/users"
            className="rounded-lg border bg-white p-6 hover:shadow-md transition-shadow"
          >
            <span className="text-2xl">👥</span>
            <h3 className="mt-2 font-medium">Manage Users</h3>
            <p className="text-sm text-gray-500 mt-1">Add, edit, and link users</p>
          </Link>
          <Link
            href="/admin/courses"
            className="rounded-lg border bg-white p-6 hover:shadow-md transition-shadow"
          >
            <span className="text-2xl">📖</span>
            <h3 className="mt-2 font-medium">Manage Courses</h3>
            <p className="text-sm text-gray-500 mt-1">View and manage all courses</p>
          </Link>
          <Link
            href="/admin/schedule"
            className="rounded-lg border bg-white p-6 hover:shadow-md transition-shadow"
          >
            <span className="text-2xl">🗓️</span>
            <h3 className="mt-2 font-medium">Schedule</h3>
            <p className="text-sm text-gray-500 mt-1">View all sessions</p>
          </Link>
          <Link
            href="/admin/settings"
            className="rounded-lg border bg-white p-6 hover:shadow-md transition-shadow"
          >
            <span className="text-2xl">⚙️</span>
            <h3 className="mt-2 font-medium">Settings</h3>
            <p className="text-sm text-gray-500 mt-1">Global configuration</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
