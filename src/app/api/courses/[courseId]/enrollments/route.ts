import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  const course = await db.course.findUnique({
    where: { id: params.courseId },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  // Only admin or course instructor can view enrollments
  if (role !== "ADMIN" && course.instructorId !== userId) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const enrollments = await db.enrollment.findMany({
    where: { courseId: params.courseId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  const students = enrollments.map((e) => e.user);

  return NextResponse.json({ students });
}
