# Panduan Deploy SMSTPQ ke Netlify

## Prasyarat

- Akun Netlify ([https://app.netlify.com](https://app.netlify.com))
- Repository GitHub/GitLab sudah dibuat
- Database Supabase sudah ter-setup (STEP 2)

---

## 1. Persiapan Repository

```bash
# Inisialisasi git (jika belum)
git init
git add .
git commit -m "init: SMSTPQ full implementation"

# Push ke GitHub
git remote add origin https://github.com/USERNAME/smstpq.git
git branch -M main
git push -u origin main
```

---

## 2. Environment Variables di Netlify

Buka **Netlify → Site → Environment variables** dan tambahkan semua variabel berikut:


| Variabel                        | Keterangan                 | Contoh                       |
| ------------------------------- | -------------------------- | ---------------------------- |
| `DATABASE_URL`                  | Supabase connection pooler | `postgresql://...`           |
| `DIRECT_URL`                    | Supabase direct connection | `postgresql://...`           |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL       | `https://xxx.supabase.co`    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key          | `eyJ...`                     |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase service role key  | `eyJ...`                     |
| `JWT_SECRET`                    | Secret untuk JWT session   | 32+ karakter random          |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`  | VAPID public key           | `BL...`                      |
| `VAPID_PRIVATE_KEY`             | VAPID private key          | `4X-...`                     |
| `VAPID_SUBJECT`                 | Email VAPID                | `mailto:admin@domain.com`    |
| `NEXT_PUBLIC_APP_URL`           | URL produksi               | `https://smstpq.netlify.app` |
| `CRON_SECRET`                   | Secret untuk cron API      | 32+ karakter random          |
| `RETENTION_MONTHS`              | Retensi absensi (bulan)    | `6`                          |


> **Generate secrets:**
>
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

---

## 3. Deploy ke Netlify

### Opsi A — Via UI (Direkomendasikan)

1. Buka [https://app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**
2. Pilih GitHub repo
3. Build settings sudah otomatis terbaca dari `netlify.toml`:
  - Build command: `npx prisma generate && npm run build`
  - Publish directory: `.next`
4. Klik **Deploy site**

### Opsi B — Via Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

---

## 4. Setelah Deploy

### Verifikasi endpoint

```bash
# Statistik publik
curl https://your-site.netlify.app/api/public/stats

# Test rate limiting (jalankan > 10x)
for i in {1..12}; do curl -s -o /dev/null -w "%{http_code}\n" https://your-site.netlify.app/api/public/stats; done
```

### Verifikasi PWA (Lighthouse)

1. Buka Chrome → DevTools (F12) → Lighthouse
2. Categories: centang **Progressive Web App**
3. Generate report → target skor 90+

### Verifikasi Push Notification

1. Buka `https://your-site.netlify.app/santri/[NIS]`
2. Klik **Aktifkan Notifikasi** → izinkan
3. Login sebagai pengajar → input setoran untuk santri tersebut
4. Notifikasi harus muncul di browser/perangkat

### Test Cron Jobs (manual trigger)

```bash
# Test retensi
curl -X POST https://your-site.netlify.app/api/cron/retention \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: YOUR_CRON_SECRET" \
  -d '{"before":"2025-01-01T00:00:00Z"}'

# Test backup notify
curl -X POST https://your-site.netlify.app/api/cron/backup-notify \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

---

## 5. Jadwal Cron (Otomatis)


| Function               | Jadwal      | Waktu WIB    | Fungsi                  |
| ---------------------- | ----------- | ------------ | ----------------------- |
| `weekly-retention`     | `0 2 * * 0` | Minggu 09:00 | Hapus absensi > 6 bulan |
| `weekly-backup-notify` | `0 3 * * 0` | Minggu 10:00 | Log pengingat backup    |


---

## 6. Monitoring & Logs

- **Netlify Functions logs**: Netlify dashboard → Functions → pilih function
- **Log Aktivitas**: `/admin/log` di aplikasi
- **Database**: Supabase dashboard → Table Editor

---

## Checklist Deploy

- Semua env vars sudah di-set di Netlify
- Build berhasil tanpa error
- Database migration sudah dijalankan (`prisma migrate deploy`)
- Seed data awal sudah ada
- Login admin berhasil
- Push notification bekerja (test di browser)
- Cron jobs aktif (cek Netlify → Functions)
- Lighthouse PWA score ≥ 90

