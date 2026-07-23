# 🧠 Multi-Agent Development Workflow (HITL·Work)

Kumpulan 16 system prompt untuk workflow coding berbasis multi-agent: **Decomposer → Planner → Executor → QA**, dilengkapi agent spesialis untuk review, debugging, refactoring, dan dokumentasi.

Setiap file `.md` adalah system prompt independen untuk satu peran. Prinsip dasarnya: **satu agent, satu tanggung jawab.** Planner tidak nulis kode. Executor tidak mikirin arsitektur. QA tidak percaya apa pun tanpa verifikasi. Pemisahan ini yang bikin tiap agent bisa dikasih model murah/cepat sekalipun, karena scope-nya sempit dan jelas.

---

## Alur Utama

```
(Decomposer) → Planner → (Doubt Review) → Executor → QA → (Review specialists) → Documentation
```

0. **Decomposer** (opsional, hanya untuk scope besar) — kalau input berupa PRD besar yang mencakup banyak modul, pecah dulu jadi task-task kecil (`task-1.md`, `task-2.md`, ...) sebelum masuk ke Planner.
1. **Planner** bikin spec (`prd.md`) yang detail dan gak ambigu — per task (kalau lewat Decomposer) atau langsung dari permintaan fitur.
2. **Doubt Review** (opsional tapi disarankan) nge-stress-test spec itu sebelum dieksekusi — cari asumsi tersembunyi, edge case yang kelewat, scope creep.
3. **Executor** implementasi persis sesuai spec, gak improvisasi.
4. **QA** verifikasi hasil implementasi cocok sama spec — skeptis by default.
5. Review specialists (**Architecture, Security, Performance, Migration, UI/UX**) jalan paralel atau setelah QA, tergantung apa yang disentuh fitur tersebut.
6. **Documentation** & **Skill Extractor** menutup siklus — mendokumentasikan apa yang dibangun dan pattern apa yang harus diingat untuk fitur berikutnya.

---

## Daftar Agent

### Intake

| Agent | File | Peran |
|---|---|---|
| 🧩 **Decomposer** | `decomposer.md` | Agent pertama di pipeline kalau input berupa PRD besar. Membaca PRD dan memecahnya jadi task-task diskrit berdasarkan domain/batas fungsional (bukan langkah implementasi), masing-masing disimpan sebagai `task-N.md` dengan field Goal + Context (dependensi antar-task). Tidak merencanakan, tidak eksekusi — murni dekomposisi. Selalu berhenti untuk human review sebelum task diteruskan ke Planner. |

### Core Pipeline

| Agent | File | Peran |
|---|---|---|
| 🧠 **Planner** | `planner.md` | Senior Software Architect. Mengubah kebutuhan fitur (atau satu `task-N.md` dari Decomposer) jadi spec implementasi (`prd.md`) yang lengkap — mencakup necessity check (YAGNI+DRY), reusability assessment, security/performance/observability/UI-UX check. Tidak menulis kode. |
| ⚙️ **Executor** | `executor.md` | Meticulous Implementation Engineer. Menjalankan `prd.md` langkah demi langkah, tanpa improvisasi. Berhenti dan bertanya kalau ada step yang ambigu atau blocked. |
| 🔍 **QA** | `qa.md` | Quality Assurance Engineer. Memverifikasi hasil Executor terhadap spec — spec compliance, breaking changes, Definition of Done, dan code quality dasar (logic, security, side effects, consistency). |

### Pre-Execution Review

| Agent | File | Peran |
|---|---|---|
| 🔍 **Doubt Review** | `doubt-review.md` | Adversarial spec reviewer. Dijalankan setelah Planner, sebelum Executor. Mencari hidden assumptions, scope creep, langkah irreversible, edge case yang hilang, dan ambiguitas — sebelum kode ditulis. |

### Post-Execution Review Specialists

Dijalankan setelah Executor selesai, biasanya paralel dengan atau setelah QA. Semua agent di kategori ini **hanya melaporkan masalah, tidak memperbaikinya**.

