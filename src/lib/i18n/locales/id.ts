// Bahasa Indonesia — default locale
// Format Indonesian (formal "Anda"), role labels translated fully.
// Status labels kept in English.
export default {
  // Role labels
  roles: {
    admin: "Administrator",
    instructor: "Pengajar",
    student: "Siswa",
    guardian: "Wali Murid",
  },

  // Navigation
  nav: {
    dashboard: "Beranda",
    courses: "Kelas",
    schedule: "Jadwal",
    announcements: "Pengumuman",
    profile: "Profil",
    userManagement: "Kelola Pengguna",
    admin: "Admin",
    signOut: "Keluar",
    notifications: "Notifikasi",
  },

  // Auth
  auth: {
    welcomeBack: "Selamat datang kembali",
    signInAccount: "Masuk ke akun Anda",
    email: "Email",
    password: "Kata Sandi",
    emailPlaceholder: "anda@contoh.com",
    passwordPlaceholder: "Masukkan kata sandi Anda",
    signIn: "Masuk",
    signingIn: "Masuk...",
    noAccount: "Belum punya akun?",
    signUp: "Daftar",
    createAccount: "Buat akun Anda",
    joinPiwulangan: "Bergabung dengan Piwulangan untuk mulai belajar.",
    name: "Nama Lengkap",
    namePlaceholder: "Nama lengkap Anda",
    confirmPassword: "Konfirmasi Kata Sandi",
    confirmPasswordPlaceholder: "Ulangi kata sandi Anda",
    signInWithEmail: "Daftar dengan email Anda",
    haveAccount: "Sudah punya akun?",
    loginFailed: "Gagal masuk",
    passwordsDontMatch: "Kata sandi tidak cocok",
    signupFailed: "Gagal mendaftar",
    nameRequired: "Nama wajib diisi",
    brandTagline: "Belajar bersama-sama.",
  },

  // Profile
  profile: {
    title: "Profil Saya",
    name: "Nama",
    email: "Email",
    role: "Peran",
    settings: "Pengaturan",
    language: "Bahasa",
    langId: "Bahasa Indonesia",
    langEn: "English",
    unknown: "Tidak diketahui",
  },

  // Dashboard — Student
  student: {
    welcome: "Selamat Datang",
    upcomingSessions: "Jadwal berikutnya",
    viewAll: "Lihat Semua",
    noUpcomingSessions: "Tidak ada jadwal berikutnya",
    myCourses: "Kelas saya",
    teacher: "Pengajar",
    lessons: "pelajaran",
    recentAnnouncements: "Pengumuman terbaru",
    enrolled: "Terdaftar",
  },

  // Dashboard — Instructor
  instructor: {
    quickStats: "Ringkasan",
    sessionsThisWeek: "Sesi Minggu Ini",
    studentsAt80plus: "Siswa di 80%+",
    todaysSessions: "Sesi hari ini",
    viewFullSchedule: "Lihat Jadwal Penuh",
    noSessionsToday: "Tidak ada sesi hari ini",
    myCourses: "Kelas saya",
    students: "siswa",
    modules: "modul",
  },

  // Dashboard — Guardian
  guardian: {
    progress: "perkembangan",
    lessons: "pelajaran",
    viewSchedule: "Lihat Jadwal",
    notEnrolled: "Tidak terdaftar di kelas manapun",
    noLinkedStudents: "Belum ada siswa terkait. Minta admin untuk menghubungkan Anda.",
  },

  // Dashboard — Admin
  admin: {
    overview: "Ikhtisar",
    totalUsers: "Total Pengguna",
    courses: "Kelas",
    sessionsToday: "Sesi Hari Ini",
    quickLinks: "Tautan cepat",
    manageCourses: "Kelola Kelas",
    schedule: "Jadwal",
    announcements: "Pengumuman",
    manageUsers: "Kelola Pengguna",
  },

  // Courses — list + cards
  courses: {
    allCourses: "Semua Kelas",
    allCoursesAdmin: "Kelola semua kelas di sistem.",
    myCourses: "Kelas saya",
    myCoursesInstructor: "Kelas Anda.",
    myCoursesGuardian: "Kelas tempat siswa Anda terdaftar. Lihat saja.",
    newCourse: "+ Kelas Baru",
    archived: "Diarsipkan",
    archivedCourses: "Kelas yang Diarsipkan",
    activeCourses: "Kelas Aktif",
    noCoursesAdmin: "Belum ada kelas. Buat kelas pertama Anda!",
    noCoursesStudent: "Anda belum terdaftar di kelas manapun. Masukkan kode undangan untuk bergabung.",
    noCoursesGuardian: "Siswa yang terkait belum terdaftar di kelas manapun.",
    noArchivedCourses: "Tidak ada kelas yang diarsipkan",
    dismiss: "Abaikan",
    archive: "Arsipkan",
    unarchive: "Pulihkan",
    courseArchived: "Kelas telah diarsipkan",
    courseUnarchived: "Kelas telah dipulihkan dari arsip",
    studentDescription: "Kelola kelas Anda, ikuti tugas, pantau progress.",
    moduleCount: "{n} modul",
    studentCount: "{n} siswa",
    enrolledCourseDesc: "Kelas tempat siswa Anda terdaftar. Lihat saja.",
  },

  // Browse courses (students discovering published courses)
  browse: {
    title: "Jelajahi kelas",
    enroll: "Daftar",
    join: "Gabung",
    enterInviteCode: "Masukkan Kode Undangan",
    inviteCodePlaceholder: "Kode undangan",
    viewDetails: "Lihat detail",
    enrollmentByInstructor: "Pendaftaran dikelola oleh pengajar",
  },

  // New course form
  newCourse: {
    back: "← Kembali ke kelas",
    title: "Buat Kelas Baru",
    courseTitle: "Judul Kelas",
    courseTitlePlaceholder: "mis. Dasar-dasar Inggris",
    description: "Deskripsi (opsional)",
    descriptionPlaceholder: "Apa yang akan dipelajari siswa?",
    coverImage: "URL Gambar Sampul (opsional)",
    coverImagePlaceholder: "https://...",
    enrollmentMode: "Mode Pendaftaran",
    enrollmentOpen: "Terbuka — siapa pun dengan tautan",
    enrollmentInviteCode: "Kode Undangan — siswa memasukkan kode",
    enrollmentManual: "Manual — Anda menambahkan siswa",
    create: "Buat Kelas",
    creating: "Membuat...",
  },

  // Course detail page
  courseDetail: {
    draft: "Draft",
    schedule: "Jadwal",
    settings: "Pengaturan",
    code: "Kode",
    nextSession: "Sesi Berikutnya",
    lesson: "Pelajaran",
    viewSchedule: "Lihat jadwal →",
    lessonsCompleted: "{done} dari {total} pelajaran selesai",
    continue: "Lanjutkan: {title} →",
    announcements: "Pengumuman",
    manage: "Kelola",
    viewAll: "Lihat Semua →",
    courseContent: "Materi kelas",
    editContent: "Edit materi →",
    module: "Modul {order}",
    noLessons: "Belum ada pelajaran",
    noContent: "Belum ada materi.",
    addModulesAndLessons: "Tambah modul dan pelajaran →",
    duration: "~{n} menit",
    viewMembers: "👥 Lihat anggota",
    notAvailable: "Kelas ini tidak tersedia.",
    previewEnroll: "Daftar di kelas ini untuk melihat materinya.",
    previewOpen: "Kelas ini terbuka untuk pendaftaran.",
    enrollNow: "Daftar Sekarang",
    previewInvite: "Masukkan kode undangan",
    previewInvitePlaceholder: "Masukkan kode undangan",
    previewManaged: "Pendaftaran di kelas ini dikelola oleh pengajar.",
  },

  // Shared / generic
  common: {
    pin: "Pinned",
    published: "Published",
    draft: "Draft",
    archived: "Archived",
    moduleSingular: "modul",
    modulePlural: "modul",
    lessonSingular: "pelajaran",
    lessonPlural: "pelajaran",
  },
} as const
