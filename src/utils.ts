import {
  formatISO9075 as dateFnsFormatISO9075,
  isDate,
  isValid,
  parse,
} from "date-fns";
import { v1 as uuidv1 } from "uuid";

export function isValidDate(value: any): value is Date {
  return isDate(value) && isValid(value);
}

const ISO9075_FORMAT = "yyyy-MM-dd HH:mm:ss";

type ParseISO9075Option = {
  utc?: boolean,
  fractionDelimiter?: "." | string,
  fractionalSecondDigits?: number,
};

/**
 * Create or set a Date that its milliseconds is 0.
 * @param {Date} [date] Optional. The date to be used, else new Date will be created.
 * @returns {Date} The date with 0 milliseconds.
 */
export function createDateZeroizeMs(date?: Date): Date {
  const d = date ? new Date(date.getTime()) : new Date();
  d.setMilliseconds(0);
  return d;
};

export function parseISO9075(datetime: string | Date, opt?: ParseISO9075Option): Date;
export function parseISO9075(datetime?: string | Date | null, opt?: ParseISO9075Option): Date | null;
export function parseISO9075(datetime?: string | Date | null, opt?: ParseISO9075Option): Date | null {
  if (isValidDate(datetime)) {
    return datetime;
  }
  else if (datetime) {
    const milliseconds_format = opt?.fractionalSecondDigits ? "".padStart(opt.fractionalSecondDigits, "XXX") : "";
    const iso9075_format = `${ISO9075_FORMAT}${opt?.fractionalSecondDigits ? opt?.fractionDelimiter ? opt.fractionDelimiter : "." : ""}${milliseconds_format}`;
    if (opt?.utc) {
      return parseISO9075UtcToLocal(datetime, iso9075_format);
    }
    else {
      return parse(datetime, iso9075_format, new Date());
    }
  }
  else {
    return null;
  }
};

export function formatISO9075(datetime: string | Date, utc?: boolean): string;
export function formatISO9075(datetime?: string | Date | null, utc?: boolean): string | null;

/**
 * TODO: support milliseconds.
 */
export function formatISO9075(datetime?: string | Date | null, utc?: boolean): string | null {
  if (isValidDate(datetime)) {
    return dateFnsFormatISO9075(utc ? zonedTimeToUtc(datetime) : datetime);
  }
  else if (datetime) {
    return datetime;
  }
  else {
    return null;
  }
};

/**
 * Generate a Date that use the UTC of the origin date as local.
 * Then its real UTC, getISOString() change also, according to its local date.
 * This useful for library like date-fns that use the local datetime to do
 * convertion but you actually want it to use UTC datetime.
 * @see {@link https://stackoverflow.com/a/68567329 | Source}
 * @see {@link https://github.com/marnusw/date-fns-tz#zonedtimetoutc | Alternative}
 */
export function zonedTimeToUtc(origin: Date) {
  const utc = new Intl.DateTimeFormat('en', {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3, // milliseconds, https://stackoverflow.com/a/65595011
    hour12: false,
    timeZone: "UTC",
  })
  .formatToParts(origin)
  .reduce((instance, part) => {
    switch (part.type) {
      case "year":
        instance.setFullYear(Number(part.value));
        break;
      case "month":
        instance.setMonth(Number(part.value) - 1);
        break;
      case "day":
        instance.setDate(Number(part.value));
        break;
      case "hour":
        instance.setHours(Number(part.value));
        break;
      case "minute":
        instance.setMinutes(Number(part.value));
        break;
      case "second":
        instance.setSeconds(Number(part.value));
        break;
      case "fractionalSecond":
        instance.setMilliseconds(Number(part.value));
        break;
    }
    return instance;
  }, new Date());
  return utc;
};

/**
 * Similar to what utcToZonedTime(date: Date): Date are trying to do.
 * @see {@link https://stackoverflow.com/a/40768745 | source} and {@link https://date-fns.org/v2.30.0/docs/parse | date-fns.parse}
 * Be careful the format must be exact, if not will result NaN. For example, the input contain '.000Z', but the format only '.SSS'.
 */
export function parseISO9075UtcToLocal(origin: string, format?: string): Date {
  return parse(`${origin}Z`, `${format ?? ISO9075_FORMAT}X`, new Date());
}

// https://github.com/odo-network/binary-uuid/blob/master/src/binary-uuid.ts
export function fromBinaryUUID(buf: Buffer): string {
  return [
    buf.toString('hex', 4, 8),
    buf.toString('hex', 2, 4),
    buf.toString('hex', 0, 2),
    buf.toString('hex', 8, 10),
    buf.toString('hex', 10, 16),
  ].join('-');
}

export function toBinaryUUID(uuid: string): Buffer {
  const buf = Buffer.from(uuid.replace(/-/g, ''), 'hex');
  return Buffer.concat([
    buf.subarray (6, 8),
    buf.subarray (4, 6),
    buf.subarray (0, 4),
    buf.subarray (8, 16),
  ]);
}

export function createBinaryUUID(): { uuid: string; buffer: Buffer } {
  const uuid = uuidv1();
  return Object.assign(Object.create({ toString: () => uuid }), {
    uuid,
    buffer: toBinaryUUID(uuid),
  });
}

export function uuidv1ToBinary(uuid: string): Buffer;
export function uuidv1ToBinary(uuid?: string | null): Buffer | null;
export function uuidv1ToBinary(uuid?: string | null): Buffer | null {
  if (uuid) {
    return toBinaryUUID(uuid);
  }
  else {
    return null;
  }
};

export function binaryToUuidv1(uuid: Buffer): string;
export function binaryToUuidv1(uuid?: Buffer | null): string | null;
export function binaryToUuidv1(uuid?: Buffer | null): string | null {
  if (uuid) {
    return fromBinaryUUID(uuid);
  }
  else {
    return null;
  }
};
