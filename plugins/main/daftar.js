import { getUser,
         setUser,
         getAllUsers,
         getBot,
         setBot } from "../../library/exports.js"
import fetch from "node-fetch"
import sharp from "sharp"
import { readFileSync } from "fs"

const react = (conn, m, emoji) =>
  conn.sendMessage(m.chat, { react: { text: emoji, key: m.key } }).catch(() => {})

let handler = async (m, { conn, args, command }) => {
  const { success = "✅", failed = "🚫" } = global.mapEmoji || {}

  const name = args.join(" ").trim()
  const quoted = global?.EventMsg

  if (!name) {
    await conn.sendMessage(
      m.chat,
      { text: `Masukkan *nama* dengan caption [ \`${command}\` ]` },
      { quoted: m }
    )
    return react(conn, m, failed)
  }

  const tag = `@${m.sender.split("@")[0]}`
  const bot = global.Bot?.name || "ChatBot"
  const user = getUser(m.sender)
  const isRegistered = user?.registration?.registered
  
  const frames = ["⠋", "⠙", "⠹", "⠼", "⠴", "⠦", "⠧", "⠏"]
  const lastFrame = "⠿"

  const scanMsg = await conn.sendMessage(
    m.chat,
    { text: `${frames[0]} Memproses nama [ \`${name}\` ]`, mentions: [m.sender] },
    { quoted: quoted }
  )

  let i = 1
  await new Promise((resolve) => {
    const interval = setInterval(async () => {
      const isLast = i >= frames.length * 2
      const frame = isLast ? lastFrame : frames[i % frames.length]

      await conn.sendMessage(m.chat, {
        text: `${frame} Memproses nama [ \`${name}\` ]`,
        edit: scanMsg.key
      }, { quoted: quoted })

      i++
      if (isLast) {
        clearInterval(interval)
        resolve()
      }
    }, 300)
  })

  const reasons = []
  if (isRegistered) reasons.push("- kamu sudah terdaftar")
  
  const allUsers = getAllUsers()
  const nameTaken = allUsers.some(u => 
    u.profile?.name?.toLowerCase() === name.toLowerCase() &&
    u.profile?.number !== m.sender.replace(/@.+$/, "")
  )
  if (nameTaken) reasons.push(`- nama *${name}* sudah digunakan, masukkan nama baru`)
  if (name.length < 3 || name.length > 12) reasons.push("- nama harus berjumlah 3-12 karakter")
  if (/\s/.test(name)) reasons.push("- nama tidak boleh menggunakan spasi")
  if (/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/u.test(name)) reasons.push("- nama tidak boleh menggunakan emoji")

  if (reasons.length) {
    await conn.sendMessage(m.chat, {
      text: `Maaf, Kak ${tag}\n\`kamu tidak memenuhi syarat pendaftaran ${bot}\`\n${reasons[0]}`,
      mentions: [m.sender],
      edit: scanMsg.key
    }, { quoted: quoted })
    return react(conn, m, failed)
  }
  
  const place = m.isGroup
    ? (global.groupMetadataCache.get(m.chat)?.data?.subject || m.chat)
    : "personal chat"
  
  const botData = getBot(global.Bot?.number || "")
  const order = (botData?.registered?.total || 0) + 1

  setBot(global.Bot?.number || "", {
    registered: { total: order }
  })

  setUser(m.sender, {
    profile: { number: user.profile.number, name },
    registration: {
      registered: true,
      order,
      place
    }
  })

  await conn.sendMessage(m.chat, {
    text: `Congratulation, Kak ${tag}\n- kamu sekarang terdaftar dengan nama *${name}*`,
    mentions: [m.sender],
    edit: scanMsg.key
  }, { quoted: quoted })

  let thumbBuffer = null

  const ppUrl = await Promise.race([
    conn.profilePictureUrl(conn.user.id, "image"),
    new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 3000))
  ]).catch(() => null)

  if (ppUrl) {
    const res = await fetch(ppUrl, { redirect: "follow" })
    const ab = await res.arrayBuffer()
    const buf = Buffer.from(ab)
    if (buf.length > 0) {
      thumbBuffer = await sharp(buf)
        .resize(100, 100, { fit: "cover" })
        .jpeg({ quality: 60 })
        .toBuffer()
    }
  }

  let docBuffer = null
  const localBuf = readFileSync("./media/image.png")
  if (localBuf.length > 0) docBuffer = localBuf

  if (!thumbBuffer && docBuffer) {
    thumbBuffer = await sharp(docBuffer)
      .resize(100, 100, { fit: "cover" })
      .jpeg({ quality: 60 })
      .toBuffer()
  }

  await conn.sendMessage(m.chat , {
    document: docBuffer || Buffer.from([0x89, 0x50, 0x4E, 0x47]),
    mimetype: "image/png",
    fileName: `Selamat datang, Kak ${name}`,
    caption: `Ketik \`.menu\` untuk mulai menggunakan bot ${bot}`,
    mentions: [m.sender],
    ...(thumbBuffer ? { jpegThumbnail: thumbBuffer.toString("base64") } : {})
  }, { quoted: quoted })

  await react(conn, m, success)
}

handler.command = ["daftar"]
handler.tags = ["main"]
handler.help = ["daftar"]
handler.private = true

export default handler