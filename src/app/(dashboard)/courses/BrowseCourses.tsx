"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { enrollOpen, enrollByCode } from "@/actions/courses";

interface BrowseCourse {
  id: string;
  title: string;
  description: string | null;
  enrollmentMode: string;
  instructorName: string;
  moduleCount: number;
}

export default function BrowseCourses({ courses }: { courses: BrowseCourse[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [codeFor, setCodeFor] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (courses.length === 0) return null;

  async function handleEnrollOpen(courseId: string) {
    setBusyId(courseId);
    setError(null);
    const res = await enrollOpen(courseId);
    setBusyId(null);
    if (res?.error) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  async function handleEnrollCode(courseId: string) {
    if (!code.trim()) return;
    setBusyId(courseId);
    setError(null);
    const res = await enrollByCode(code.trim());
    setBusyId(null);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setCodeFor(null);
    setCode("");
    router.refresh();
  }

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        🔍 Browse Courses
      </h2>
      {error && (
        <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <div key={course.id} className="rounded-lg border bg-white p-4 flex flex-col">
            <h3 className="font-medium text-gray-900">{course.title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              👤 {course.instructorName} · {course.moduleCount} module
              {course.moduleCount !== 1 ? "s" : ""}
            </p>
            {course.description && (
              <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                {course.description}
              </p>
            )}
            <div className="mt-auto pt-3">
              {course.enrollmentMode === "OPEN" && (
                <button
                  onClick={() => handleEnrollOpen(course.id)}
                  disabled={busyId === course.id}
                  className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Enroll
                </button>
              )}
              {course.enrollmentMode === "INVITE_CODE" &&
                (codeFor === course.id ? (
                  <div className="flex gap-2">
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Invite code"
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => handleEnrollCode(course.id)}
                      disabled={busyId === course.id || !code.trim()}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      Join
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setCodeFor(course.id);
                      setCode("");
                    }}
                    className="w-full rounded-md border border-blue-600 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
                  >
                    🔑 Enter Invite Code
                  </button>
                ))}
              {course.enrollmentMode === "MANUAL" && (
                <p className="text-center text-xs text-gray-400 py-2">
                  Enrollment by instructor
                </p>
              )}
              <Link
                href={`/courses/${course.id}`}
                className="mt-2 block text-center text-xs text-gray-500 hover:text-gray-700"
              >
                View details
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
