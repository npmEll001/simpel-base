import path from "path"
import { fileURLToPath } from "url"
import { exec } from "child_process"
import chalk from "chalk"
import { serialize, timeZone, runPlugin, getUser,
         getCachedGroupMetadata, getGroupParticipantData } from "./library/exports.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const plugins = {}

export async function loadPlugins() {
  const { loadPlugins: _load } = await import("./library/exports.js")
  await _load(plugins)
}

function runCommand(cmd) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve("TimeOut, coba lagi"), 5000)
    exec(cmd, { cwd: __dirname }, (err, stdout, stderr) => {
      clearTimeout(timeout)
      resolve(stdout?.trim() || stderr?.trim() || "(tidak ada output)")
    })
  })
}

const area = global.Time?.area || "WIB"
const getTime = () => timeZone({ seconds: false }) + " " + area

export async function messageHandler(upsert, conn) {
  const { messages, type } = upsert
  if (type !== "notify") return

  for (const rawMsg of messages) {
    if (!rawMsg.message) continue

    const m = serialize(rawMsg, conn)

    if (m.fromMe) continue
    if (m.isStatus || m.isBroadcast) continue
    if (
      !m.chat.endsWith("@g.us") &&
      !m.chat.endsWith("@s.whatsapp.net") &&
      !m.chat.endsWith("@lid")
    ) continue

    if (m.isGroup) {
      const meta = await getCachedGroupMetadata(conn, m.chat).catch(() => null)
      if (meta?.isCommunity || meta?.isCommunityAnnounce) continue
    }

    const prefix = global.Bot?.prefix || "."

    const body = m.body
    if (!body && !m.isMedia && !m.isLocation && !m.isContact && !m.isReaction) continue

    const isDev = m.sender?.replace(/[^0-9]/g, "") === global.Dev?.number || m.fromMe

    if (body.startsWith("$ ") && isDev) {
      const cmd = body.slice(2).trim()
      if (!cmd) continue
      console.log(chalk.cyan(`[${getTime()}] [TERMINAL] ${cmd}`))
      const output = await runCommand(cmd)
      await m.reply(`\`\`\`\n$ ${cmd}\n\n${output}\n\`\`\``)
      continue
    }

    const isCmd = body.startsWith(prefix)
    const args  = body.slice(prefix.length).trim().split(/\s+/)
    const command = isCmd ? args.shift().toLowerCase() : ""

    const groupData = m.isGroup
      ? await getGroupParticipantData(conn, m.chat, m.sender)
      : { isAdmin: false, isBotAdmin: false, groupMetadata: null, participants: [] }

    const { isAdmin, isBotAdmin, groupMetadata, participants } = groupData

    const ctx = {
      conn, args, command, prefix,
      isGroup: m.isGroup, isDev,
      isAdmin, isBotAdmin,
      groupMetadata, participants,
      plugins,
    }

    for (const [filename, handler] of Object.entries(plugins)) {
      try {
        const cmds = [handler.command].flat().filter(Boolean)
        if (cmds.length > 0) {
          if (!isCmd) continue
          if (!cmds.includes(command)) continue
        }

        const tag     = `@${m.sender.split("@")[0]}`
        const subject = `Kak ${tag}\n`

        if (handler.group && !m.isGroup && !isDev) {
          await m.eventMsg(`${subject}- fitur [ \`${prefix + command}\` ] hanya bisa di akses di dalam Grup`, [m.sender])
          continue
        }
        if (handler.private && m.isGroup && !isDev) {
          await m.eventMsg(`${subject}- fitur [ \`${prefix + command}\` ] hanya bisa di akses di Chat Pribadi`, [m.sender])
          continue
        }
        if (handler.dev && !isDev) {
          await m.eventMsg(`${subject}- fitur [ \`${prefix + command}\` ] hanya bisa di akses oleh Developer`, [m.sender])
          continue
        }
        if (handler.admin && !isAdmin && !isDev) {
          await m.eventMsg(`${subject}- fitur [ \`${prefix + command}\` ] hanya bisa di akses oleh Admin Grup`, [m.sender])
          continue
        }
        if (handler.botAdmin && !isBotAdmin && !isDev) {
          await m.eventMsg(`${subject}- fitur [ \`${prefix + command}\` ] hanya bisa di akses jika Bot menjadi Admin Grup`, [m.sender])
          continue
        }
        if (handler.register && !isDev) {
          const user = getUser(m.sender)
          if (!user?.registration?.registered) {
            await m.eventMsg(`${subject}- kamu belum terdaftar, ketik \`${prefix}daftar\` untuk mendaftar`, [m.sender])
            continue
          }
        }

        await runPlugin(handler, m, ctx, filename)

      } catch (outerErr) {
        console.error(chalk.red(`[${getTime()}] [PLUGIN RUN ERROR] ${filename}: ${outerErr?.message}`))
      }
    }
  }
}
