import { exec } from "child_process"

let handler = async (m, { args }) => {
  if (!args[0]) {
    return m.reply("Masukkan nama package untuk dihapus")
  }

  await m.reply(`Menghapus package *${args}*...`)

  exec(`npm uninstall ${args}`, (err, stdout) => {
    m.reply(`Berhasil mengahpus package *${args}*`)
    console.log(stdout)
  })
}

handler.command = ["uninstall"]
handler.tags = ["dev"]
handler.help = ["uninstall"]
handler.dev = true

export default handler