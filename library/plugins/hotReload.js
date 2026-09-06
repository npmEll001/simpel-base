import fs from "fs"
import path from "path"
import { fileURLToPath, pathToFileURL } from "url"
import chalk from "chalk"
import { timeZone } from "../timeline/TimeZone.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PLUGIN_DIR = path.resolve(__dirname, "../plugins")
const area = () => global.Time?.area || "WIB"
const getTime = () => timeZone({ seconds: false }) + " " + area()
const relName = (fullPath) => path.relative(PLUGIN_DIR, fullPath)
const bust = () => `?t=${Date.now()}`

async function loadFile(fullPath, plugins) {
  const name = relName(fullPath)
  const fileUrl = pathToFileURL(fullPath).href

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const mod = await import(`${fileUrl}${bust()}`)
      const handler = mod.default

      if (typeof handler !== "function") return null

      plugins[name] = handler
      return handler
    } catch (err) {
      if (attempt === 1) {
        console.log(chalk.yellow(`[${getTime()}] Gagal memuat ${name} [memuat ulang...]`))
        await new Promise(r => setTimeout(r, 500))
      } else {
        console.log(chalk.red(`[${getTime()}] Terjadi kesalahan saat memuat ulang ${name}\n${err}`))
        return null
      }
    }
  }
}

function unloadFile(fullPath, plugins) {
  const name = relName(fullPath)
  if (name in plugins) delete plugins[name]
}

const debounceMap = new Map()
function debounce(key, fn, delay = 300) {
  if (debounceMap.has(key)) clearTimeout(debounceMap.get(key))
  debounceMap.set(key, setTimeout(() => {
    debounceMap.delete(key)
    fn()
  }, delay))
}

export function watchPlugins(plugins) {
  fs.watch(PLUGIN_DIR, { recursive: true }, (event, filename) => {
    if (!filename || !filename.endsWith(".js")) return

    const fullPath = path.join(PLUGIN_DIR, filename)

    debounce(fullPath, async () => {
      const exists = fs.existsSync(fullPath)
      const name = relName(fullPath)

      if (!exists) {
        unloadFile(fullPath, plugins)
        console.log(chalk.red(`[${getTime()}] File ${name} dihapus`))
        return
      }

      const isNew = !(name in plugins)

      if (isNew) {
        console.log(chalk.cyan(`[${getTime()}] File ${name} telah ditambahkan [memuat...]`))
      } else {
        console.log(chalk.cyan(`[${getTime()}] File ${name} telah diperbarui [memuat ulang...]`))
      }

      const result = await loadFile(fullPath, plugins)
      if (result !== null) {
        console.log(chalk.green(`[${getTime()}] Berhasil memuat File ${name}`))
      }
    })
  })

}

export async function reloadPlugin(fullPath, plugins) {
  const name = relName(fullPath)
  const isNew = !(name in plugins)

  console.log(chalk.cyan(`[${getTime()}] File ${name} telah ${isNew ? "ditambahkan" : "diperbarui"} [memuat...]`))

  const result = await loadFile(fullPath, plugins)
  if (result !== null) {
    console.log(chalk.green(`[${getTime()}] Berhasil memuat file ${name}`))
  }

  return result
}