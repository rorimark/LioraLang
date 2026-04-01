const SQLITE_DATE_TIME_REGEXP =
  /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?$/;

const parseDeckCreatedAt = (value) => {
  if (!value && value !== 0) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    const numericDate = new Date(value);
    return Number.isNaN(numericDate.getTime()) ? null : numericDate;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  const sqliteMatch = SQLITE_DATE_TIME_REGEXP.exec(trimmedValue);

  if (sqliteMatch) {
    const [
      ,
      year,
      month,
      day,
      hour = "00",
      minute = "00",
      second = "00",
    ] = sqliteMatch;

    const utcTimestamp = Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    );

    const sqliteDate = new Date(utcTimestamp);
    return Number.isNaN(sqliteDate.getTime()) ? null : sqliteDate;
  }

  const defaultParsedDate = new Date(trimmedValue);
  return Number.isNaN(defaultParsedDate.getTime()) ? null : defaultParsedDate;
};

export const formatDeckCreatedAt = (value, fallback = "-") => {
  const parsedDate = parseDeckCreatedAt(value);

  if (!parsedDate) {
    return fallback;
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsedDate);
};

