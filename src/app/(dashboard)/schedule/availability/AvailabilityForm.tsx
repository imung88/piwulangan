"use client";

import { useState } from "react";
import { setAvailability } from "@/actions/schedule";
import { useRouter } from "next/navigation";
import { useT, useDayNames } from "@/lib/i18n/useT";

interface Course {
  id: string;
  title: string;
}

export default function AvailabilityForm({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const t = useT();
  const dayNames = useDayNames();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [courseId, setCourseId] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set("dayOfWeek", dayOfWeek.toString());
    formData.set("startTime", startTime);
    formData.set("endTime", endTime);
    if (courseId) formData.set("courseId", courseId);

    const result = await setAvailability(formData);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setStartTime("09:00");
    setEndTime("10:00");
    setCourseId("");
    router.refresh();
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-metro-error text-white p-3 text-sm">{error}</div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-metro-text mb-1">{t("availability.day")}</label>
          <select
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(Number(e.target.value))}
            className="w-full border-2 border-metro-border bg-metro-surface px-3 py-2 text-sm focus:border-metro-blue focus:outline-none"
          >
            {dayNames.map((label, index) => (
              <option key={index} value={index}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-metro-text mb-1">{t("availability.startTime")}</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full border-2 border-metro-border bg-metro-surface px-3 py-2 text-sm focus:border-metro-blue focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-metro-text mb-1">{t("availability.endTime")}</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full border-2 border-metro-border bg-metro-surface px-3 py-2 text-sm focus:border-metro-blue focus:outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-metro-text mb-1">{t("availability.courseOptional")}</label>
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="w-full border-2 border-metro-border bg-metro-surface px-3 py-2 text-sm focus:border-metro-blue focus:outline-none"
          >
            <option value="">{t("availability.allCourses")}</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="bg-metro-blue text-white px-4 py-2 text-sm font-medium hover:bg-metro-blue-hover disabled:opacity-50"
      >
        {loading ? t("availability.adding") : t("availability.addBtn")}
      </button>
    </form>
  );
}
