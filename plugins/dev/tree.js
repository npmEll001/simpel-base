import fs from "fs"
import path from "path"

const session = global.Bot?.sessionName || "session"
const dbName = global.Bot?.dataBase?.dataName || "database"

const IGNORE = [
  "node_modules",
  `${session}`,
  `${session}/**`,
  `${dbName}`,
  ".npm",
  ".cache",
  ".config"
]

function walk(dir, prefix = "", showDb = false) {
  let out = ""

  const items = fs.readdirSync(dir, { withFileTypes: true })
    .filter(v => {
      if (v.name === dbName) return showDb
      return !IGNORE.includes(v.name)
    })
    .filter(v => v.name !== "package-lock.json" && v.name !== "yarn.lock")
    .filter(v => !/^backup_bot_.*\.zip$/i.test(v.name))

  items.sort(
    (a, b) =>
      Number(b.isDirectory()) - Number(a.isDirectory()) ||
      a.name.localeCompare(b.name)
  )

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const last = i === items.length - 1

    if (item.isDirectory() && item.name === dbName) {
      if (!showDb) {
        out += prefix + (last ? "└─ " : "├─ ") + `${dbName} - PRIVATE\n`
        continue
      }
    }

    out += prefix + (last ? "└─ " : "├─ ") + item.name + (item.isDirectory() ? "/" : "") + "\n"

    if (item.isDirectory()) {
      out += walk(
        path.join(dir, item.name),
        prefix + (last ? "   " : "│  "),
        showDb
      )
    }
  }

  return out
}

const handler = async (m, { args }) => {
  const showDb = args[0] === "db"
  const root = process.cwd()
  const text = `./\n${walk(root, "", showDb)}`
  return m.reply(`\`\`\`\n${text}\n\`\`\``)
}

handler.command = ["tree"]
handler.tags = ["dev"]
handler.help = ["tree"]
handler.dev = true

export default handler