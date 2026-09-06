import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { timeZone } from "../timeline/TimeZone.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function getDirs() {
  const db = global.Bot?.dataBase || {}
  const DB_DIR = path.join(process.cwd(), db.dataName || "database")
  return {
    group: path.join(DB_DIR, db.groupName || "group"),
    user: path.join(DB_DIR, db.userName || "user"),
    bot: path.join(DB_DIR, db.botName || "bot"),
  }
}

function ensureDirs() {
  const dirs = getDirs()
  for (const dir of Object.values(dirs)) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  }
  return dirs
}

function readJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null
    return JSON.parse(fs.readFileSync(filePath, "utf-8"))
  } catch {
    return null
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8")
}

const time = timeZone({ date: true, seconds: false })

function defaultGroup(groupId) {
  return {
    profile: {
      id: groupId,
      name: ""
    }, 
    mode: {
      AutoReaction: false,
      AutoAbsen: false,
      AutoWelcome: false,
      AutoIntro: false,
      AutoDetect: false,
      AutoGroup: false,
      AutoShalat: false,
      AutoMakan: false,
      AutoSticker: false,
      AutoLevelUpGc: false,
      AutoTotalMessage: false, 
      NoImg: false,
      NoVideo: false,
      NoGif: false,
      NoSticker: false,
      NoAudio: false,
      NoContact: false,
      NoTagSw: false,
      NoPolling: false,
      NoLocation: false,
      NoEvent: false,
      NoDocument: false,
      NoLinkWa: false,
      NoLinkAll: false,
      NoSpam: false,
      NoToxic: false,
      NoForward: false,
      ModeAdmin: false
    }, 
    timeline: {
      createdAt: time,
      updatedAt: time
    }
  }
}

function defaultUser(userNumber) {
  return {
    profile: {
      number: userNumber,
      name: ""
    },
    registration: {
      registered: false,
      order: 0,
      place: ""
    },
    timeline: {
      lastSeen: time,
      createdAt: time,
      updatedAt: time
    }
  }
}

function defaultBot(botNumber) {
  return {
    profile: {
      number: global.Bot?.number || "",
      name: global.Bot?.name || "",
    },
    registered: {
      total: 0
    },
    timeline: {
      lastSeen: time,
      createdAt: time,
      updatedAt: time
    }
  }
}

function groupPath(groupId) {
  return path.join(ensureDirs().group, `${groupId}.json`)
}

function userPath(userNumber) {
  const clean = userNumber.replace(/@.+$/, "").replace(/[^0-9]/g, "")
  return path.join(ensureDirs().user, `${clean}.json`)
}

function botPath(botNumber) {
  const clean = botNumber.replace(/@.+$/, "").replace(/[^0-9]/g, "")
  return path.join(ensureDirs().bot, `${clean}.json`)
}

export function getGroup(groupId) {
  const data = readJSON(groupPath(groupId))
  if (data) return data
  const fresh = defaultGroup(groupId)
  writeJSON(groupPath(groupId), fresh)
  return fresh
}

export function setGroup(groupId, updates = {}) {
  const current = getGroup(groupId)
  const merged = { ...current, ...updates }
  merged.timeline = { ...current.timeline, ...updates.timeline, updatedAt: timeZone({ date: true, seconds: false }) }
  writeJSON(groupPath(groupId), merged)
  return merged
}

export function updateGroup(groupId, key, value) {
  return setGroup(groupId, { [key]: value })
}

export function deleteGroup(groupId) {
  const p = groupPath(groupId)
  if (fs.existsSync(p)) fs.unlinkSync(p)
}

export function resetGroup(groupId) {
  const p = groupPath(groupId)
  if (fs.existsSync(p)) fs.unlinkSync(p)
  const fresh = defaultGroup(groupId)
  writeJSON(groupPath(groupId), fresh)
  return fresh
}

export function getAllGroups() {
  return fs.readdirSync(ensureDirs().group)
    .filter(f => f.endsWith(".json"))
    .map(f => readJSON(path.join(ensureDirs().group, f)))
    .filter(Boolean)
}

export function hasGroup(groupId) {
  return fs.existsSync(groupPath(groupId))
}

export function incrementGroup(groupId, field, amount = 1) {
  const group = getGroup(groupId)
  return setGroup(groupId, { [field]: (group[field] || 0) + amount })
}

export function setGroupCustom(groupId, key, value) {
  const group = getGroup(groupId)
  return setGroup(groupId, { custom: { ...group.custom, [key]: value } })
}

