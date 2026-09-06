import fs from "fs"
import path from "path"

const PLUGIN_DIR = path.join(process.cwd(), "plugins")

function getPlugins(dir) {
  const categories = {}

  const folders = fs.readdirSync(dir, { withFileTypes: true })
    .filter(v => v.isDirectory())

  for (const folder of folders) {
    const folderPath = path.join(dir, folder.name)
    const files = fs.readdirSync(folderPath, { withFileTypes: true })
      .filter(v => v.isFile() && v.name.endsWith(".js"))
      .map(v => v.name)

    categories[folder.name] = files
  }

  return categories
}

let handler = async (m) => {
  const categories = getPlugins(PLUGIN_DIR)
  let text = "plugins/\n"
  const catEntries = Object.entries(categories)

  for (let i = 0; i < catEntries.length; i++) {
    const [cat, files] = catEntries[i]
    const lastCat = i === catEntries.length - 1

    text += (lastCat ? "└─ " : "├─ ") + `${cat}/ (${files.length})\n`

    for (let j = 0; j < files.length; j++) {
      const lastFile = j === files.length - 1
      text += (lastCat ? "   " : "│  ") + (lastFile ? "└─ " : "├─ ") + files[j] + "\n"
    }
  }

  const total = Object.values(categories).reduce((a, b) => a + b.length, 0)
  const totalFolders = Object.keys(categories).length
  text += `\nTotal: ${total} plugin, ${totalFolders} folder`

  return m.reply(`\`\`\`\n${text}\n\`\`\``)
}

handler.command = ["listplugin"]
handler.tags = ["dev"]
handler.help = ["listplugin"]
handler.dev = true

export default handler