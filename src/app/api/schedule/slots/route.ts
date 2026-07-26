import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAvailableSlots } from "@/lib/schedule";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId");
  const dateStr = searchParams.get("date");

  if (!courseId || !dateStr) {
    return NextResponse.json({ error: "Missing courseId or date" }, { status: 400 });
  }

  // Verify course exists and allows student booking
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { instructorId: true, studentBookingEnabled: true },
  });

  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  if (!course.studentBookingEnabled) {
    return NextResponse.json({ error: "Student booking not enabled" }, { status: 403 });
  }

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const slots = await getAvailableSlots(course.instructorId, courseId, date);

  return NextResponse.json({ slots });
}
