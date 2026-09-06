import fs from "fs"
import path from "path"
import { pathToFileURL } from "url"

const handler = async (m, { }) => {
  const dir = "./plugins"
  const files = []

  const getFiles = (dirPath) => {
    for (const file of fs.readdirSync(dirPath)) {
      const full = path.join(dirPath, file)
      if (fs.statSync(full).isDirectory()) {
        getFiles(full)
      } else if (file.endsWith(".js")) {
        files.push(full)
      }
    }
  }

  getFiles(dir)

  const errors = []

  for (const file of files) {
    try {
      const fileUrl = pathToFileURL(path.resolve(file)).href
      await import(fileUrl + "?update=" + Date.now())
    } catch (e) {
      errors.push({ file, error: e.message })
    }
  }

  if (!errors.length) {
    return m.reply("Semua plugin aman, tidak ada error")
  }

  let txt = "Cek Error Plugin\n\n"
  for (const err of errors) {
    txt += `${err.file}\n${err.error}\n\n`
  }

  await m.reply(txt)
}

handler.command = ["cekerror"]
handler.tags = ["dev"]
handler.help = ["cekerror"]
handler.dev = true

export default handler