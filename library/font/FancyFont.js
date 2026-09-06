const FancyFont = (() => {
  const lower = [...`abcdefghijklmnopqrstuvwxyz`]
  const upper = [...`ABCDEFGHIJKLMNOPQRSTUVWXYZ`]
  const digits = [...`0123456789`]

  const fonts = {
    sansSoft: {
      lower: [...`𝖺𝖻𝖼𝖽𝖾𝖿𝗀𝗁𝗂𝗃𝗄𝗅𝗆𝗇𝗈𝗉𝗊𝗋𝗌𝗍𝗎𝗏𝗐𝗑𝗒𝗓`],
      upper: [...`𝖠𝖡𝖢𝖣𝖤𝖥𝖦𝖧𝖨𝖩𝖪𝖫𝖬𝖭𝖮𝖯𝖰𝖱𝖲𝖳𝖴𝖵𝖶𝖷𝖸𝖹`],
      digits: [...`𝟢𝟣𝟤𝟥𝟦𝟧𝟨𝟩𝟪𝟫`],
    },
    sansBold: {
      lower: [...`𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇`],
      upper: [...`𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭`],
      digits: [...`𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵`],
    },
  }

  const toStr = (text) => {
    if (text === null || text === undefined) return ""
    if (typeof text === "symbol") return text.description ?? ""
    return String(text)
  }

  const convert = (text, fontName) => {
    const font = fonts[fontName]
    if (!font) throw new Error(`Font "${fontName}" not found. Available: ${Object.keys(fonts).join(", ")}`)
    return [...toStr(text)].map(c => {
      const li = lower.indexOf(c), ui = upper.indexOf(c), di = digits.indexOf(c)
      if (li !== -1) return font.lower[li]
      if (ui !== -1) return font.upper[ui]
      if (di !== -1) return font.digits[di]
      return c
    }).join("")
  }

  return {
    convert,
    listFonts: () => Object.keys(fonts),
    preview: (sample = "Hello World 123") =>
      Object.keys(fonts).map(name => `[${name}] ${convert(sample, name)}`).join("\n"),
  }
})()

export default FancyFont