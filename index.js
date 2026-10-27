// Status Discord untuk 1 akun: Streaming + Playing + Custom status (bergantian).
// Token dibaca dari environment variable TOKEN (jangan pernah ditulis di file / di-commit).
try { require("dotenv").config(); } catch {}

const fs = require("fs");
const path = require("path");
const Discord = require("discord.js-selfbot-v13");
const { RichPresence, CustomStatus } = Discord;

process.on("unhandledRejection", (e) => console.error("⚠️ unhandledRejection:", e && e.message ? e.message : e));
process.on("uncaughtException", (e) => console.error("⚠️ uncaughtException:", e && e.message ? e.message : e));

const YEAR_MS = 365.25 * 24 * 3600 * 1000;
const stamp = () => new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
const isValidURL = (u) => { try { new URL(u); return true; } catch { return false; } };

const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));
const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error("❌ Isi environment variable TOKEN (file .env di lokal, atau menu Variables di hosting)");
  process.exit(1);
}

const client = new Discord.Client({ checkUpdate: false });
const cache = new Map();
const launchedAt = Date.now();
let rotIndex = 0;
let applying = false;

// ===== Ambil gambar eksternal (dengan cache) =====
async function resolveImages(appId, url1, url2) {
  const key = `${url1}|${url2}`;
  if (cache.has(key)) return cache.get(key);

  const u1 = isValidURL(url1) ? url1 : null;
  const u2 = isValidURL(url2) ? url2 : null;
  const result = { bigImage: null, smallImage: null };
  const urls = [u1, u2].filter(Boolean);

  if (urls.length) {
    try {
      const images = await RichPresence.getExternal(client, appId, ...urls);
      const pick = (img) => (img.url.includes("attachments") ? img.url : img.external_asset_path);
      const f1 = u1 && images.find((i) => i.url === u1);
      const f2 = u2 && images.find((i) => i.url === u2);
      if (f1) result.bigImage = pick(f1);
      if (f2) result.smallImage = pick(f2);
      if (!result.bigImage && !result.smallImage) console.error("⚠️ gambar tidak dikenali Discord:", urls.join(", "));
    } catch (e) {
      console.error(`⚠️ gagal ambil gambar: ${e.message}`);
    }
  }
  if (result.bigImage || result.smallImage) cache.set(key, result); // jangan cache kalau gagal
  return result;
}

// ===== Buat satu activity (Playing / Streaming) =====
async function buildActivity(act) {
  const appId = act.applicationId || cfg.applicationId;
  const { bigImage, smallImage } = await resolveImages(appId, act.largeImageUrl, act.smallImageUrl);

  const p = new RichPresence(client)
    .setApplicationId(appId)
    .setType(act.type || "PLAYING")
    .setName(act.name);

  // Waktu elapsed hanya tampil kalau startYearsAgo diisi (0 = mulai sekarang)
  if (act.startYearsAgo !== undefined && act.startYearsAgo !== null) {
    p.setStartTimestamp(launchedAt - (Number(act.startYearsAgo) || 0) * YEAR_MS);
  }
  // URL hanya dipakai untuk tipe STREAMING
  if (act.type === "STREAMING" && act.url) p.setURL(act.url);

  if (act.details) p.setDetails(act.details);
  if (act.state) p.setState(act.state);

  if (bigImage) {
    p.setAssetsLargeImage(bigImage);
    if (act.largeText) p.setAssetsLargeText(act.largeText);
  }
  if (smallImage) p.setAssetsSmallImage(smallImage);
  (act.buttons || []).slice(0, 2).forEach((b) => p.addButton(b.label, b.url));

  return p;
}

// ===== Pasang semua status =====
async function apply() {
  if (applying) return; // jangan tumpuk
  applying = true;
  try {
    const list = [];
    for (const act of cfg.activities || []) list.push(await buildActivity(act));

    // Custom status (teks bergantian)
    const cs = cfg.customStatus;
    if (cs && Array.isArray(cs.texts) && cs.texts.length) {
      const c = new CustomStatus(client).setState(String(cs.texts[rotIndex % cs.texts.length]));
      if (cs.emoji) c.setEmoji(cs.emoji);
      list.push(c);
    }

    client.user.setPresence({ activities: list });
  } catch (e) {
    console.error(`❌ gagal set status: ${e.message}`);
  } finally {
    applying = false;
  }
}

client.on("ready", async () => {
  console.log(`✅ aktif sebagai ${client.user.username}`);
  await apply();

  // Pasang ulang berkala supaya status tetap terjaga
  const mins = Number(cfg.refreshMinutes) || 10;
  setInterval(apply, mins * 60 * 1000).unref();

  // Custom status bergantian. Discord membatasi ~5 update status per 20 detik,
  // jadi jeda minimal dipaksa 5 detik.
  const cs = cfg.customStatus;
  if (cs && Array.isArray(cs.texts) && cs.texts.length > 1) {
    const sec = Math.max(5, Number(cs.intervalSeconds) || 5);
    setInterval(() => { rotIndex++; apply(); }, sec * 1000).unref();
    console.log(`🔁 custom status bergantian tiap ${sec} detik (${cs.texts.length} teks)`);
  }
});

// Catat kalau terputus atau token dibatalkan Discord
client.on("error", (e) => console.error(`⚠️ error: ${e.message}`));
client.on("invalidated", () => console.error(`🚫 ${stamp()} sesi dibatalkan Discord (token tidak berlaku lagi)`));
client.on("shardDisconnect", (event) => {
  const code = event && event.code;
  console.warn(`🔌 ${stamp()} terputus dari gateway (kode ${code})${code === 4004 ? " = TOKEN DITOLAK" : ""}`);
});
client.on("shardReconnecting", () => console.warn(`🔄 ${stamp()} mencoba menyambung ulang`));
client.on("shardResume", () => console.log(`✅ ${stamp()} tersambung kembali`));

client.login(TOKEN).catch((e) => {
  console.error(`❌ login gagal: ${e && e.message ? e.message : "token salah/kedaluwarsa"}`);
  process.exit(1);
});
