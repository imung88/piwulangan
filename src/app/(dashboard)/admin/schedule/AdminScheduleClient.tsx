"use client";

import { useState, useEffect } from "react";
import { createBooking, cancelBooking, markAttendance } from "@/actions/schedule";
import { useRouter } from "next/navigation";

interface Instructor {
  id: string;
  name: string;
  email: string;
}

interface Course {
  id: string;
  title: string;
  instructorId: string;
  slotDuration: number;
  instructor: { id: string; name: string };
}

interface Student {
  id: string;
  name: string;
  email: string;
}

interface Booking {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: string;
  course: { id: string; title: string };
  student: { id: string; name: string; email: string };
  instructor: { id: string; name: string };
  attendance: { present: boolean; notes: string | null } | null;
}

interface Props {
  instructors: Instructor[];
  courses: Course[];
  bookings: Booking[];
  students: Student[];
}

export default function AdminScheduleClient({
  instructors,
  courses,
  bookings,
  students,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");
  const [selectedInstructor, setSelectedInstructor] = useState<string>("");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Filter courses by selected instructor
  const filteredCourses = selectedInstructor
    ? courses.filter((c) => c.instructorId === selectedInstructor)
    : courses;

  // Get enrolled students for selected course
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);

  useEffect(() => {
    if (!selectedCourse) {
      setEnrolledStudents([]);
      return;
    }
    // Fetch enrolled students for this course
    fetch(`/api/courses/${selectedCourse}/enrollments`)
      .then((res) => res.json())
      .then((data) => {
        if (data.students) {
          setEnrolledStudents(data.students);
        }
      })
      .catch(() => {
        // Fallback: show all students
        setEnrolledStudents(students);
      });
  }, [selectedCourse, students]);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const filteredBookings = bookings.filter((b) => {
    const date = new Date(b.date);
    date.setHours(0, 0, 0, 0);
    const matchesDate =
      filter === "upcoming"
        ? date >= now
        : filter === "past"
        ? date < now
        : true;
    const matchesInstructor = !selectedInstructor || b.instructor.id === selectedInstructor;
    return matchesDate && matchesInstructor;
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCourse || !selectedDate || selectedStudents.length === 0) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError(null);

    const course = courses.find((c) => c.id === selectedCourse);
    if (!course) {
      setError("Course not found");
      setLoading(false);
      return;
    }

    // For now, default to 09:00 - slotDuration
    const startHour = 9;
    const endHour = startHour + Math.ceil(course.slotDuration / 60);
    const startTime = `${startHour.toString().padStart(2, "0")}:00`;
    const endTime = `${endHour.toString().padStart(2, "0")}:00`;

    const formData = new FormData();
    formData.set("courseId", selectedCourse);
    formData.set("date", selectedDate);
    formData.set("startTime", startTime);
    formData.set("endTime", endTime);
    formData.set("studentIds", JSON.stringify(selectedStudents));

    const result = await createBooking(formData);

    if (result?.error) {
      setError(typeof result.error === "string" ? result.error : "Failed to create booking");
      setLoading(false);
      return;
    }

    setShowCreateForm(false);
    setSelectedCourse("");
    setSelectedDate("");
    setSelectedStudents([]);
    setLoading(false);
    router.refresh();
  }

  async function handleCancel(bookingId: string) {
    if (!confirm("Cancel this booking?")) return;
    setLoading(true);
    await cancelBooking(bookingId, "Cancelled by admin");
    setLoading(false);
    router.refresh();
  }

  async function handleMarkAttendance(formData: FormData) {
    setLoading(true);
    await markAttendance(formData);
    setLoading(false);
    router.refresh();
  }

  function toggleStudent(studentId: string) {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  }

  function formatDate(date: Date) {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  const STATUS_COLORS: Record<string, string> = {
    CONFIRMED: "bg-green-100 text-green-700",
    COMPLETED: "bg-blue-100 text-blue-700",
    CANCELLED: "bg-gray-100 text-gray-500",
    NO_SHOW: "bg-red-100 text-red-700",
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          {showCreateForm ? "Cancel" : "Create Session"}
        </button>

        <select
          value={selectedInstructor}
          onChange={(e) => setSelectedInstructor(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Instructors</option>
          {instructors.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {(["upcoming", "past", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === f
                  ? "bg-white text-gray-900 shadow"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Session</h2>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">{error}</div>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instructor *
                </label>
                <select
                  value={selectedInstructor}
                  onChange={(e) => {
                    setSelectedInstructor(e.target.value);
                    setSelectedCourse("");
                  }}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select instructor</option>
                  {instructors.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course *
                </label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select course</option>
                  {filteredCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>
            </div>

            {/* Student selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Students * (select at least one)
              </label>
              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
                {(enrolledStudents.length > 0 ? enrolledStudents : students).map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(s.id)}
                      onChange={() => toggleStudent(s.id)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">{s.name}</span>
                    <span className="text-xs text-gray-500">({s.email})</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Session"}
            </button>
          </form>
        </div>
      )}

      {/* Bookings List */}
      <div className="space-y-3">
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-lg border p-8 text-center">
            <p className="text-gray-500">No sessions found.</p>
          </div>
        ) : (
          filteredBookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-white rounded-lg border p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold text-gray-900">
                      {booking.course.title}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[booking.status] || ""}`}>
                      {booking.status}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600">
                    <span>{formatDate(booking.date)}</span>
                    <span className="mx-2">·</span>
                    <span>
                      {booking.startTime} - {booking.endTime}
                    </span>
                    <span className="mx-2">·</span>
                    <span>Instructor: {booking.instructor.name}</span>
                  </div>

                  <div className="text-sm text-gray-500 mt-1">
                    Student: {booking.student.name} ({booking.student.email})
                  </div>

                  {booking.attendance && (
                    <div className="text-sm mt-1">
                      <span className={booking.attendance.present ? "text-green-600" : "text-red-600"}>
                        {booking.attendance.present ? "Present" : "No Show"}
                      </span>
                      {booking.attendance.notes && (
                        <span className="text-gray-500 ml-2">— {booking.attendance.notes}</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {booking.status === "CONFIRMED" && (
                    <>
                      <form action={handleMarkAttendance} className="inline">
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <input type="hidden" name="studentId" value={booking.student.id} />
                        <input type="hidden" name="present" value="true" />
                        <button
                          type="submit"
                          disabled={loading}
                          className="text-green-600 hover:text-green-700 text-sm font-medium disabled:opacity-50"
                        >
                          Present
                        </button>
                      </form>
                      <form action={handleMarkAttendance} className="inline">
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <input type="hidden" name="studentId" value={booking.student.id} />
                        <input type="hidden" name="present" value="false" />
                        <button
                          type="submit"
                          disabled={loading}
                          className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                        >
                          No Show
                        </button>
                      </form>
                      <button
                        onClick={() => handleCancel(booking.id)}
                        disabled={loading}
                        className="text-gray-500 hover:text-red-600 text-sm disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
