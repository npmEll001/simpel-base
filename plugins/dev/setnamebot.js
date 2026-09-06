let handler = async (m, { conn, args }) => {
  const display = args.join(" ").trim()
  const { success = "🟢" } = global.mapEmoji || {}
  const name = global.Bot?.name || "ChatBot"
  
  if (!display) {
    return m.reply("Masukkan Display nama baru Bot") 
  }

  await conn.updateProfileName(display)
  await m.eventMsg(`${success} Display name ${name} berhasil diubah ke *${display}*`)
}

handler.command = ["setnamebot"]
handler.tags = ["dev"]
handler.help = ["setnamebot"]
handler.dev = true

export default handler