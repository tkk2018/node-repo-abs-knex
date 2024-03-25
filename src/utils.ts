import {
  formatISO9075 as dateFnsFormatISO9075,
  isDate,
  isValid,
  parse,
} from "date-fns";
import { Knex } from "knex";
import { OkPacket } from "mysql";
import { ResultSetHeader } from "mysql2";
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
 * Note that ISO9075 does not include timezone information.
 * By default, this function uses the local timezone.
 * However, if the input datetime is in UTC, set the 'utc' option to true.
 * FIXME: shall we always ask the user to specific timezone?
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

export type StrKey<T> = Extract<keyof T, string>;

/**
 * This is equal to `knex.raw("CAST(column as type) as alias")`.
 */
export function knexRawTypeCast<
  TTable extends Knex.TableNames,
  TResult = Knex.TableType<TTable>,
  TKey extends StrKey<Knex.ResolveTableType<Knex.TableType<TTable>>> = StrKey<Knex.ResolveTableType<Knex.TableType<TTable>>>,
  RawTResult = TResult
>(knex: Knex, column: `${TTable}.${TKey}`, type: string, alias: StrKey<TResult> & TKey): Knex.Raw<RawTResult>;

/**
 * This is equal to `knex.raw("CAST(column as type) as alias")`.
 */
export function knexRawTypeCast<
  TAliase extends string,
  TRecord,
  TResult,
  TKey extends StrKey<TRecord> = StrKey<TRecord>,
  RawTResult = TResult
>(knex: Knex, column: `${TAliase}.${TKey}`, type: string, alias: StrKey<TResult> & TKey): Knex.Raw<RawTResult>;

/**
 * This is equal to `knex.raw("CAST(column as type) as alias")`.
 */
export function knexRawTypeCast<
  TResult,
  RawTResult = TResult
>(knex: Knex, column: string, type: string, alias: string): Knex.Raw<RawTResult> {
  let sql = `CAST(?? as ${type})`;
  const binding: Knex.RawBinding[] = [column];
  if (alias) {
    sql += ` as ??`;
    binding.push(alias);
  }
  return knex.raw<RawTResult>(sql, binding);
}

/**
 * This is equal to the `knex.ref(column_name).withSchema(tablename)` which will generate `${tablename}.${column_name}`.
 * @param {Knex} knex The knex instance.
 * @param {string} tablename The table name.
 * @param {TSrc} column_name The column name.
 */
export function knexRefWithSchema<
  TTable extends Knex.TableNames,
  TResult = Knex.TableType<TTable>,
  TSrc extends StrKey<Knex.ResolveTableType<Knex.TableType<TTable>>> & StrKey<TResult> = StrKey<Knex.ResolveTableType<Knex.TableType<TTable>>> & StrKey<TResult>,
>(
  knex: Knex,
  tablename: TTable,
  column_name: TSrc,
): Knex.Ref<TSrc, { [K in TSrc]: TSrc }>;

/**
 * This is equal to the `knex.ref(column_name).withSchema(tablename)` which will generate `${tablename}.${column_name}`.
 * @param {Knex} knex The knex instance.
 * @param {string} tablename Expecially for derived table which using alias name.
 * @param {TSrc} column_name The column name.
 */
export function knexRefWithSchema<
  TRecord extends {},
  TResult = TRecord,
  TSrc extends StrKey<TRecord> & StrKey<TResult> = StrKey<TRecord> & StrKey<TResult>,
>(
  knex: Knex,
  tablename: string,
  column_name: TSrc,
): Knex.Ref<TSrc, { [K in TSrc]: TSrc }>;

/**
 * This is equal to the `knex.ref(column_name).withSchema(tablename)` which will generate `${tablename}.${column_name}`.
 */
export function knexRefWithSchema<
  TRecord extends {},
  TResult = TRecord,
  TSrc extends StrKey<TRecord> & StrKey<TResult> = StrKey<TRecord> & StrKey<TResult>,
>(
  knex: Knex,
  tablename: string,
  column_name: TSrc,
): Knex.Ref<TSrc, { [K in TSrc]: TSrc }> {
  return knex.ref<TSrc>(column_name).withSchema(tablename);
};

/**
 * This is equal to the `knex.ref(column_name).withSchema(tablename).as(alias)` which will generate `${tablename}.${column_name} as ${alias}`.
 */
export function knexRefWithSchemaAs<
  TTable extends Knex.TableNames,
  TResult,
  TSrc extends StrKey<Knex.ResolveTableType<Knex.TableType<TTable>>> = StrKey<Knex.ResolveTableType<Knex.TableType<TTable>>>,
  TAliase extends StrKey<TResult> = StrKey<TResult>,
