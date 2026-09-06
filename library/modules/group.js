import chalk from "chalk"
import { timeZone } from "../timeline/TimeZone.js"

const area = global.Time?.area || "WIB"
const getTime = () => timeZone({ seconds: false }) + " " + area

const GROUP_META_TTL = 24 * 60 * 60 * 1000

if (!global.groupMetadataCache) global.groupMetadataCache = new Map()

export const decodeJid = (jid) => {
  if (!jid) return jid
  if (/:\d+@/gi.test(jid)) {
    const d = jid.split(":")
    return (d[0] + "@" + d[1].split("@")[1]) || jid
  }
  return jid
}

export const normUser = (jid) => {
  const u = (decodeJid(jid) || "").split("@")[0]
  return u.replace(/[^0-9]/g, "")
}

export const sameUser = (a, b) => {
  if (!a || !b) return false
  const decA = decodeJid(a)
  const decB = decodeJid(b)
  if (decA === decB) return true
  const ua = normUser(decA)
  const ub = normUser(decB)
  return !!ua && !!ub && ua === ub
}

export async function getCachedGroupMetadata(conn, groupId, force = false) {
  if (
    groupId === "status@broadcast" ||
    groupId.endsWith("@broadcast") ||
    groupId.endsWith("@newsletter")
  ) return null

  const cachedMeta = global.groupMetadataCache.get(groupId)?.data
  if (cachedMeta && (cachedMeta.isCommunity || cachedMeta.isCommunityAnnounce)) return cachedMeta

  const now = Date.now()
  const entry = global.groupMetadataCache.get(groupId)

  if (!force && entry?.data && (now - entry.timestamp) < GROUP_META_TTL) {
    return entry.data
  }

  if (entry?.data && (now - entry.timestamp) >= GROUP_META_TTL) {
    const expiredName = entry.data?.subject || groupId
    console.log(chalk.cyan(`[${getTime()}] groupMetadataCache [${expiredName}] Expired Cache. [Memuat ulang...]`))
  }

  if (entry?.pendingPromise) {
    try { return await entry.pendingPromise } catch {}
  }

  const fetchPromise = conn.groupMetadata(groupId)
    .then(metadata => {
      const groupName = metadata?.subject || groupId
      global.groupMetadataCache.set(groupId, { data: metadata, timestamp: Date.now(), pendingPromise: null })
      console.log(chalk.green(`[${getTime()}] groupMetadataCache [${groupName}] Berhasil Diperbarui`))
      return metadata
    })
    .catch(async err => {
      const groupName = global.groupMetadataCache.get(groupId)?.data?.subject || groupId
      console.log(chalk.yellow(`[${getTime()}] groupMetadataCache [${groupName}] Gagal Diperbarui [Memuat ulang...]`))
      try {
        const retryMetadata = await conn.groupMetadata(groupId)
        const retryGroupName = retryMetadata?.subject || groupId
        global.groupMetadataCache.set(groupId, { data: retryMetadata, timestamp: Date.now(), pendingPromise: null })
        console.log(chalk.green(`[${getTime()}] groupMetadataCache [${retryGroupName}] Berhasil Diperbarui`))
        return retryMetadata
      } catch (retryErr) {
        const stale = global.groupMetadataCache.get(groupId)
        const staleName = stale?.data?.subject || groupId
        global.groupMetadataCache.set(groupId, { data: stale?.data || null, timestamp: stale?.timestamp || 0, pendingPromise: null })
        console.log(chalk.red(`[${getTime()}] groupMetadataCache [${staleName}] Gagal Diperbarui`))
        throw retryErr
      }
    })

  global.groupMetadataCache.set(groupId, { data: entry?.data || null, timestamp: entry?.timestamp || 0, pendingPromise: fetchPromise })
  return fetchPromise
}

export function invalidateGroupMetadataCache(groupId) {
  const entry = global.groupMetadataCache.get(groupId)
  if (!entry) return
  global.groupMetadataCache.set(groupId, {
    data: entry.data || null,
    timestamp: 0,
    pendingPromise: entry.pendingPromise || null
  })
}

global.getCachedGroupMetadata = getCachedGroupMetadata
global.invalidateGroupMetadataCache = invalidateGroupMetadataCache

export const getGroupParticipantData = async (conn, chat, sender) => {
  const groupMetadata = (await getCachedGroupMetadata(conn, chat).catch(() => null)) || {}
  const participants = groupMetadata?.participants || []

  const findPart = (targetJid) => {
    if (!targetJid) return null
    const target = decodeJid(targetJid)
    return participants.find((p) =>
      p.id === target || p.jid === target || p.lid === target ||
      sameUser(p.id, target) || sameUser(p.jid, target)
    ) || null
  }

  const userPart = findPart(sender)
  const botPart = findPart(conn.user?.id) || findPart(conn.user?.jid) || findPart(conn.user?.lid)

  const isAdmin = userPart?.admin === "admin" || userPart?.admin === "superadmin"
  const isBotAdmin = botPart?.admin === "admin" || botPart?.admin === "superadmin"

  return { groupMetadata, participants, userPart, botPart, isAdmin, isBotAdmin }
}