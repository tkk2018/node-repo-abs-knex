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

export type ParseISO9075Option = {
  /**
   * Indicate the iso9075 date is UTC.
   */
  utc?: boolean;

  fractionDelimiter?: "." | string;

  fractionalSecondDigits?: number;
};

/**
 * Creates or sets a `Date` object with milliseconds set to 0.
 * @param {Date} [date] Optional. The date to be used; otherwise, a new `Date` will be created.
 * @returns {Date} The date with 0 milliseconds.
 */
export function createDateZeroizeMs(date?: Date): Date {
  const d = date ? new Date(date.getTime()) : new Date();
  d.setMilliseconds(0);
  return d;
};

/**
 * Parse an ISO9075 date string into a Date object.
 * Note that the ISO9075 does not include the timezone information.
 * By default, this function uses the local timezone.
 * If the input datetime is in UTC, set the 'utc' option to true.
 * Currently, this doesn't support other timezone, so you cannot pass in +01:00 ISO9075 date string when the local machines is not +01:00.
 * FIXME: support more timezone option
 */
export function parseISO9075(datetime: string | Date, opt?: ParseISO9075Option): Date;
export function parseISO9075(datetime?: string | Date | null, opt?: ParseISO9075Option): Date | null;
export function parseISO9075(datetime?: string | Date | null, opt?: ParseISO9075Option): Date | null {
  if (isValidDate(datetime)) {
    return datetime;
  }
  else if (datetime) {
    const milliseconds_format = opt?.fractionalSecondDigits ? "".padStart(opt.fractionalSecondDigits, "XXX") : "";
    const iso9075_format = `${ISO9075_FORMAT}${opt?.fractionalSecondDigits ? opt?.fractionDelimiter ? opt.fractionDelimiter : "." : ""}${milliseconds_format}`;

    // cause the iso9075 doesn't has the timezone information.
    if (opt?.utc) {
      // it is utc, parse it with specifically.
      return parseISO9075UtcToLocal(datetime, iso9075_format);
    }
    else {
      // create a Date object using the local timezone.
      return parse(datetime, iso9075_format, new Date());
    }
  }
  else {
    return null;
  }
};