>(
  knex: Knex,
  tablename: TTable,
  column_name: TSrc,
  alias: TAliase,
): Knex.Ref<TSrc, { [K in TAliase]: TSrc }> {
  return knex.ref<TSrc>(column_name).withSchema(tablename).as<TAliase>(alias);
};

/**
 * This is equal to `knex.raw("value as column_name")`.
 */
export function knexRawExtraValueAs<
  TResult,
  TKey extends StrKey<TResult>,
  RawTResult = TResult
>(knex: Knex, value: TResult[TKey], alias: TKey): Knex.Raw<RawTResult> {
  return knex.raw<RawTResult>("? as ??", [value, alias]);
};

/**
 * This is equal to the `knex.raw("BIN_TO_UUID(column, swap_flag) as alias")`.
 */
export function knexRawBinaryToUuid<
  TTable extends Knex.TableNames,
  TResult,
  TKey extends StrKey<Knex.ResolveTableType<Knex.TableType<TTable>>> = StrKey<Knex.ResolveTableType<Knex.TableType<TTable>>>,
  RawTResult = TResult
>(knex: Knex, column: `${TTable}.${TKey}`, alias?: StrKey<TResult>, swap_flag: 0 | 1 = 0): Knex.Raw<RawTResult> {
  let sql = "BIN_TO_UUID(??, ?)";
  const binding: Knex.RawBinding[] = [column, swap_flag];
  if (alias) {
    sql += " as ??";
    binding.push(alias);
  }
  return knex.raw<RawTResult>(sql, binding);
};

/**
 * Concat date string and time string columns and then convert it to unixtimestamp.
 * @param {Knex} knex The knex instance.
 * @param {string} date The column name of date.
 * @param {string} time The column name of time.
 * @param {string} format The format of the `${date}${time}`.
 * @param {string} [alias] With alias.
 */
export function knexRawStrDateTimeToUnixtimestamp<
  TTable extends Knex.TableNames,
  TResult = any,
  TKey extends StrKey<Knex.ResolveTableType<Knex.TableType<TTable>>> = StrKey<Knex.ResolveTableType<Knex.TableType<TTable>>>,
>(knex: Knex, date: `${TTable}.${TKey}`, time: `${TTable}.${TKey}`, format: string, alias?: StrKey<TResult>): Knex.Raw<TResult> {
  let sql = `UNIX_TIMESTAMP(STR_TO_DATE(CONCAT(??, ??), ?))`;
  const binding: Knex.RawBinding[] = [date, time, format];
  if (alias) {
    sql += " as ??";
    binding.push(alias);
  }
  return knex.raw<TResult>(sql, binding);
};

export function safeColumnName<
  TTable extends string,
  TRecord extends {},
  TKey extends StrKey<TRecord> = StrKey<TRecord>,
>(column_name: `${TTable}.${TKey}`): `${TTable}.${TKey}` {
  return column_name;
};

/**
 * Due to the `knex(tableName).insert(data).onConflict().merge(merge)` using the deprecated way to construct the query, see this {@link https://github.com/knex/knex/issues/4990 | issue} and this {@link https://stackoverflow.com/a/63609645/16027098 | question} for more details.
 * This creates the raw query by using the standard way, as taking from {@link https://stackoverflow.com/a/45063055/16027098 | here}.
 *
 * For `insertOrIgnoreIfDuplicate`, simply put the unique key name in the {@link merge} parameter. Because of the unique key value doesn't change, therefore, no updates occur. More details can be found {@link https://stackoverflow.com/a/548570/16027098 | here}.
 *
 * Note that `INSERT ... ON DUPLICATE KEY UPDATE` will cause the auto-increment key to increase no matter whether it is inserted or updated. See the {@link https://dev.mysql.com/doc/refman/8.3/en/insert-on-duplicate.html | offical explanation} for more details.
 *
 * Additionally, regarding affected rows:
 * - If a new row is inserted, the affected row count is 1.
 * - If an existing row is updated, the affected row count is 2.
 * - If no changes occur (existing row remains unchanged), the affected row count is 0.
 */
export function knexMySqlInsertOrUpdate<
  TTable extends Knex.TableNames,
  TResult extends OkPacket[] | ResultSetHeader[] = OkPacket[] | ResultSetHeader[],
  TRecord extends Partial<Knex.ResolveTableType<Knex.TableType<TTable>>> = Partial<Knex.ResolveTableType<Knex.TableType<TTable>>>,
>(knex: Knex, tableName: TTable, data: TRecord | TRecord[], merge?: StrKey<TRecord>[] | undefined, alias?: string): Knex.Raw<TResult>;

