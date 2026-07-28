// English locale — Phase 1 keys (nav + auth + dashboard)
// Status labels are kept in English per user decision.
export default {
  // Role labels — translated to English equivalents
  roles: {
    admin: "Administrator",
    instructor: "Instructor",
    student: "Student",
    guardian: "Guardian",
  },

  // Navigation
  nav: {
    dashboard: "Dashboard",
    courses: "Courses",
    schedule: "Schedule",
    announcements: "Announcements",
    profile: "Profile",
    userManagement: "User Management",
    admin: "Admin",
    signOut: "Sign Out",
    notifications: "Notifications",
  },

  // Profile
  profile: {
    title: "My Profile",
    name: "Name",
    email: "Email",
    role: "Role",
    settings: "Settings",
    language: "Language",
    langId: "Bahasa Indonesia",
    langEn: "English",
    unknown: "Unknown",
  },

  // Auth
  auth: {
    welcomeBack: "Welcome back",
    signInAccount: "Sign in to your account",
    email: "Email",
    password: "Password",
    emailPlaceholder: "you@example.com",
    passwordPlaceholder: "Enter your password",
    signIn: "Sign In",
    signingIn: "Signing in...",
    noAccount: "Don't have an account?",
    signUp: "Sign up",
    createAccount: "Create your account",
    joinPiwulangan: "Join Piwulangan to start learning.",
    name: "Name",
    namePlaceholder: "Your full name",
    confirmPassword: "Confirm Password",
    confirmPasswordPlaceholder: "Repeat your password",
    signInWithEmail: "Sign up with your email",
    haveAccount: "Already have an account?",
    loginFailed: "Login failed",
    passwordsDontMatch: "Passwords don't match",
    signupFailed: "Sign up failed",
    nameRequired: "Name is required",
    brandTagline: "Learning made together.",
  },

  // Dashboard — Student
  student: {
    welcome: "Welcome",
    upcomingSessions: "Upcoming sessions",
    viewAll: "View All",
    noUpcomingSessions: "No upcoming sessions",
    myCourses: "My courses",
    teacher: "Teacher",
    lessons: "lessons",
    recentAnnouncements: "Recent announcements",
    enrolled: "Enrolled",
  },

  // Dashboard — Instructor
  instructor: {
    quickStats: "Quick stats",
    sessionsThisWeek: "Sessions This Week",
    studentsAt80plus: "Students at 80%+",
    todaysSessions: "Today's sessions",
    viewFullSchedule: "View Full Schedule",
    noSessionsToday: "No sessions today",
    myCourses: "My courses",
    students: "students",
    modules: "modules",
  },

  // Dashboard — Guardian
  guardian: {
    progress: "progress",
    lessons: "lessons",
    viewSchedule: "View Schedule",
    notEnrolled: "Not enrolled in any courses",
    noLinkedStudents: "No linked students. Ask an admin to link you.",
  },

  // Dashboard — Admin
  admin: {
    overview: "Overview",
    totalUsers: "Total Users",
    courses: "Courses",
    sessionsToday: "Sessions Today",
    quickLinks: "Quick links",
    manageCourses: "Manage Courses",
    schedule: "Schedule",
    announcements: "Announcements",
    manageUsers: "Manage Users",
  },

  // Courses — list + cards
  courses: {
    allCourses: "All courses",
    allCoursesAdmin: "Manage all courses in the system.",
    myCourses: "My courses",
    myCoursesInstructor: "Your courses.",
    myCoursesGuardian: "Courses your linked students are enrolled in. View only.",
    newCourse: "+ New Course",
    archived: "Archived",
    archivedCourses: "Archived Courses",
    activeCourses: "Active Courses",
    noCoursesAdmin: "No courses yet. Create your first course!",
    noCoursesStudent: "You're not enrolled in any courses yet. Enter an invite code above to join one.",
    noCoursesGuardian: "Your linked students are not enrolled in any courses yet.",
    noArchivedCourses: "No archived courses",
    dismiss: "Dismiss",
    archive: "Archive",
    unarchive: "Unarchive",
    courseArchived: "Course archived",
    courseUnarchived: "Course unarchived",
    studentDescription: "Manage your courses, follow tasks, track progress.",
    moduleCount: "{n} modules",
    studentCount: "{n} students",
    enrolledCourseDesc: "Courses your linked students are enrolled in. View only.",
  },

  // Browse courses (students discovering published courses)
  browse: {
    title: "Browse courses",
    enroll: "Enroll",
    join: "Join",
    enterInviteCode: "Enter Invite Code",
    inviteCodePlaceholder: "Invite code",
    viewDetails: "View details",
    enrollmentByInstructor: "Enrollment by instructor",
  },

  // New course form
  newCourse: {
    back: "← Back to courses",
    title: "Create New Course",
    courseTitle: "Course Title",
    courseTitlePlaceholder: "e.g., English Basics",
    description: "Description (optional)",
    descriptionPlaceholder: "What will students learn?",
    coverImage: "Cover Image URL (optional)",
    coverImagePlaceholder: "https://...",
    enrollmentMode: "Enrollment Mode",
    enrollmentOpen: "Open — anyone with the link",
    enrollmentInviteCode: "Invite Code — students enter a code",
    enrollmentManual: "Manual — you add students",
    create: "Create Course",
    creating: "Creating...",
  },

  // Course detail page
  courseDetail: {
    draft: "Draft",
    schedule: "Schedule",
    settings: "Settings",
    code: "Code",
    nextSession: "Next Session",
    lesson: "Lesson",
    viewSchedule: "View schedule →",
    lessonsCompleted: "{done} of {total} lessons completed",
    continue: "Continue: {title} →",
    announcements: "Announcements",
    manage: "Manage",
    viewAll: "View All →",
    courseContent: "Course content",
    editContent: "Edit content →",
    module: "Module {order}",
    noLessons: "No lessons yet",
    noContent: "No content yet.",
    addModulesAndLessons: "Add modules and lessons →",
    duration: "~{n} min",
    viewMembers: "👥 View members",
    notAvailable: "This course is not available.",
    previewEnroll: "Enroll in this course to see its content.",
    previewOpen: "This course is open for enrollment.",
    enrollNow: "Enroll Now",
    previewInvite: "Enter invite code",
    previewInvitePlaceholder: "Enter invite code",
    previewManaged: "Enrollment for this course is managed by the instructor.",
  },

  // Shared / generic
  common: {
    pin: "Pinned",
    published: "Published",
    draft: "Draft",
    archived: "Archived",
    moduleSingular: "module",
    modulePlural: "modules",
    lessonSingular: "lesson",
    lessonPlural: "lessons",
  },
} as const