/**
 * @param {boolean} utc Indicates whether the output should be in UTC.
 */
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
 * Create a `Date` object that uses the UTC time of the original date as the local time.
 *
 * For example, given new Date("2024-01-01T08:00:00"),
 * - the local time is 2024-01-01 16:00:00
 * - the utc time is 2024-01-01 08:00:00,
 * After conversion,
 * - the local time is 2024-01-01 08:00:00
 * - the utc time is 2024-01-01 00:00:00.
 *
 * This is useful for libraries like date-fns that use the local datetime to do conversions,
 * but you actually want them to use UTC datetime.
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
    hourCycle: "h23",
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
 * Create a new Date based on the UTC ISO9075 formated {@link date}.
 * Be careful the format must be exact; otherwise, it will result in NaN.
 * For example, if the input contain '.000Z', but the format specifies only '.SSS'.
 * @param {string} date The date string. Note that it must not contain any timezone information, as the timezone info will be added internally.
 * @param {string} format The format for parsing the string. Again, ensure it does not include timezone information, as it will be handled internally.
 * @see {@link https://stackoverflow.com/a/40768745 | source} and {@link https://date-fns.org/v2.30.0/docs/parse | date-fns.parse}
 */
export function parseISO9075UtcToLocal(date: string, format?: string): Date {
  // manually add the 'Z' to the original date string because ISO9075 doesn't specify timezone information.
  // additionally, include the 'X' in the format to instruct dateFns on how to parse the string.
  return parse(`${date}Z`, `${format ?? ISO9075_FORMAT}X`, new Date());
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

/**
 * group1 = yyyy
 * group2 = MM
 * group3 = dd
 * group4 = HH
 * group5 = mm
 * group6 = ss
 * group7 = S...S
 * group8 = XXX
 *
 * @see {@link https://date-fns.org/v2.30.0/docs/format}
 * @see {@link https://stackoverflow.com/a/37563868}
 * @see {@link https://stackoverflow.com/a/68826144}
 */
const regex_iso8601 = /^(\d{4})-(\d\d)-(\d\d)[T ]?(\d\d):(\d\d):(\d\d)\.?(\d+)?([+-]\d\d:\d\d|Z)?$/i

type DatetimeToken = {
  /**
   * yyyy
   * @example
   * 2023
   */
  year: string,

  /**
   * MM, 1-12
   */
  month: string,

  /**
   * dd
   * @example
   * 1-31
   */
  day: string,

  /**
   * HH, 00-23
   */
  hour: string,

  /**
   * mm, 00-59
   */
  minute: string,

  /**
   * ss, 00-59
   */
  second: string,

  /**
   * S...S
   */
  millisecond: string,

  /**
   * XXX
   * @example
   * Z, +00:00, -01:00, +01:00
   */
  offset: string,
};

/**
 * Typescript utility type.
 */
type OptionsFlags<Type> = {
  [Property in keyof Type]: boolean;
};

type TokenizedDatetimeToStringOption = OptionsFlags<DatetimeToken> & {
  date_delimiter: string;
  date_time_delimiter: string;
  time_delimiter: string;
  millisecond_delimiter: string;
  disallow_Z: "+" | "-";
};

type TokenizedDatetimeToDateOption = Pick<TokenizedDatetimeToStringOption, "year" | "month" | "day" | "date_delimiter">;

type TokenizedDatetimeToTimeOption = Pick<TokenizedDatetimeToStringOption, "hour" | "minute" | "second" | "millisecond" | "time_delimiter" | "millisecond_delimiter">;

const DEFAULT_TOKENIZED_DATE_FORMAT_OPTION = {
  year: true,
  month: true,
  day: true,
  date_delimiter: "-",
} as const;

const DEFAULT_TOKENIZED_TIME_FORMAT_OPTION = {
  hour: true,
  minute: true,
  second: true,
  millisecond: true,
  time_delimiter: ":",
  millisecond_delimiter: ".",
} as const;

class TokenizedDatetime {
  /**
   * yyyy
   * @example
   * 2023
   */
  year: string;

  /**
   * MM, 1-12
   */
  month: string;

  /**
   * dd
   * @example
   * 1-31
   */
  day: string;

  /**
   * HH, 00-23
   */
  hour: string;

  /**
   * mm, 00-59
   */
  minute: string;

  /**
   * ss, 00-59
   */
  second: string;

  /**
   * S...S
   */
  millisecond?: string;

  /**
   * XXX
   * @example
   * Z, +00:00, -00:00, -01:00, +01:00
   */
  offset?: string;

  constructor(token: DatetimeToken) {
    this.year = token.year;
    this.month = token.month;
    this.day = token.day;
    this.hour = token.hour;
    this.minute = token.minute;
    this.second = token.second;
    this.millisecond = token.millisecond;
    this.offset = token.offset;
  }

  toDate(option?: Partial<TokenizedDatetimeToDateOption>): string {
    const opt = Object.assign({}, DEFAULT_TOKENIZED_DATE_FORMAT_OPTION, option);
    let date = "";
    if (opt.year) {
      date += this.year;
      if (opt.month || opt.day) {
        date += opt.date_delimiter;
      }
    }
    if (opt.month) {
      date += this.month;
      if (opt.day) {
        date += opt.date_delimiter;
      }
    }
    if (opt.day) {
      date += this.day;
    }
    return date;
  }

  toTime(option?: Partial<TokenizedDatetimeToTimeOption>): string {
    const opt = Object.assign({}, DEFAULT_TOKENIZED_TIME_FORMAT_OPTION, option);
    let time = "";
    if (opt.hour) {
      time += this.hour;
      if (opt.minute || opt.second) {
        time += opt.time_delimiter;
      }
    }
    if (opt.minute) {
      time += this.minute;
      if (opt.second) {
        time += opt.time_delimiter;
      }
    }
    if (opt.second) {
      time += this.second;
      if (opt.millisecond && this.millisecond) {
        time += opt.millisecond_delimiter;
        time += this.millisecond;
      }
    }
    return time;
  }

  toString(option?: Partial<TokenizedDatetimeToStringOption>): string {
    const opt = Object.assign(
      {},
      DEFAULT_TOKENIZED_DATE_FORMAT_OPTION,
      DEFAULT_TOKENIZED_TIME_FORMAT_OPTION,
      {
        date_time_delimiter: "T",
        offset: true,
      },
      option,
    );
    const date = this.toDate(opt);
    const time = this.toTime(opt);
    let result = `${date}${opt.date_time_delimiter}${time}`;
    if (opt.offset && this.offset) {
      if (this.offset?.toUpperCase() === "Z" && opt.disallow_Z) {
        result += opt.disallow_Z;
        result += "00:00";
      }
      else {
        result += this.offset;
      }
    }
    return result;
  }
}

/**
 * Tokenize the ISO8601 formatted date.
 */
export function tokenizeIso8601(str_date: string): TokenizedDatetime | null {
  const tokens = regex_iso8601.exec(str_date);
  if (!tokens) {
    return null;
  }
  return new TokenizedDatetime({
    year: tokens[1],
    month: tokens[2],
    day: tokens[3],
    hour: tokens[4],
    minute: tokens[5],
    second: tokens[6],
    millisecond: tokens[7],
    offset: tokens[8],
  });
};

export function sanitizeObject<
  Expect extends object,
  Input extends Expect = Expect
>(
  input: Input,
  keys: Extract<keyof Expect, string>[] | readonly Extract<keyof Expect, string>[]
): {
  [K in keyof Expect]: Expect[K]
} {
  return (Object.keys(input) as Array<Extract<keyof Expect, string>>)
    .filter(key => keys.includes(key))
    .reduce((acc, key) => {
      // https://stackoverflow.com/q/61948250
      const input_value = input[key];
      (acc[key] as typeof input_value) = input[key];
      return acc;
    }, {} as Expect);
};

/**
 * @see {@link https://stackoverflow.com/a/69997732/16027098 | source}
 */
type Invalid<T> = Error & { __errorMessage: T };

/**
 * @see {@link https://stackoverflow.com/a/69997732/16027098 | source}
 */
type AsUniqueArray<
  A extends ReadonlyArray<any>,
  B extends ReadonlyArray<any>,
> = {
  [I in keyof A]: unknown extends {
    [J in keyof B]: J extends I ? never : B[J] extends A[I] ? unknown : never
  }[number]
    ? Invalid<[A[I], "is repeated"]>
    : A[I]
};

/**
 * @see {@link https://stackoverflow.com/a/69997732/16027098 | source}
 */
export type Narrowable =
  | string
  | number
  | boolean
  | object
  | null
  | undefined
  | symbol;

/**
 * @example
 * const keys = asUniqueArray(["a", "b"]); // ok
 * const catch_duplicate = asUniqueArray(["a", "b", "b"]); // error
 *
 * @see {@link https://stackoverflow.com/a/69997732/16027098 | source}
 */
export const asUniqueArray = <
  N extends Narrowable,
  A extends [] | ReadonlyArray<N> & AsUniqueArray<A, A>
>(
 a: A
) => a;

/**
 * @example
 * type A = {
 *   a: number;
 *   b: number;
 *   c: number
 * }
 *
 * const keys = asKeysOfObject<A, ["a", "b"]>(["a", "b"]); // ok
 * const catch_duplicate = asKeysOfObject<A, ["a", "b", "b"]>(["a", "b", "b"]); // error
 * const catch_non_object_key = asKeysOfObject<A, ["d"]>(["d"]); // error
 *
 * @see {@link asUniqueArray}
 */
export const asKeysOfObject = <
  O extends {},
  A extends [] | ReadonlyArray<Narrowable> & ReadonlyArray<keyof O> & AsUniqueArray<A, A>
>(
 a: A
) => a;
