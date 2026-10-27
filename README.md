# Status Discord (1 akun): Streaming + Playing + Custom status

Hanya untuk akun milik sendiri. Selfbot melanggar ToS Discord, risiko ban ditanggung sendiri.

## Pakai
1. `npm install`
2. Isi token lewat environment variable `TOKEN` (lokal: salin `.env.example` jadi `.env`; hosting: menu Variables).
3. `npm start`

## config.json
- `applicationId`: ID application default
- `refreshMinutes`: status dipasang ulang tiap sekian menit
- `activities[]`: daftar activity yang tampil bersamaan
  - `type`: `PLAYING` atau `STREAMING`
  - `name`: nama yang tampil (`Roblox`, atau `Twitch` untuk "Streaming Twitch")
  - `applicationId` (opsional): kalau ada dua activity, beri ID berbeda supaya keduanya tampil
  - `url`: hanya untuk `STREAMING`
  - `details`, `state`, `largeImageUrl`, `smallImageUrl`, `largeText`, `buttons` (opsional)
  - `startYearsAgo` (opsional): waktu elapsed mulai sekian tahun lalu, `0` = sekarang. Kalau tidak diisi, waktu tidak tampil
- `customStatus`: `texts` (daftar teks yang bergantian) dan `intervalSeconds` (minimal 5)

Jangan pernah commit `.env` atau menulis token di file.
