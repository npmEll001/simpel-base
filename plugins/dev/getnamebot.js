let handler = async (m, { conn }) => {
  const name = conn.user?.name || conn.user?.verifiedName || "Tidak diketahui"

  await m.reply(`Display name bot saat ini: *${name}*`)
}

handler.command = ["getnamebot"]
handler.tags = ["dev"]
handler.help = ["getnamebot"]
handler.dev = true

export default handler