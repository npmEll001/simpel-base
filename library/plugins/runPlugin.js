import chalk from "chalk"
import { timeZone } from "../timeline/TimeZone.js"
import { readdirSync, statSync } from "fs"
import { fileURLToPath, pathToFileURL } from "url"
import path from "path"
import { watchPlugins } from "./hotReload.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PLUGIN_DIR = path.resolve(__dirname, "../../plugins")

const area = () => global.Time?.area || "WIB"
const getTime = () => timeZone({ seconds: false }) + " " + area()

const react = (conn, m, emoji) =>
  conn.sendMessage(m.chat, { react: { text: emoji, key: m.key } }).catch(() => {})

function getPluginFiles(dir) {
  let results = []
  for (const file of readdirSync(dir)) {
    const fullPath = path.join(dir, file)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      results.push(...getPluginFiles(fullPath))
    } else if (file.endsWith(".js")) {
      results.push(fullPath)
    }
  }
  return results
}

export async function loadPlugins(plugins) {
  const files = getPluginFiles(PLUGIN_DIR)
  let loaded = 0

  for (const fullPath of files) {
    try {
      const fileUrl = pathToFileURL(fullPath).href
      const mod = await import(fileUrl)
      const handler = mod.default
      if (typeof handler !== "function") continue
      const relative = path.relative(PLUGIN_DIR, fullPath)
      plugins[relative] = handler
      loaded++
    } catch (err) {
      console.error(chalk.red(`[PLUGIN ERROR] ${path.relative(PLUGIN_DIR, fullPath)}: ${err.message}`))
    }
  }

  console.log(chalk.cyan(`Berhasil menginstall ${loaded} plugin`))
  console.log(chalk.white.bgBlue(` [menghubungkan whatsapp...] `))
  watchPlugins(plugins)
}

function runWithTimeout(fn, ms) {
  const controller = new AbortController()
  const { signal } = controller

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort()
      reject(new Error("Timeout eksekusi plugin"))
    }, ms)

    Promise.resolve(fn(signal))
      .then(v => { clearTimeout(timer); resolve(v) })
      .catch(e => { clearTimeout(timer); reject(e) })
  })
}

async function notifyDev(conn, m, filename, err) {
  const devJid = `${global.Dev?.number || "6287710348394"}@s.whatsapp.net`
  const tag = `@${m.sender.split("@")[0]}`
  const chatName = m.isGroup
    ? (global.groupMetadataCache?.get(m.chat)?.data?.subject || m.chat)
    : tag

  const devMsg =
    `Plugin: ${filename}\n` +
    `Sender: ${tag}\n` +
    `Chat: ${chatName}\n\n` +
    `\`\`\`${err?.stack || err}\`\`\``

  await conn.sendMessage(devJid, { text: devMsg, mentions: [m.sender] }, { quoted: global?.EventMsg }).catch(() => {})
}

export async function runPlugin(handler, m, ctx, filename, timeout = 2 * 60 * 1000) {
  const { conn } = ctx
  const { failed, retry } = global.mapEmoji

  try {
    await runWithTimeout((signal) => handler(m, { ...ctx, signal }), timeout)

  } catch (err1) {
    console.error(chalk.yellow(`[${getTime()}] [PLUGIN RETRY] ${filename}:\n${err1?.stack || err1}`))
    await react(conn, m, retry)
    await m.reply("Terjadi kesalahan [memuat ulang...]").catch(() => {})

    try {
      await runWithTimeout((signal) => handler(m, { ...ctx, signal }), timeout)

    } catch (err2) {
      console.error(chalk.red(`[${getTime()}] [PLUGIN ERROR] ${filename}:\n${err2?.stack || err2}`))
      await react(conn, m, failed)
      await m.reply("Terjadi kesalahan, maaf atas ketidaknyamanannya. Kami akan segera memperbaikinya").catch(() => {})
      await notifyDev(conn, m, filename, err2)
    }
  }
}
