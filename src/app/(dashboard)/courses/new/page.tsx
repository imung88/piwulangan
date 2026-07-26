"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createCourse } from "@/actions/courses";

export default function NewCoursePage() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await createCourse(formData);

    if (result?.error) {
      setErrors(result.error as Record<string, string[]>);
      setLoading(false);
    } else if (result?.success) {
      router.push(`/courses/${result.courseId}/manage/content`);
    }
  }

  return (
    <div className="max-w-lg">
      <Link href="/courses" className="text-sm text-metro-text-secondary hover:text-metro-text">
        ← Back to courses
      </Link>
      <h1 className="metro-page-title mt-2">Create New Course</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-metro-text">
            Course Title
          </label>
          <input
            id="title"
            name="title"
            required
            maxLength={120}
            placeholder="e.g., English Basics"
            className="metro-input mt-1 block w-full px-3 py-2"
          />
          {errors.title && <p className="mt-1 text-sm text-metro-error">{errors.title[0]}</p>}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-metro-text">
            Description (optional)
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            maxLength={2000}
            placeholder="What will students learn?"
            className="metro-input mt-1 block w-full px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="coverImageUrl" className="block text-sm font-medium text-metro-text">
            Cover Image URL (optional)
          </label>
          <input
            id="coverImageUrl"
            name="coverImageUrl"
            type="url"
            placeholder="https://..."
            className="metro-input mt-1 block w-full px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="enrollmentMode" className="block text-sm font-medium text-metro-text">
            Enrollment Mode
          </label>
          <select
            id="enrollmentMode"
            name="enrollmentMode"
            defaultValue="INVITE_CODE"
            className="metro-input mt-1 block w-full px-3 py-2"
          >
            <option value="OPEN">Open — anyone with the link</option>
            <option value="INVITE_CODE">Invite Code — students enter a code</option>
            <option value="MANUAL">Manual — you add students</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="metro-btn disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Course"}
        </button>
      </form>
    </div>
  );
}
