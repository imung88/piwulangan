import { PrismaClient, Role, Visibility, EnrollmentMode } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data
  await prisma.attendance.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.blockedDate.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.progress.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.module.deleteMany();
  await prisma.course.deleteMany();
  await prisma.guardianStudent.deleteMany();
  await prisma.user.deleteMany();

  const password = await hash("password123", 12);

  // ─── Users ───

  const admin = await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@example.com",
      passwordHash: password,
      role: Role.ADMIN,
    },
  });

  const teacherA = await prisma.user.create({
    data: {
      name: "Teacher A",
      email: "teacher@example.com",
      passwordHash: password,
      role: Role.INSTRUCTOR,
    },
  });

  const teacherB = await prisma.user.create({
    data: {
      name: "Teacher B",
      email: "teacherb@example.com",
      passwordHash: password,
      role: Role.INSTRUCTOR,
    },
  });

  const studentAlice = await prisma.user.create({
    data: {
      name: "Alice",
      email: "alice@example.com",
      passwordHash: password,
      role: Role.STUDENT,
    },
  });

  const studentBob = await prisma.user.create({
    data: {
      name: "Bob",
      email: "bob@example.com",
      passwordHash: password,
      role: Role.STUDENT,
    },
  });

  const guardian = await prisma.user.create({
    data: {
      name: "Alice's Parent",
      email: "guardian@example.com",
      passwordHash: password,
      role: Role.GUARDIAN,
    },
  });

  // Link guardian to Alice
  await prisma.guardianStudent.create({
    data: {
      guardianId: guardian.id,
      studentId: studentAlice.id,
    },
  });

  // ─── Course 1: English Basics (Teacher A) ───

  const englishCourse = await prisma.course.create({
    data: {
      title: "English Basics",
      description: "A beginner's course covering fundamental English grammar and vocabulary.",
      visibility: Visibility.PUBLISHED,
      enrollmentMode: EnrollmentMode.INVITE_CODE,
      inviteCode: "ENG001",
      instructorId: teacherA.id,
      enabledModules: ["announcements", "assignments"],
      studentBookingEnabled: true,
    },
  });

  // Module 1: Greetings
  const mod1 = await prisma.module.create({
    data: { title: "Greetings & Introductions", order: 1, courseId: englishCourse.id },
  });

  await prisma.lesson.create({
    data: {
      title: "Hello, World!",
      content: "# Hello, World!\n\nIn this lesson, we'll learn basic greetings:\n\n- **Hello** — formal and informal\n- **Hi** — casual\n- **Good morning** — before noon\n- **Good evening** — after 6 PM\n\n## Practice\n\nTry greeting your partner using each of these expressions.",
      order: 1,
      duration: 15,
      moduleId: mod1.id,
      resources: {
        create: [
          {
            title: "Greetings Worksheet",
            url: "https://docs.google.com/document/d/example",
            type: "DOCUMENT",
          },
        ],
      },
    },
  });

  await prisma.lesson.create({
    data: {
      title: "Introducing Yourself",
      content: "# Introducing Yourself\n\nKey phrases:\n\n- **My name is...**\n- **I am from...**\n- **I am a student/teacher**\n\n## Dialogue\n\n> A: Hi, my name is Alice. What's your name?\n> B: I'm Bob. Nice to meet you!\n> A: Nice to meet you too!",
      order: 2,
      duration: 20,
      moduleId: mod1.id,
    },
  });

  // Module 2: Numbers & Colors
  const mod2 = await prisma.module.create({
    data: { title: "Numbers & Colors", order: 2, courseId: englishCourse.id },
  });

  await prisma.lesson.create({
    data: {
      title: "Counting 1-100",
      content: "# Counting 1-100\n\nLet's practice counting!\n\n1. one\n2. two\n3. three\n...\n10. ten\n\n## Exercise\n\nWrite the numbers 1-20 in English.",
      order: 1,
      duration: 15,
      moduleId: mod2.id,
    },
  });

  await prisma.lesson.create({
    data: {
      title: "Basic Colors",
      content: "# Basic Colors\n\n- 🔴 **Red**\n- 🔵 **Blue**\n- 🟢 **Green**\n- 🟡 **Yellow**\n- ⚫ **Black**\n- ⚪ **White**\n\n## What color is it?\n\nLook around you. Name 5 things and their colors in English.",
      order: 2,
      duration: 10,
      moduleId: mod2.id,
    },
  });

  // Module 3: Daily Routine
  const mod3 = await prisma.module.create({
    data: { title: "Daily Routine", order: 3, courseId: englishCourse.id },
  });

  await prisma.lesson.create({
    data: {
      title: "Morning Routine",
      content: "# Morning Routine\n\nCommon verbs:\n\n- **Wake up** — I wake up at 7 AM.\n- **Brush** — I brush my teeth.\n- **Eat** — I eat breakfast.\n- **Go** — I go to school.\n\n## Assignment\n\nWrite about your morning routine using these verbs.",
      order: 1,
      duration: 20,
      moduleId: mod3.id,
    },
  });

  // ─── Course 2: Piano 101 (Teacher B) ───

  const pianoCourse = await prisma.course.create({
    data: {
      title: "Piano 101",
      description: "Introduction to piano for absolute beginners.",
      visibility: Visibility.PUBLISHED,
      enrollmentMode: EnrollmentMode.OPEN,
      instructorId: teacherB.id,
      enabledModules: [],
      studentBookingEnabled: false,
    },
  });

  const pianoMod = await prisma.module.create({
    data: { title: "Getting Started", order: 1, courseId: pianoCourse.id },
  });

  await prisma.lesson.create({
    data: {
      title: "The Piano Keyboard",
      content: "# The Piano Keyboard\n\nThe piano has 88 keys. Let's start with the basics:\n\n- **White keys**: C D E F G A B\n- **Black keys**: Sharps (#) and flats (b)\n\nFind **Middle C** — it's usually near the middle of the keyboard.",
      order: 1,
      duration: 10,
      moduleId: pianoMod.id,
    },
  });

  await prisma.lesson.create({
    data: {
      title: "Sitting Posture",
      content: "# Sitting Posture\n\nGood posture is essential:\n\n1. Sit at the edge of the bench\n2. Feet flat on the floor\n3. Back straight but relaxed\n4. Arms parallel to the floor\n5. Wrists level with the keyboard",
      order: 2,
      duration: 10,
      moduleId: pianoMod.id,
    },
  });

  // ─── Enrollments ───

  await prisma.enrollment.create({
    data: { userId: studentAlice.id, courseId: englishCourse.id },
  });
  await prisma.enrollment.create({
    data: { userId: studentAlice.id, courseId: pianoCourse.id },
  });
  await prisma.enrollment.create({
    data: { userId: studentBob.id, courseId: englishCourse.id },
  });

  // ─── Sample Progress ───

  const lessons = await prisma.lesson.findMany({
    where: { module: { courseId: englishCourse.id } },
    orderBy: { order: "asc" },
  });

  // Alice completed first 3 lessons
  for (let i = 0; i < 3; i++) {
    await prisma.progress.create({
      data: {
        userId: studentAlice.id,
        lessonId: lessons[i].id,
        completed: true,
        completedAt: new Date(),
      },
    });
  }

  // Bob completed first lesson
  await prisma.progress.create({
    data: {
      userId: studentBob.id,
      lessonId: lessons[0].id,
      completed: true,
      completedAt: new Date(),
    },
  });

  // ─── Instructor Availability (Teacher A) ───

  const weekDays = [1, 2, 3, 4, 5]; // Mon-Fri
  for (const day of weekDays) {
    await prisma.availability.create({
      data: {
        userId: teacherA.id,
        dayOfWeek: day,
        startTime: "09:00",
        endTime: "12:00",
        courseId: englishCourse.id,
      },
    });
    await prisma.availability.create({
      data: {
        userId: teacherA.id,
        dayOfWeek: day,
        startTime: "14:00",
        endTime: "17:00",
        courseId: englishCourse.id,
      },
    });
  }

  // ─── Sample Announcement ───

  await prisma.announcement.create({
    data: {
      courseId: englishCourse.id,
      authorId: teacherA.id,
      title: "Welcome to English Basics!",
      body: "Welcome everyone! Please review the first module before our next session.",
      pinned: true,
    },
  });

  console.log("✅ Seed complete!");
  console.log("");
  console.log("Test accounts (all passwords: password123):");
  console.log("  Admin:    admin@example.com");
  console.log("  Teacher:  teacher@example.com");
  console.log("  Student:  alice@example.com");
  console.log("  Student:  bob@example.com");
  console.log("  Guardian: guardian@example.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
