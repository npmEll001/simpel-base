//index.js
await import("./config.js")
import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  Browsers
} from "@whiskeysockets/baileys"
import { Boom } from "@hapi/boom"
import pino from "pino"
import chalk from "chalk"
const { loadPlugins, messageHandler } = await import("./handler.js")
import { timeZone, getBot } from "./library/exports.js"
import qrcode from "qrcode-terminal"

const BotName = global.Bot?.name || "Bot"
const SessionName = global.Bot?.sessionName || "session"
const SESSION_DIR = `./${SessionName}`
const PHONE_NUMBER = global.Bot?.number || "6285931911048"
const rawPairingCode = global.Bot?.pairingCode?.toUpperCase().slice(0, 8)
const PAIRING_CODE = rawPairingCode?.length === 8 ? rawPairingCode : undefined
const USE_QR = global.Bot?.useQR === true

const area = global.Time?.area || "WIB"
const getTime = () => timeZone({ seconds: false }) + " " + area

export let sock

const originalLog = console.log
const originalInfo = console.info
const originalWarn = console.warn

const shouldHide = (args) => {
  const str = args.map(a => {
    try { return typeof a === "string" ? a : JSON.stringify(a) } catch { return String(a) }
  }).join(" ")
  return (
    str.includes("Buffer") ||
    str.includes("SessionEntry") ||
    str.includes("chainKey") ||
    str.includes("registrationId") ||
    str.includes("ephemeralKeyPair") ||
    str.includes("Closing session") ||
    str.includes("Closing stale open session") ||
    str.includes("Opening session") ||
    str.includes("Removing old closed session")
  )
}

console.log = (...args) => { if (!shouldHide(args)) originalLog(...args) }
console.info = (...args) => { if (!shouldHide(args)) originalInfo(...args) }
console.warn = (...args) => { if (!shouldHide(args)) originalWarn(...args) }

await loadPlugins()

async function connectToWhatsApp() {

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)
  const { version } = await fetchLatestBaileysVersion()

  const silentLogger = pino({ level: "silent" })
  silentLogger.child = () => silentLogger

  sock = makeWASocket({
    version,
    logger: silentLogger,
    browser: Browsers.ubuntu("Chrome"),
    printQRInTerminal: USE_QR,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, silentLogger)
    },
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,
    markOnlineOnConnect: true
  })

  if (!sock.authState.creds.registered && !USE_QR) {
    const phoneNumber = PHONE_NUMBER.replace(/[^0-9]/g, "")
    setTimeout(async () => {
      const code = await sock.requestPairingCode(phoneNumber, PAIRING_CODE)
      console.log(
        chalk.black(chalk.bgCyan(" PAIRING CODE: ")),
        chalk.black(chalk.bgWhite(` ${code} `))
      )
    }, 3000)
  }

  sock.ev.on("messages.upsert", async (upsert) => {
    await messageHandler(upsert, sock)
  })

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update
    
    if (USE_QR && qr) {
      originalLog("\n")
      qrcode.generate(qr, { small: true }, (code) => originalLog(code))
      originalLog(chalk.cyan(`Scan QR code di atas untuk login.`))
    }

    if (connection === "open") {
      console.log(chalk.green(`${BotName} berhasil terhubung ke WhatsApp`))
      getBot(global.Bot?.number)
    }

    if (connection === "close") {
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode
      if (statusCode !== DisconnectReason.loggedOut) {
        console.log(chalk.hex("#FFA500")(`[${getTime()}] Koneksi terputus [menyambung ulang...]`))
        connectToWhatsApp()
      } else {
        console.log(chalk.red(`[${getTime()}] Logged out. Hapus folder ${SessionName} lalu login ulang.`))
      }
    }
  })

  sock.ev.on("creds.update", saveCreds)

  return sock
}

connectToWhatsApp()