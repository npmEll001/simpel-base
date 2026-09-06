let handler = async (m, { args, plugins }) => {
  if (!args[0]) {
    return m.reply("Masukkan nama command plugin yang mau dicari")
  }

  const input = args[0].toLowerCase()
  const found = []

  for (const name in plugins) {
    const plugin = plugins[name]
    if (!plugin || plugin.disabled) continue

    const cmd = plugin.command
    let match = false

    if (Array.isArray(cmd)) {
      match = cmd.includes(input)
    } else if (cmd instanceof RegExp) {
      match = cmd.test(input)
    } else if (typeof cmd === "string") {
      match = cmd === input
    }

    if (match) found.push(name)
  }

  if (found.length === 0) {
    return m.reply(`Plugin untuk command *${input}* tidak ditemukan`)
  }

  let text = `plugins/\n`

  for (let i = 0; i < found.length; i++) {
    const last = i === found.length - 1
    const parts = found[i].split("/")
    const folder = parts[0]
    const file = parts[1]

    text += (last ? "└─ " : "├─ ") + `${folder}/\n`
    text += (last ? "    " : "│   ") + `└─ ${file}\n`
  }

  await m.reply(`\`\`\`\n${text}\n\`\`\``)
}

handler.command = ["findplugin", "fp"]
handler.tags = ["dev"]
handler.help = ["findplugin"]
handler.dev = true

export default handler