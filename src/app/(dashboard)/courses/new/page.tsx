import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import NewCourseForm from "./NewCourseForm"

export default async function NewCoursePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "INSTRUCTOR") redirect("/courses");

  // Admins can create a course on behalf of any instructor
  const instructors =
    role === "ADMIN"
      ? await db.user.findMany({
          where: { role: "INSTRUCTOR", active: true },
          select: { id: true, name: true, email: true },
          orderBy: { name: "asc" },
        })
      : [];

  return <NewCourseForm instructors={instructors} />;
}