export function getUser(userNumber) {
  const data = readJSON(userPath(userNumber))
  if (data) return data
  const fresh = defaultUser(userNumber.replace(/@.+$/, "").replace(/[^0-9]/g, ""))
  writeJSON(userPath(userNumber), fresh)
  return fresh
}

export function setUser(userNumber, updates = {}) {
  const current = getUser(userNumber)
  const merged = { ...current, ...updates }
  merged.timeline = { ...current.timeline, ...updates.timeline, updatedAt: timeZone({ date: true, seconds: false }) }
  writeJSON(userPath(userNumber), merged)
  return merged
}

export function updateUser(userNumber, key, value) {
  return setUser(userNumber, { [key]: value })
}

export function deleteUser(userNumber) {
  const p = userPath(userNumber)
  if (fs.existsSync(p)) fs.unlinkSync(p)
}

export function resetUser(userNumber) {
  const p = userPath(userNumber)
  if (fs.existsSync(p)) fs.unlinkSync(p)
  const fresh = defaultUser(userNumber.replace(/@.+$/, "").replace(/[^0-9]/g, ""))
  writeJSON(userPath(userNumber), fresh)
  return fresh
}

export function getAllUsers() {
  return fs.readdirSync(ensureDirs().user)
    .filter(f => f.endsWith(".json"))
    .map(f => readJSON(path.join(ensureDirs().user, f)))
    .filter(Boolean)
}

export function hasUser(userNumber) {
  return fs.existsSync(userPath(userNumber))
}

export function incrementUser(userNumber, field, amount = 1) {
  const user = getUser(userNumber)
  return setUser(userNumber, { [field]: (user[field] || 0) + amount })
}

export function setUserCustom(userNumber, key, value) {
  const user = getUser(userNumber)
  return setUser(userNumber, { custom: { ...user.custom, [key]: value } })
}

export function getBot(botNumber) {
  const data = readJSON(botPath(botNumber))
  if (data) return data
  const fresh = defaultBot(botNumber.replace(/@.+$/, "").replace(/[^0-9]/g, ""))
  writeJSON(botPath(botNumber), fresh)
  return fresh
}

export function setBot(botNumber, updates = {}) {
  const current = getBot(botNumber)
  const merged = { ...current, ...updates }
  merged.timeline = { ...current.timeline, ...updates.timeline, updatedAt: timeZone({ date: true, seconds: false }) }
  writeJSON(botPath(botNumber), merged)
  return merged
}

export function updateBot(botNumber, key, value) {
  return setBot(botNumber, { [key]: value })
}

export function deleteBot(botNumber) {
  const p = botPath(botNumber)
  if (fs.existsSync(p)) fs.unlinkSync(p)
}

export function resetBot(botNumber) {
  const p = botPath(botNumber)
  if (fs.existsSync(p)) fs.unlinkSync(p)
  const fresh = defaultBot(botNumber.replace(/@.+$/, "").replace(/[^0-9]/g, ""))
  writeJSON(botPath(botNumber), fresh)
  return fresh
}

export function getAllBots() {
  return fs.readdirSync(ensureDirs().bot)
    .filter(f => f.endsWith(".json"))
    .map(f => readJSON(path.join(ensureDirs().bot, f)))
    .filter(Boolean)
}

export function hasBot(botNumber) {
  return fs.existsSync(botPath(botNumber))
}

export function incrementBot(botNumber, field, amount = 1) {
  const bot = getBot(botNumber)
  return setBot(botNumber, { [field]: (bot[field] || 0) + amount })
}

export function setBotCustom(botNumber, key, value) {
  const bot = getBot(botNumber)
  return setBot(botNumber, { custom: { ...bot.custom, [key]: value } })
}

export function clearDatabase() {
  const db = global.Bot?.dataBase || {}
  const DB_DIR = path.join(process.cwd(), db.dataName || "database")
  if (fs.existsSync(DB_DIR)) fs.rmSync(DB_DIR, { recursive: true, force: true })
}

export default {
  getGroup,
  setGroup,
  updateGroup,
  deleteGroup,
  resetGroup,
  getAllGroups,
  hasGroup,
  incrementGroup,
  setGroupCustom,

  getUser,
  setUser,
  updateUser,
  deleteUser,
  resetUser,
  getAllUsers,
  hasUser,
  incrementUser,
  setUserCustom,

  getBot,
  setBot,
  updateBot,
  deleteBot,
  resetBot,
  getAllBots,
  hasBot,
  incrementBot,
  setBotCustom,
  
  clearDatabase
}