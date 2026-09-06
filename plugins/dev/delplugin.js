import path from "path"
import fs from "fs"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PLUGIN_DIR = path.resolve(__dirname, "../../plugins")

function resolveDest(args) {
  if (!args[0]) return null
  const raw = args[0].replace(/\.js$/, "")
  return path.join(PLUGIN_DIR, `${raw}.js`)
}

function removeEmptyDirs(dir) {
  if (dir === PLUGIN_DIR) return
  const items = fs.readdirSync(dir)
  if (items.length === 0) {
    fs.rmdirSync(dir)
    removeEmptyDirs(path.dirname(dir))
  }
}

let handler = async (m, { args, plugins }) => {
  if (!args[0]) return m.reply("Masukkan path plugin yang ingin dihapus")

  const destPath = resolveDest(args)
  const relKey = path.relative(PLUGIN_DIR, destPath).replace(/\\/g, "/")

  if (!fs.existsSync(destPath)) {
    return m.reply(`Plugin \`${relKey}\` tidak ditemukan`)
  }

  fs.unlinkSync(destPath)
  delete plugins[relKey]

  removeEmptyDirs(path.dirname(destPath))

  await m.reply(`[ \`Deleted\` ] Plugin berhasil dihapus\n- Path: ${relKey}`)
}

handler.command = ["delplugin", "dp"]
handler.tags = ["dev"]
handler.help = ["delplugin", "dp"]
handler.dev = true

export default handler