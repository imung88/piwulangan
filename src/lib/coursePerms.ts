import { db } from "@/lib/db";

// Admins, the owning instructor, and co-instructors can manage a course.
export async function canManageCourse(
  userId: string,
  role: string,
  course: { id: string; instructorId: string }
): Promise<boolean> {
  if (role === "ADMIN") return true;
  if (course.instructorId === userId) return true;
  if (role !== "INSTRUCTOR") return false;
  const co = await db.courseInstructor.findUnique({
    where: { courseId_userId: { courseId: course.id, userId } },
  });
  return !!co;
}

// Only admins and the owning instructor (not co-instructors).
export function isCourseOwner(
  userId: string,
  role: string,
  course: { instructorId: string }
): boolean {
  return role === "ADMIN" || course.instructorId === userId;
}