| Agent | File | Fokus |
|---|---|---|
| 🏛️ **Architecture Review** | `architecture-review.md` | Kepatuhan pada skill file, batas antar-layer (Controller/Service/Model), arah dependency, duplikasi vs reuse, maintainability jangka panjang. |
| 🔒 **Security Review** | `security-review.md` | Attack surface, input validation, auth/authz, data exposure, hardcoded secrets, dependency risk. |
| ⚡ **Performance Review** | `performance-review.md` | N+1 query, indexing, caching, memory usage, external call resilience, skalabilitas di 10x–100x beban. |
| 🗄️ **Migration Review** | `migration-review.md` | Keamanan migrasi database — klasifikasi risiko operasi, rollback safety, data integrity, locking risk, kompatibilitas kode lama. |
| ♻️ **Refactor Agent** | `refactor-agent.md` | Menemukan peluang abstraksi, masalah readability, over-engineering, dan coupling — tanpa mengubah behavior. Menghasilkan refactor plan berprioritas, bukan kode. |

### UI/UX Specialists

| Agent | File | Peran |
|---|---|---|
| 🎨 **UI/UX Planner** | `ui-ux-planner.md` | Dipanggil oleh Planner utama saat kompleksitas UI tinggi. Menghasilkan spec UI yang presisi — token warna/spacing, komponen yang harus di-reuse, state (loading/empty/error), agar Executor tidak menebak-nebak visual. |
| 🧩 **UI Skill Extractor** | `ui-skill-extractor.md` | Membaca implementasi UI yang sudah lolos QA dan mengekstrak/memperbarui skill file visual project (`skills/[project]-ui.md`) — token, komponen, anti-pattern — supaya audit UI berikutnya tidak mulai dari nol. |

### Supporting Agents

| Agent | File | Peran |
|---|---|---|
| 🔌 **API Agent** | `api-agent.md` | Senior API Architect dengan 3 mode: **DESIGN** (bikin API contract baru), **INTEGRATION** (spec konsumsi API eksternal — resilience, retry, circuit breaker), **AUDIT** (review API/integrasi yang sudah ada). |
| 🐛 **Debug Agent** | `debug.md` | Debug investigator. Mencari root cause bug lewat triase config-vs-bug, tracing eksekusi, hipotesis berbukti. Tidak menulis fix — hanya handoff yang presisi ke Executor. |
| 📚 **Skill Extractor** | `skill-extractor.md` | Mengamati kode yang sudah ada dan mendistilasi pattern jadi `skill.md` — folder structure, naming convention, anti-pattern — yang dibaca semua agent lain sebelum bekerja di codebase tersebut. |
| 📖 **Documentation** | `documentation.md` | Technical writer. Menulis dokumentasi (API reference, module docs, feature guide, changelog) berdasarkan kode yang *benar-benar* diimplementasikan, bukan yang direncanakan. |

---

## Kenapa Dipisah Per-Agent?

- **Scope sempit → hasil lebih dapat diandalkan.** Model (terutama yang murah) lebih akurat kalau instruksinya "cuma cek keamanan" ketimbang "cek semuanya sekaligus."
- **Cheap model untuk Executor, model lebih kuat untuk Planner/Review.** Karena Executor sekadar mengikuti spec detail, dia tidak butuh reasoning berat — asal spec-nya lengkap.
- **Setiap agent bisa dipanggil independen.** Butuh audit keamanan doang? Panggil Security Review tanpa lewatin seluruh pipeline.
- **Skill file sebagai memori bersama.** `skill-extractor.md` dan `ui-skill-extractor.md` mencegah tiap Planner/Executor harus re-audit codebase dari nol setiap kali.

---

## Cara Pakai

1. **PRD besar dengan banyak modul?** Mulai dari **Decomposer** — pecah jadi `task-N.md` per domain/modul, review dan sepakati task list-nya dulu sebelum lanjut.
2. Untuk tiap task (atau langsung kalau scope-nya kecil) — mulai dari **Planner**, jelasin fitur/bug yang mau dikerjain.
3. Kalau spec-nya menyentuh hal berisiko (multi-tenant, migrasi DB, live users) → jalankan **Doubt Review** dulu sebelum lanjut ke Executor.
4. **Executor** implementasi sesuai `prd.md`.
5. **QA** verifikasi.
6. Jalankan review specialist yang relevan (misal: ada migrasi DB → Migration Review; ada endpoint baru → Security + API Agent AUDIT).
7. Kalau lolos semua → **Documentation** & **Skill Extractor** (atau **UI Skill Extractor** untuk fitur dengan UI) buat nutup siklus.

Setiap agent nolak untuk melakukan pekerjaan di luar scope-nya (misal: Planner nolak nulis kode, QA nolak approve tanpa baca kode aktual) — ini disengaja, biar tiap tahap tetap jadi pemeriksaan independen terhadap tahap sebelumnya.
