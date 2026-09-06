import sharp from "sharp"
import { downloadMediaMessage } from "@whiskeysockets/baileys"

let handler = async (m, { conn, command }) => {
  const msg = m.quoted || m
  const mime = msg?.mime || ""
  const { success = "🟢" } = global.mapEmoji || {}
  const name = global.Bot?.name || "ChatBot"

  if (!mime.startsWith("image/")) {
    return m.reply(`Reply foto atau kirim foto dengan caption ${command}`)
  }

  const buffer = await downloadMediaMessage(
    { message: msg.message, key: msg.key },
    "buffer",
    {}
  )

  const { width, height } = await sharp(buffer).metadata()

  if (width !== height) {
    return m.reply("Foto harus menggunakan rasio 1:1")
  }

  await conn.updateProfilePicture(conn.user.id, buffer)
  await m.eventMsg(`${success} Foto profil ${name} berhasil diubah`)
}

handler.command = ["setppbot"]
handler.tags = ["dev"]
handler.help = ["setppbot"]
handler.dev = true

export default handler