/**
 * Due to the `knex(tableName).insert(data).onConflict().merge(merge)` using the deprecated way to construct the query, see this {@link https://github.com/knex/knex/issues/4990 | issue} and this {@link https://stackoverflow.com/a/63609645/16027098 | question} for more details.
 * This creates the raw query by using the standard way, as taking from {@link https://stackoverflow.com/a/45063055/16027098 | here}.
 *
 * For `insertOrIgnoreIfDuplicate`, simply put the unique key name in the {@link merge} parameter. Because of the unique key value doesn't change, therefore, no updates occur. More details can be found {@link https://stackoverflow.com/a/548570/16027098 | here}.
 *
 * Note that `INSERT ... ON DUPLICATE KEY UPDATE` will cause the auto-increment key to increase no matter whether it is inserted or updated. See the {@link https://dev.mysql.com/doc/refman/8.3/en/insert-on-duplicate.html | offical explanation} for more details.
 *
 * Additionally, regarding affected rows:
 * - If a new row is inserted, the affected row count is 1.
 * - If an existing row is updated, the affected row count is 2.
 * - If no changes occur (existing row remains unchanged), the affected row count is 0.
 */
export function knexMySqlInsertOrUpdate<
  TRecord extends {},
  TResult extends OkPacket[] | ResultSetHeader[] = OkPacket[] | ResultSetHeader[],
>(knex: Knex, tableName: string, data: TRecord | TRecord[], merge?: StrKey<TRecord>[] | undefined, alias?: string): Knex.Raw<TResult>;

/**
 * Due to the `knex(tableName).insert(data).onConflict().merge(merge)` using the deprecated way to construct the query, see this {@link https://github.com/knex/knex/issues/4990 | issue} and this {@link https://stackoverflow.com/a/63609645/16027098 | question} for more details.
 * This creates the raw query by using the standard way, as taking from {@link https://stackoverflow.com/a/45063055/16027098 | here}.
 *
 * For `insertOrIgnoreIfDuplicate`, simply put the unique key name in the {@link merge} parameter. Because of the unique key value doesn't change, therefore, no updates occur. More details can be found {@link https://stackoverflow.com/a/548570/16027098 | here}.
 *
 * Note that `INSERT ... ON DUPLICATE KEY UPDATE` will cause the auto-increment key to increase no matter whether it is inserted or updated. See the {@link https://dev.mysql.com/doc/refman/8.3/en/insert-on-duplicate.html | offical explanation} for more details.
 *
 * Additionally, regarding affected rows:
 * - If a new row is inserted, the affected row count is 1.
 * - If an existing row is updated, the affected row count is 2.
 * - If no changes occur (existing row remains unchanged), the affected row count is 0.
 */
export function knexMySqlInsertOrUpdate<
  TRecord extends {},
  TResult = OkPacket[] | ResultSetHeader[]
>(knex: Knex, tableName: string, data: TRecord | TRecord[], merge: StrKey<TRecord>[] | undefined = undefined, alias: string = "new_value"): Knex.Raw<TResult> {
  const firstData = Array.isArray(data) ? data[0] : data;
  const propertyNames = merge ?? Object.getOwnPropertyNames(firstData);
  return knex.raw(knex(tableName).insert(data).toQuery() + ` AS \`${alias}\` ON DUPLICATE KEY UPDATE ` +
    propertyNames.map((field) => `${field}=${alias}.${field}`).join(", ")
  );
};

declare module 'knex' {
  namespace Knex {
    interface JoinClause {
      on<
        TTable1 extends Knex.TableNames,
        TTable2 extends Knex.TableNames,
        TKey1 extends StrKey<Knex.ResolveTableType<Knex.TableType<TTable1>>> = StrKey<Knex.ResolveTableType<Knex.TableType<TTable1>>>,
        TKey2 extends StrKey<Knex.ResolveTableType<Knex.TableType<TTable2>>> = StrKey<Knex.ResolveTableType<Knex.TableType<TTable2>>>
      >(column1: `${TTable1}.${TKey1}`, operator: string, column2: `${TTable2}.${TKey2}`): Knex.JoinClause;

      on<
        TTable1 extends Knex.TableNames,
        TTable2 extends string,
        TRecord2 extends {},
        TKey1 extends StrKey<Knex.ResolveTableType<Knex.TableType<TTable1>>> = StrKey<Knex.ResolveTableType<Knex.TableType<TTable1>>>,
        TKey2 extends StrKey<TRecord2> = StrKey<TRecord2>
      >(column1: `${TTable1}.${TKey1}`, operator: string, column2: `${TTable2}.${TKey2}`): Knex.JoinClause;

      on<
        TTable1 extends string,
        TRecord1 extends {},
        TTable2 extends string,
        TRecord2 extends {},
        TKey1 extends StrKey<TRecord1> = StrKey<TRecord1>,
        TKey2 extends StrKey<TRecord2> = StrKey<TRecord2>
      >(column1: `${TTable1}.${TKey1}`, operator: string, column2: `${TTable2}.${TKey2}`): Knex.JoinClause;
    }
  }
};
