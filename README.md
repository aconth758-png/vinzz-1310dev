# Vinzz Login API — Vercel + Neon Postgres

Backend login Android + admin panel. Database menggunakan Neon PostgreSQL sehingga tidak membutuhkan MySQL/InfinityFree.

## 1. Buat database

Di Vercel, buka project kamu lalu pilih **Storage / Marketplace → Neon** dan buat/connect Neon Postgres. Vercel/Neon menyediakan `DATABASE_URL` untuk project yang terhubung. Setelah database dibuat, buka Neon SQL Editor lalu jalankan seluruh isi `schema.sql`.

## 2. Environment Variables

Di Vercel → Project → Settings → Environment Variables, isi:

- `DATABASE_URL` = otomatis dari Neon. Jangan dibagikan.
- `ADMIN_COOKIE_SECRET` = string acak panjang, minimal 32 karakter.
- `BOOTSTRAP_ADMIN_USERNAME` = nama admin awal, misalnya `admin`.
- `BOOTSTRAP_ADMIN_PASSWORD` = password admin awal.

Pilih **Production** (dan Preview jika diperlukan). Setelah mengubah environment variables, lakukan redeploy.

## 3. Buat admin pertama

Buka:
`https://DOMAIN-KAMU.vercel.app/api/admin/setup`

Endpoint ini membuat admin pertama dari BOOTSTRAP_ADMIN_USERNAME/BOOTSTRAP_ADMIN_PASSWORD.
Setelah berhasil, hapus `BOOTSTRAP_ADMIN_PASSWORD` dari Vercel Environment Variables lalu redeploy.

## 4. Admin panel

Buka:
`https://DOMAIN-KAMU.vercel.app/admin/`

Login menggunakan admin yang dibuat tadi.

## 5. Android API

Endpoint:
`https://DOMAIN-KAMU.vercel.app/api/login`

Method: POST

Form body:
- `username`
- `password`
- `deviceID`

Contoh JSON response sukses:
{
  "success": true,
  "message": "Login berhasil",
  "maintenance": false,
  "maintenance_msg": "",
  "user": {
    "username": "demo",
    "status": "active",
    "validUntil": "2026-12-31T00:00:00.000Z",
    "registered_date": "2026-09-26T00:00:00.000Z"
  }
}

## 6. Penting

Jangan masukkan DATABASE_URL, password database, ADMIN_COOKIE_SECRET, atau password admin ke source code/GitHub/chat. Simpan semuanya di Vercel Environment Variables.
