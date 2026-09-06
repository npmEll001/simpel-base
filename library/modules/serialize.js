import {
  getContentType,
  normalizeMessageContent,
  extractMessageContent,
  jidNormalizedUser,
  downloadMediaMessage,
  generateWAMessageFromContent,
  getAggregateVotesInPollMessage,
  proto,
} from "@whiskeysockets/baileys"

export function serialize(msg, conn) {
  if (!msg || !msg.message) return msg

  const normalizedContent = normalizeMessageContent(msg.message)
  const type = getContentType(normalizedContent)
  const extractedContent = extractMessageContent(normalizedContent)
  const extractedType = getContentType(extractedContent)

  const isGroup = msg.key.remoteJid?.endsWith("@g.us")
  const isStatus = msg.key.remoteJid === "status@broadcast"
  const isBroadcast = msg.key.remoteJid?.endsWith("@broadcast") && !isStatus
  const chat = msg.key.remoteJid
  const sender = isGroup
    ? (msg.key.participantAlt || msg.key.participant || msg.participant || "")
    : (msg.key.remoteJidAlt  || msg.key.remoteJid)
  const fromMe = msg.key.fromMe

  const getBody = (content, ctype) => {
    if (!content || !ctype) return ""
    if (ctype === "conversation") return content.conversation || ""
    if (ctype === "extendedTextMessage") return content.extendedTextMessage?.text || ""
    if (ctype === "buttonsResponseMessage") return content.buttonsResponseMessage?.selectedButtonId || ""
    if (ctype === "listResponseMessage") return content.listResponseMessage?.singleSelectReply?.selectedRowId || ""
    if (ctype === "templateButtonReplyMessage") return content.templateButtonReplyMessage?.selectedId || ""
    if (ctype === "interactiveResponseMessage") {
      try {
        const paramsJson = content.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson
        if (paramsJson) return JSON.parse(paramsJson).id || ""
      } catch {}
      return content.interactiveResponseMessage?.body?.text || ""
    }
    if (ctype === "messageContextInfo") {
      return (
        content.buttonsResponseMessage?.selectedButtonId ||
        content.listResponseMessage?.singleSelectReply?.selectedRowId ||
        ""
      )
    }
    return content[ctype]?.text || content[ctype]?.caption || content[ctype]?.description || ""
  }

  const body = getBody(normalizedContent, type) || getBody(extractedContent, extractedType) || ""

  const quoted = (() => {
    const ctx =
      normalizedContent?.[type]?.contextInfo ||
      extractedContent?.[extractedType]?.contextInfo ||
      null
    if (!ctx?.quotedMessage) return null

    const qMsg    = ctx.quotedMessage
    const qType   = getContentType(qMsg)
    const qSender = ctx.participant || ctx.remoteJid || sender
    const qFromMe = jidNormalizedUser(qSender) === jidNormalizedUser(conn.user?.id)
    const qKey    = {
      remoteJid: chat,
      fromMe: qFromMe,
      id: ctx.stanzaId,
      participant: ctx.participant,
    }

    return {
      key: qKey,
      message: qMsg,
      type: qType,
      sender: qSender,
      fromMe: qFromMe,
      text:
        qMsg?.[qType]?.text ||
        qMsg?.[qType]?.caption ||
        qMsg?.conversation ||
        qMsg?.extendedTextMessage?.text ||
        "",
      mime: qMsg?.[qType]?.mimetype || "",

      download: () => downloadMediaMessage({ message: qMsg, key: ctx }, "buffer", {}),
      downloadStream: () => downloadMediaMessage({ message: qMsg, key: ctx }, "stream", {}),

      react: (emoji) =>
        conn.sendMessage(chat, { react: { text: emoji, key: qKey } }),

      reply: (text, mentions = []) =>
        conn.sendMessage(chat, { text, mentions }, { quoted: { key: qKey, message: qMsg } }),

      delete: () =>
        conn.sendMessage(chat, { delete: qKey }),

      forward: (jid, forceForward = false) =>
        conn.sendMessage(jid, { forward: { key: qKey, message: qMsg }, force: forceForward }),
    }
  })()

  const mentionedJid =
    normalizedContent?.[type]?.contextInfo?.mentionedJid ||
    extractedContent?.[extractedType]?.contextInfo?.mentionedJid ||
    []

  const mediaTypes = [
    "imageMessage", "videoMessage", "audioMessage",
    "documentMessage", "stickerMessage", "ptvMessage",
  ]
  const isMedia = mediaTypes.includes(type) || mediaTypes.includes(extractedType)
  const mediaType = mediaTypes.includes(extractedType) ? extractedType : type
  const mime =
    normalizedContent?.[type]?.mimetype ||
    extractedContent?.[extractedType]?.mimetype ||
    ""

  const isPoll = type === "pollCreationMessage" || type === "pollCreationMessageV2" || type === "pollCreationMessageV3"
  const isViewOnce  = !!(msg.message?.viewOnceMessage || msg.message?.viewOnceMessageV2 || msg.message?.viewOnceMessageV2Extension)
  const isEphemeral = !!(msg.message?.ephemeralMessage)
  const isEvent = type === "eventMessage"
  const isLocation = type === "locationMessage" || type === "liveLocationMessage"
  const isContact = type === "contactMessage" || type === "contactsArrayMessage"
  const isReaction = type === "reactionMessage"
  const isEdited = !!(msg.message?.editedMessage)

  const timestamp = typeof msg.messageTimestamp === "object"
    ? msg.messageTimestamp?.toNumber?.() ?? Number(msg.messageTimestamp)
    : Number(msg.messageTimestamp ?? 0)

  const getDevice = (id = "") => {
    if (id.startsWith("3EB")) return "web"
    if (id.startsWith("3AC")) return "ios"
    if (id.startsWith("3A"))  return "android"
    return "unknown"
  }
  const device = getDevice(msg.key.id)

  const _sendInteractive = ({ body: bodyText = "", footer = "", header = {}, buttons = [], quoted: q } = {}) => {
    const built = generateWAMessageFromContent(chat, {
      viewOnceMessage: {
        message: {
          messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
          interactiveMessage: proto.Message.InteractiveMessage.create({
            body:   proto.Message.InteractiveMessage.Body.create({ text: bodyText }),
            footer: proto.Message.InteractiveMessage.Footer.create({ text: footer }),
            header: proto.Message.InteractiveMessage.Header.create({
              title: header.title || "",
              subtitle: header.subtitle || "",
              hasMediaAttachment: false,
            }),
            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({ buttons }),
          }),
        },
      },
    }, { quoted: q ?? msg })
    return conn.relayMessage(chat, built.message, { messageId: built.key.id })
  }

  const _sendInteractiveMedia = async ({ media, mediaType: mType = "image", caption = "", title = "", subtitle = "", footer = "", buttons = [], quoted: q } = {}) => {
    const mediaMsg = await conn.prepareWAMessageMedia(
      { [mType]: media },
      { upload: conn.waUploadToServer }
    )
    const headerProto = proto.Message.InteractiveMessage.Header.create({
      title,
      subtitle,
      hasMediaAttachment: true,
      ...mediaMsg,
    })
    const built = generateWAMessageFromContent(chat, {
      viewOnceMessage: {
        message: {
          messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
          interactiveMessage: proto.Message.InteractiveMessage.create({
            body:   proto.Message.InteractiveMessage.Body.create({ text: caption }),
            footer: proto.Message.InteractiveMessage.Footer.create({ text: footer }),
            header: headerProto,
            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({ buttons }),
          }),
        },
      },
    }, { quoted: q ?? msg })
    return conn.relayMessage(chat, built.message, { messageId: built.key.id })
  }

  return Object.assign(msg, {
    content: normalizedContent,
    extractedContent,
    type,
    body,
    text: body,

    id: msg.key.id,
    chat,
    sender: jidNormalizedUser(sender),
    pushName: msg.pushName || "",
    fromMe,
    device,

    isGroup,
    isPrivate: !isGroup && !isStatus && !isBroadcast,
    isStatus,
    isBroadcast,

    isMedia,
    mediaType,
    mime,
    isPoll,
    isViewOnce,
    isEphemeral,
    isEvent,
    isLocation,
    isContact,
    isReaction,
    isEdited,

    quoted,
    mentionedJid,
    timestamp,

    download: () => downloadMediaMessage(msg, "buffer", {}),
    downloadStream: () => downloadMediaMessage(msg, "stream", {}),

    reply: (text, mentions = []) =>
      conn.sendMessage(chat, { text, mentions }, { quoted: msg }),

    eventMsg: (text, mentions = []) =>
      conn.sendMessage(chat, { text, mentions }, { quoted: global.EventMsg ?? null }),

    send: (text, mentions = []) =>
      conn.sendMessage(chat, { text, mentions }),

    sendImage: (image, caption = "", mentions = []) =>
      conn.sendMessage(chat, { image, caption, mentions }, { quoted: msg }),

    sendVideo: (video, caption = "", gifPlayback = false, mentions = []) =>
      conn.sendMessage(chat, { video, caption, gifPlayback, mentions }, { quoted: msg }),

    sendAudio: (audio, ptt = false) =>
      conn.sendMessage(chat, { audio, ptt, mimetype: ptt ? "audio/ogg; codecs=opus" : "audio/mp4" }),

    sendDocument: (document, mimetype, fileName, caption = "") =>
      conn.sendMessage(chat, { document, mimetype, fileName, caption }, { quoted: msg }),

    sendSticker: (sticker) =>
      conn.sendMessage(chat, { sticker }),

    sendLocation: (degreesLatitude, degreesLongitude, name = "") =>
      conn.sendMessage(chat, { location: { degreesLatitude, degreesLongitude, name } }),

    sendContact: (jid, displayName, phoneNumber) => {
      const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${displayName}\nTEL;type=CELL;type=VOICE;waid=${phoneNumber}:+${phoneNumber}\nEND:VCARD`
      return conn.sendMessage(chat, { contacts: { displayName, contacts: [{ vcard }] } })
    },

    sendEphemeral: (text, ephemeralExpiration = 604800) =>
      conn.sendMessage(chat, { text }, { ephemeralExpiration }),

    sendQuickReply: (bodyText, footer = "", buttons = [], header = {}) =>
      _sendInteractive({
        body: bodyText,
        footer,
        header,
        buttons: buttons.map(({ display_text, id }) => ({
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({ display_text, id }),
        })),
      }),

    sendUrlButtons: (bodyText, footer = "", buttons = [], header = {}) =>
      _sendInteractive({
        body: bodyText,
        footer,
        header,
        buttons: buttons.map(({ display_text, url }) => ({
          name: "cta_url",
          buttonParamsJson: JSON.stringify({ display_text, url, merchant_url: url }),
        })),
      }),

    sendCopyButton: (bodyText, footer = "", buttons = [], header = {}) =>
      _sendInteractive({
        body: bodyText,
        footer,
        header,
        buttons: buttons.map(({ display_text, copy_code, id }) => ({
          name: "cta_copy",
          buttonParamsJson: JSON.stringify({ display_text, id, copy_code }),
        })),
      }),

    sendCallButton: (bodyText, footer = "", buttons = [], header = {}) =>
      _sendInteractive({
        body: bodyText,
        footer,
        header,
        buttons: buttons.map(({ display_text, phone_number }) => ({
          name: "cta_call",
          buttonParamsJson: JSON.stringify({ display_text, phone_number }),
        })),
      }),

    sendList: (bodyText, footer = "", buttonText = "Pilih", sections = [], header = {}) =>
      _sendInteractive({
        body: bodyText,
        footer,
        header,
        buttons: [{
          name: "single_select",
          buttonParamsJson: JSON.stringify({ title: buttonText, sections }),
        }],
      }),

    sendMixedButtons: (bodyText, footer = "", buttons = [], header = {}) =>
      _sendInteractive({ body: bodyText, footer, header, buttons }),

    sendImageButtons: (image, caption = "", footer = "", buttons = [], header = {}) =>
      _sendInteractiveMedia({
        media: image,
        mediaType: "image",
        caption,
        footer,
        title: header.title || "",
        subtitle: header.subtitle || "",
        buttons: buttons.map(({ display_text, id }) => ({
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({ display_text, id }),
        })),
      }),

    sendVideoButtons: (video, caption = "", footer = "", buttons = [], header = {}) =>
      _sendInteractiveMedia({
        media: video,
        mediaType: "video",
        caption,
        footer,
        title: header.title || "",
        subtitle: header.subtitle || "",
        buttons: buttons.map(({ display_text, id }) => ({
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({ display_text, id }),
        })),
      }),

    sendPoll: (name, values = [], selectableCount = 1) =>
      conn.sendMessage(chat, { poll: { name, values, selectableCount } }),

    getPollVotes: (pollCreationMsg, pollUpdates) =>
      getAggregateVotesInPollMessage({ message: pollCreationMsg, pollUpdates }),

    react: (emoji) =>
      conn.sendMessage(chat, { react: { text: emoji, key: msg.key } }),

    forward: (jid, forceForward = false) =>
      conn.sendMessage(jid, { forward: msg, force: forceForward }),

    delete: () =>
      conn.sendMessage(chat, { delete: msg.key }),

    edit: (text) =>
      conn.sendMessage(chat, { text, edit: msg.key }),

    pin: (duration = 604800) =>
      conn.sendMessage(chat, { pin: { type: duration > 0 ? 1 : 0, time: duration, key: msg.key } }),

    read: () =>
      conn.readMessages([msg.key]),

    presence: (status = "composing") =>
      conn.sendPresenceUpdate(status, chat),

    star: (star = true) =>
      conn.chatModify({ star: { messages: [{ id: msg.key.id, fromMe }], star } }, chat),

    kick: (participants) =>
      conn.groupParticipantsUpdate(chat, participants, "remove"),

    add: (participants) =>
      conn.groupParticipantsUpdate(chat, participants, "add"),

    promote: (participants) =>
      conn.groupParticipantsUpdate(chat, participants, "promote"),

    demote: (participants) =>
      conn.groupParticipantsUpdate(chat, participants, "demote"),

    groupMetadata: () =>
      conn.groupMetadata(chat),

    groupUpdateSubject: (subject) =>
      conn.groupUpdateSubject(chat, subject),

    groupUpdateDescription: (description) =>
      conn.groupUpdateDescription(chat, description),

    groupSetting: (setting) =>
      conn.groupSettingUpdate(chat, setting),

    groupEphemeral: (duration = 604800) =>
      conn.groupToggleEphemeral(chat, duration),

    groupInviteCode: () =>
      conn.groupInviteCode(chat),

    groupRevokeInvite: () =>
      conn.groupRevokeInvite(chat),

    groupLeave: () =>
      conn.groupLeave(chat),

    onWhatsApp: (jid) =>
      conn.onWhatsApp(jid),

    senderProfilePic: (type = "preview") =>
      conn.profilePictureUrl(jidNormalizedUser(sender), type),

    profilePic: (jid, type = "preview") =>
      conn.profilePictureUrl(jid, type),

    fetchStatus: (jid) =>
      conn.fetchStatus(jid),

    presenceSubscribe: (jid) =>
      conn.presenceSubscribe(jid),
  })
}
