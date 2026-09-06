export function timeZone(options = {}) {
  const {
    zone = global.Time?.zone || "Asia/Jakarta",
    seconds = true,
    date = false,
    noTime = false,
    locale = "id-ID"
  } = options

  const formatOptions = { timeZone: zone }

  if (!noTime) {
    formatOptions.hour = "2-digit"
    formatOptions.minute = "2-digit"
    formatOptions.hour12 = false
    if (seconds) formatOptions.second = "2-digit"
  }

  if (date) {
    formatOptions.day = "numeric"
    formatOptions.month = "long"
    formatOptions.year = "numeric"
  }

  try {
    return new Intl.DateTimeFormat(locale, formatOptions)
      .format(new Date())
      .replace(" pukul ", " ")
  } catch {
    return "Timezone tidak valid"
  }
}