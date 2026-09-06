import path from "path"
import fs from "fs"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PLUGIN_DIR = path.resolve(__dirname, "../../plugins")

let handler = async (m, { args }) => {
  if (!args[0]) return m.reply("Masukkan path plugin nya")

  const raw = args[0].replace(/\.js$/, "")
  const destPath = path.join(PLUGIN_DIR, `${raw}.js`)
  const relKey = path.relative(PLUGIN_DIR, destPath).replace(/\\/g, "/")

  if (!fs.existsSync(destPath)) {
    return m.reply(`Plugin \`${relKey}\` tidak ditemukan`)
  }

  const code = fs.readFileSync(destPath, "utf8")

  await m.reply(`${code}`)
}

handler.command = ["getplugin", "gp"]
handler.tags = ["dev"]
handler.help = ["getplugin", "gp"]
handler.dev = true

export default handler