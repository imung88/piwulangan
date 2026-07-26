"use client";

import { useState, useEffect } from "react";
import { bookSlotAsStudent } from "@/actions/schedule";
import { useRouter } from "next/navigation";

interface Course {
  id: string;
  title: string;
  instructorId: string;
  slotDuration: number;
  bufferTime: number;
  maxAdvanceDays: number;
  instructor: { id: string; name: string };
}

interface ExistingBooking {
  date: Date;
  startTime: string;
  courseId: string;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
}

interface Props {
  courses: Course[];
  existingBookings: ExistingBooking[];
}

export default function BookingClient({ courses, existingBookings }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const selectedCourseData = courses.find((c) => c.id === selectedCourse);

  // Fetch available slots when course and date are selected
  useEffect(() => {
    if (!selectedCourse || !selectedDate) {
      setAvailableSlots([]);
      return;
    }

    setLoadingSlots(true);
    fetch(
      `/api/schedule/slots?courseId=${selectedCourse}&date=${selectedDate}`
    )
      .then((res) => res.json())
      .then((data) => {
        setAvailableSlots(data.slots || []);
        setLoadingSlots(false);
      })
      .catch(() => {
        setAvailableSlots([]);
        setLoadingSlots(false);
      });
  }, [selectedCourse, selectedDate]);

  // Get min/max dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + (selectedCourseData?.maxAdvanceDays || 30));

  function formatDateForInput(date: Date) {
    return date.toISOString().split("T")[0];
  }

  function isSlotBooked(date: string, startTime: string) {
    return existingBookings.some(
      (b) =>
        new Date(b.date).toISOString().split("T")[0] === date &&
        b.startTime === startTime &&
        b.courseId === selectedCourse
    );
  }

  async function handleBook(slot: TimeSlot) {
    if (!selectedCourse || !selectedDate) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    const result = await bookSlotAsStudent(selectedCourse, selectedDate, slot.startTime);

    if (result?.error) {
      setError(typeof result.error === "string" ? result.error : "Failed to book");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm">
          Session booked successfully!
        </div>
      )}

      {/* Course Selection */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">1. Select Course</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {courses.map((course) => (
            <button
              key={course.id}
              onClick={() => {
                setSelectedCourse(course.id);
                setSelectedDate("");
                setAvailableSlots([]);
                setSuccess(false);
              }}
              className={`text-left p-4 rounded-lg border-2 transition-colors ${
                selectedCourse === course.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="font-medium text-gray-900">{course.title}</div>
              <div className="text-sm text-gray-500">
                Instructor: {course.instructor.name}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {course.slotDuration} min sessions · Up to {course.maxAdvanceDays} days ahead
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Date Selection */}
      {selectedCourse && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">2. Pick a Date</h2>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setAvailableSlots([]);
              setSuccess(false);
            }}
            min={formatDateForInput(today)}
            max={formatDateForInput(maxDate)}
            className="border rounded-lg px-3 py-2 text-sm"
          />
        </div>
      )}

      {/* Slot Selection */}
      {selectedCourse && selectedDate && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">3. Choose Time Slot</h2>

          {loadingSlots ? (
            <p className="text-gray-500">Loading available slots...</p>
          ) : availableSlots.length === 0 ? (
            <p className="text-gray-500">
              No available slots for this date. Try a different date or check with your instructor.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {availableSlots.map((slot) => {
                const booked = isSlotBooked(selectedDate, slot.startTime);
                return (
                  <button
                    key={slot.startTime}
                    onClick={() => handleBook(slot)}
                    disabled={loading || booked}
                    className={`p-3 rounded-lg border text-center transition-colors ${
                      booked
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "border-blue-200 hover:border-blue-500 hover:bg-blue-50"
                    }`}
                  >
                    <div className="font-medium text-gray-900">
                      {slot.startTime} - {slot.endTime}
                    </div>
                    {booked && (
                      <div className="text-xs text-gray-500 mt-1">Already booked</div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
