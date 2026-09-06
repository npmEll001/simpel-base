import fs from "fs-extra"
import path from "path"
import { once } from "events"
import { ZipArchive } from "archiver"
import { timeZone } from "../../library/exports.js"

const { loading, success, failed } = global.mapEmoji
const react = (conn, m, emoji) => conn.sendMessage(m.chat, { react: { text: emoji, key: m.key } })

const createBackupZip = async () => {
  const rootDir = process.cwd()
  const session = global.Bot?.sessionName || "session"

  const date = timeZone({ date: true, noTime: true })

  const botName = global.Bot.name
  const zipName = `${botName} ${date}.zip`
  const zipPath = path.join(rootDir, zipName)

  const excludedPatterns = [
    "node_modules/**",
    `${session}`,
    `${session}/**`,
    "tmp/**",
    "temp/**",
    ".git/**",
    ".cache/**",
    ".config/**",
    ".npm/**",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "*.mp4",
    "*.mkv",
    "*.mov",
    "*.zip",
    "*.tar.gz"
  ]

  const output = fs.createWriteStream(zipPath)
  const archive = new ZipArchive({ zlib: { level: 5 } })

  archive.on("warning", (err) => { if (err.code !== "ENOENT") throw err })
  archive.on("error", (err) => { throw err })

  archive.pipe(output)
  archive.glob("**/*", { cwd: rootDir, ignore: [...excludedPatterns, zipName], dot: true })

  await archive.finalize()
  await once(output, "close")

  const exists = await fs.pathExists(zipPath)
  if (!exists) throw new Error("file backup tidak ditemukan")

  const stat = await fs.stat(zipPath)
  if (!stat.size) throw new Error("file backup kosong")

  return { zipPath, zipName, botName, date, stat }
}

const runBackup = async (m, conn, target) => {
  await react(conn, m, loading)

  let zipPath
  try {
    const backup = await createBackupZip()
    zipPath = backup.zipPath

    const maxSize = 45 * 1024 * 1024
    if (backup.stat.size > maxSize) {
      await fs.remove(zipPath)
      return await react(conn, m, failed)
    }

    await conn.sendMessage(
      target,
      {
        document: await fs.readFile(zipPath),
        mimetype: "application/zip",
        fileName: backup.zipName,
        caption: `\`Backup ${backup.botName}\`\n- *File Name:* ${backup.zipName}\n- *File Size:* ${(backup.stat.size / 1024 / 1024).toFixed(2)} MB\n\n⎙ *${backup.date}*`
      },
      { quoted: global?.EventMsg || m }
    )

    await fs.remove(zipPath)
    await react(conn, m, success)
  } catch (err) {
    await fs.remove(zipPath).catch(() => null)
    throw err
  }
}

let handler = async (m, { conn, command, args }) => {
  let target

  if (command === "backup2") {
    target = m.chat
  } else if (args[0]) {
    const number = args[0] 
    if (!/^\d{8,15}$/.test(number)) {
      return m.reply("Nomor harus terdiri dari 8-15 digit angka")
    }
    target = `${number}@s.whatsapp.net`
  } else {
    target = `${global.Dev.number}@s.whatsapp.net`
  }

  await runBackup(m, conn, target)
}

handler.command = ["backup", "backup2"]
handler.tags = ["dev"]
handler.help = ["backup", "backup2"]
handler.dev = true

export default handler
