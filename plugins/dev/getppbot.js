let handler = async (m, { conn }) => {
  const { success = "🟢" } = global.mapEmoji || {}
  const name = global.Bot?.name || "ChatBot"

  const ppUrl = await m.getProfilePicture(conn.user.id)

  if (!ppUrl) {
    return m.reply(`Foto profil ${name} tidak ditemukan`)
  }

  await m.replyImage({ url: ppUrl }, `${success} Foto profil ${name}`)
}

handler.command = ["getppbot"]
handler.tags = ["dev"]
handler.help = ["getppbot"]
handler.dev = true

export default handler