export interface SessionItem {
  id: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  startTime: string;
  endTime: string;
  status: string;
  location: string | null;
  cancelReason: string | null;
  course: { id: string; title: string };
  instructor: { id: string; name: string } | null;
  lesson: { id: string; title: string } | null;
  attendeeNames: string[];
  myAttendance: string | null;
}

export const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-green-100 text-green-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export const ATTENDANCE_COLORS: Record<string, string> = {
  PRESENT: "text-green-600",
  ABSENT: "text-red-600",
  LATE: "text-yellow-600",
};

const COURSE_PALETTE = [
  "bg-blue-100 text-blue-800 border-blue-300",
  "bg-purple-100 text-purple-800 border-purple-300",
  "bg-emerald-100 text-emerald-800 border-emerald-300",
  "bg-amber-100 text-amber-800 border-amber-300",
  "bg-rose-100 text-rose-800 border-rose-300",
  "bg-cyan-100 text-cyan-800 border-cyan-300",
];

export function courseColor(courseId: string) {
  let hash = 0;
  for (let i = 0; i < courseId.length; i++) {
    hash = (hash * 31 + courseId.charCodeAt(i)) >>> 0;
  }
  return COURSE_PALETTE[hash % COURSE_PALETTE.length];
}

export function toDateStr(date: Date) {
  return new Date(date).toISOString().split("T")[0];
}

export function formatDateStr(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function todayStr() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

interface SessionRecord {
  id: string;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: string;
  location: string | null;
  cancelReason: string | null;
  course: { id: string; title: string };
  instructor: { id: string; name: string } | null;
  lesson: { id: string; title: string } | null;
  attendees: {
    studentId: string;
    attendance: string | null;
    student: { id: string; name: string };
  }[];
}

export function toSessionItem(
  s: SessionRecord,
  viewerStudentIds?: string[]
): SessionItem {
  const relevant = viewerStudentIds
    ? s.attendees.filter((a) => viewerStudentIds.includes(a.studentId))
    : s.attendees;
  return {
    id: s.id,
    title: s.title,
    date: toDateStr(s.date),
    startTime: s.startTime,
    endTime: s.endTime,
    status: s.status,
    location: s.location,
    cancelReason: s.cancelReason,
    course: s.course,
    instructor: s.instructor,
    lesson: s.lesson,
    attendeeNames: s.attendees.map((a) => a.student.name),
    myAttendance:
      viewerStudentIds && relevant.length > 0
        ? relevant[0].attendance
        : null,
  };
}
