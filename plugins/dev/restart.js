let handler = async (m) => {
  await m.reply("Menjalankan ulang...")

  setTimeout(() => {
    process.exit(0)
  }, 1500)
}

handler.command = ["restart"]
handler.tags = ["dev"]
handler.help = ["restart"]
handler.dev = true

export default handler