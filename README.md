# Piwulangan

**Piwulangan** adalah sebuah **Learning Management System (LMS) ringan** yang dirancang untuk lembaga kursus, pelatihan privat, bengkel keterampilan, serta komunitas belajar berskala kecil hingga menengah. Sistem ini tidak dimaksudkan untuk menggantikan proses pembelajaran, melainkan menyediakan **gambaran menyeluruh** mengenai aktivitas pendidikan: siapa peserta didik, materi apa yang telah dipelajari, jadwal kelas yang akan datang, serta area yang memerlukan perhatian instruktur.

**Piwulangan** — *Sistem pemantauan pembelajaran yang ringkas, fleksibel, dan siap digunakan oleh lembaga pendidikan skala kecil hingga menengah.*


---

## Sasaran Pengguna

Piwulangan ideal digunakan oleh:

- Lembaga kursus bahasa, bimbingan belajar, dan workshop keterampilan  
- Instruktur atau tutor privat  
- Komunitas belajar atau kelompok studi kecil  
- Orang tua atau wali yang ingin memantau perkembangan akademik anak  

Sistem ini dirancang untuk skala **2–200 murid aktif** dengan **1–15 kursus berjalan** secara bersamaan. Antarmuka mengutamakan pendekatan **mobile-first**, menyesuaikan dengan kebiasaan pengguna yang mayoritas mengakses melalui perangkat seluler.

---

## Peran Pengguna

Piwulangan menyediakan empat peran utama dengan hak akses berbeda:

| Peran | Hak Akses |
|---|---|
| **Admin** | Mengelola seluruh kursus, pengguna, jadwal, serta pengaturan sistem |
| **Instruktur / Guru** | Membuat dan mengajar kursus, menyusun materi, serta mengatur jadwal dan ketersediaan |
| **Murid / Student** | Mengakses materi, menandai progres, melihat jadwal, dan memantau perkembangan belajar |
| **Wali / Guardian** | Akses baca (read-only) untuk memantau jadwal dan progres murid yang terhubung |

---

## Fitur Utama

### Materi Pembelajaran (Courses & Lessons)
- Pembuatan kursus dengan judul, deskripsi, gambar sampul, dan pengaturan enrolment  
- Struktur materi bertingkat: **Kursus → Modul → Pelajaran**, dengan konten berbasis Markdown  
- Dukungan tautan sumber daya eksternal (Google Drive, YouTube, PDF, dan lainnya)  
- Penyematan video dari YouTube, Vimeo, dan platform serupa  
- Navigasi pelajaran yang ramah perangkat seluler  

### Pemantauan Kemajuan (Progress Tracking)
- Murid dapat menandai pelajaran sebagai *Selesai*  
- Progres ditampilkan dalam bentuk persentase dan bilah progres  
- Instruktur dapat memantau murid yang sudah selesai, tertinggal, atau membutuhkan perhatian khusus  

### Penjadwalan & Kalender (Scheduling)
- Pembuatan, pengubahan, dan pembatalan sesi kelas oleh admin atau instruktur  
- Pengaturan **ketersediaan mingguan** dan **tanggal tidak tersedia** bagi instruktur  
- Tampilan kalender mingguan untuk ringkasan jadwal  
- Pencatatan kehadiran (Hadir / Terlambat / Tidak Hadir) dengan catatan tambahan  
- Murid dan wali dapat melihat jadwal masing-masing (read-only)  

### Dashboard
- Dashboard berbeda untuk setiap peran: murid, instruktur, admin, dan wali  
- Menyajikan ringkasan kursus, jadwal, statistik, dan informasi penting lainnya  

### Pengumuman (Announcements)
- Pengumuman per-kursus oleh instruktur  
- Pengumuman global untuk seluruh pengguna  

### Laporan & Absensi (Reports)
- Laporan progres murid, kehadiran, dan performa kursus bagi admin dan instruktur  

### Notifikasi
- Notifikasi dalam aplikasi untuk perubahan jadwal, materi baru, dan aktivitas penting  

### Multi-kursus & Multi-instruktur
- Mendukung banyak instruktur dalam satu sistem  
- Murid dapat mengikuti beberapa kursus sekaligus  
- Wali dapat terhubung dengan lebih dari satu murid  

### Pengaturan Profil
- Pengguna dapat memperbarui profil dan kata sandi  
- Superadmin dapat melakukan rebranding nama aplikasi sesuai lembaga  

### Internasionalisasi (Bahasa)
- Antarmuka tersedia dalam **Bahasa Indonesia** dan **Bahasa Inggris**  
- Pemilihan bahasa menggunakan cookie tanpa mengubah struktur URL  


---

## 🚀 Memulai Pengembangan Lokal

Panduan lengkap tersedia di SETUP.md. Ringkasan:

```bash
npm install
cp .env.example .env.local   # isi DATABASE_URL dan AUTH_SECRET
npm run db:migrate
npm run db:seed
npm run dev
```

Tidak memerlukan Docker atau server database terpisah. Basis data lokal menggunakan file SQLite. Jalankan perintah di atas dan akses `http://localhost:3000`.

---

## 📚 Dokumentasi Tambahan

- **SETUP.md** — panduan setup pengembangan  

---

## 📄 Lisensi

Piwulangan dirilis di bawah lisensi **MIT**. Anda bebas menggunakan, memodifikasi, dan melakukan forking sesuai kebutuhan. 