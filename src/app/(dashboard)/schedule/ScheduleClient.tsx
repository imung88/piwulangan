"use client";

import { useState } from "react";
import { cancelBooking } from "@/actions/schedule";
import { useRouter } from "next/navigation";

interface Booking {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: string;
  course: { id: string; title: string };
  student?: { id: string; name: string };
  instructor?: { id: string; name: string };
  attendance?: { present: boolean } | null;
}

interface Props {
  bookings: Booking[];
  role: string;
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-green-100 text-green-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  NO_SHOW: "bg-red-100 text-red-700",
};

export default function ScheduleClient({ bookings, role }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const filtered = bookings.filter((b) => {
    const date = new Date(b.date);
    date.setHours(0, 0, 0, 0);
    if (filter === "upcoming") return date >= now;
    if (filter === "past") return date < now;
    return true;
  });

  async function handleCancel(bookingId: string) {
    if (!confirm("Cancel this booking?")) return;
    setLoading(true);
    await cancelBooking(bookingId, "Cancelled by user");
    setLoading(false);
    router.refresh();
  }

  function formatDate(date: Date) {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  function isToday(date: Date) {
    const d = new Date(date);
    const t = new Date();
    return (
      d.getFullYear() === t.getFullYear() &&
      d.getMonth() === t.getMonth() &&
      d.getDate() === t.getDate()
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <p className="text-gray-500">No sessions scheduled yet.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
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

      {/* Bookings list */}
      <div className="space-y-3">
        {filtered.map((booking) => (
          <div
            key={booking.id}
            className={`bg-white rounded-lg border p-4 ${
              isToday(booking.date) ? "ring-2 ring-blue-500" : ""
            }`}
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
                  {isToday(booking.date) && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      Today
                    </span>
                  )}
                </div>

                <div className="text-sm text-gray-600">
                  <span>{formatDate(booking.date)}</span>
                  <span className="mx-2">·</span>
                  <span>
                    {booking.startTime} - {booking.endTime}
                  </span>
                </div>

                {booking.instructor && role !== "INSTRUCTOR" && (
                  <div className="text-sm text-gray-500 mt-1">
                    Instructor: {booking.instructor.name}
                  </div>
                )}

                {booking.student && role === "INSTRUCTOR" && (
                  <div className="text-sm text-gray-500 mt-1">
                    Student: {booking.student.name}
                  </div>
                )}

                {booking.attendance && (
                  <div className="text-sm mt-1">
                    <span className={booking.attendance.present ? "text-green-600" : "text-red-600"}>
                      {booking.attendance.present ? "Present" : "No Show"}
                    </span>
                  </div>
                )}
              </div>

              {booking.status === "CONFIRMED" && (
                <button
                  onClick={() => handleCancel(booking.id)}
                  disabled={loading}
                  className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
