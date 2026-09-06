import { exec } from "child_process"

let handler = async (m, { args }) => {
  if (!args[0]) {
    return m.reply("Masukkan nama package untuk diinstall")
  }

  if (!/^[a-z0-9@._\-\/]+$/i.test(args)) {
    return m.reply("Nama package tidak valid")
  }

  await m.reply(`Menginstall package *${args}*...`)

  exec(`npm install ${args}`, (err, stdout) => {
    m.reply(`Berhasil install *${args}*`)
    console.log(stdout)
  })
}

handler.command = ["install"]
handler.tags = ["dev"]
handler.help = ["install"]
handler.dev = true

export default handler