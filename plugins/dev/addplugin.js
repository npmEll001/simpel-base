import path from "path"
import fs from "fs"
import { fileURLToPath } from "url"
import { reloadPlugin } from "../../library/exports.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PLUGIN_DIR = path.resolve(__dirname, "../../plugins")

function extractCode(text) {
  if (!text) return null
  const fenceMatch = text.match(/```(?:js|javascript)?\s*([\s\S]+?)```/i)
  if (fenceMatch) return fenceMatch[1].trim()
  const raw = text.trim()
  if (/\b(export|import|const|let|var|function|async|await)\b/.test(raw)) return raw
  return null
}

function resolveDest(args) {
  if (!args[0]) return null
  const raw = args[0].replace(/\.js$/, "")
  return path.join(PLUGIN_DIR, `${raw}.js`)
}

let handler = async (m, { args, plugins, command }) => {
  const isSave = command === "saveplugin" || command === "sp"

  const quoted = m.quoted
  if (!quoted) return m.reply("Reply code untuk menambahkan Plugins")

  const quotedText =
    quoted.text ||
    quoted.body ||
    quoted.message?.conversation ||
    quoted.message?.extendedTextMessage?.text ||
    ""

  const code = extractCode(quotedText)
  if (!code) return m.reply("Reply code untuk menambahkan Plugins")

  if (!args[0]) return m.reply("Masukkan path plugin nya")

  const destPath = resolveDest(args)
  const relKey = path.relative(PLUGIN_DIR, destPath).replace(/\\/g, "/")
  const exists = fs.existsSync(destPath)

  if (isSave && !exists) {
    return m.reply(`Plugin \`${relKey}\` tidak ditemukan\nGunakan \`${global.Bot?.prefix || "."}ap\` untuk membuat plugin baru`)
  }

  const statusLabel = exists ? "Overwrite" : "New"

  fs.mkdirSync(path.dirname(destPath), { recursive: true })
  fs.writeFileSync(destPath, code, "utf8")

  const result = await reloadPlugin(destPath, plugins)

  if (result === null) {
    fs.unlinkSync(destPath)
    return m.reply("Plugin gagal dimuat, file dihapus.")
  }

  const cmds = [result.command].flat().filter(Boolean)
  const cmdStr = cmds.length
    ? cmds.map(c => `\`${global.Bot?.prefix || "."}${c}\``).join(", ")
    : "_tidak ada command (middleware)_"

  await m.reply(`[ \`${statusLabel}\` ] Plugin berhasil dimuat\n- Path: ${relKey}\n- Command: ${cmdStr}`)
}

handler.command = ["addplugin", "ap", "saveplugin", "sp"]
handler.tags = ["dev"]
handler.help = ["addplugin", "ap", "saveplugin", "sp"]
handler.dev = true

export default handler
