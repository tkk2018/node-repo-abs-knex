import { Knex } from "knex";
import {
  Connection as MysqlConnection,
  MysqlError,
  OkPacket,
} from "mysql";
import {
  Connection as Mysql2Connection,
  QueryError as Mysql2QueryError,
  ResultSetHeader,
} from "mysql2";

export type StrKey<T> = Extract<keyof T, string>;

export type TableColumnName<TTable extends Knex.TableNames = Knex.TableNames> = StrKey<Knex.ResolveTableType<Knex.TableType<TTable>>>;

export type TableColumnNameWithSchema<
  TTable extends Knex.TableNames = Knex.TableNames,
  TKey extends TableColumnName<TTable> = TableColumnName<TTable>
> = `${TTable}.${TKey}`;

/**
 * This is equal to `knex.raw("CAST(column as type) as alias")`.
 */
export function knexRawTypeCast<
  TTable extends Knex.TableNames,
  TResult = Knex.TableType<TTable>,
  TKey extends TableColumnName<TTable> = TableColumnName<TTable>,
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
};

/**
 * This is equal to the `knex.ref(column_name).withSchema(tablename)` which will generate `${tablename}.${column_name}`.
 * @param {Knex} knex The knex instance.
 * @param {string} tablename The table name.
 * @param {TSrc} column_name The column name.
 */
export function knexRefWithSchema<
  TTable extends Knex.TableNames,
  TResult,
  TSrc extends TableColumnName<TTable> & StrKey<TResult>,
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
  TSrc extends TableColumnName<TTable>,
  TAliase extends StrKey<TResult>,
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
  TKey extends TableColumnName<TTable> = TableColumnName<TTable>,
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
 * @param {object} [option]
 * @param {string} [option.from_tz] The timezone of the datetime string.
 * @param {string} [option.alias] With alias.
 */
export function knexRawStrDateTimeToUnixtimestamp<
  TTable extends string,
  TRecord extends {},
  TResult extends {} = any,
  TRawResult = TResult,
  TKey extends StrKey<TRecord> = StrKey<TRecord>,
>(
  knex: Knex,
  date: `${TTable}.${TKey}`,
  time: `${TTable}.${TKey}`,
  format: string,
  option?: {
    from_tz?: string,
    alias?: string,
  }
): Knex.Raw<TRawResult>;

/**
 * Concat date string and time string columns and then convert it to unixtimestamp.
 * @param {Knex} knex The knex instance.
 * @param {string} date The column name of date.
 * @param {string} time The column name of time.
 * @param {string} format The format of the `${date}${time}`.
 * @param {object} [option]
 * @param {string} [option.from_tz] The timezone of the datetime string.
 * @param {string} [option.alias] With alias.
 */
export function knexRawStrDateTimeToUnixtimestamp<
  TTable extends Knex.TableNames,
  TRawResult = any,
  TKey extends StrKey<Knex.ResolveTableType<Knex.TableType<TTable>>> = StrKey<Knex.ResolveTableType<Knex.TableType<TTable>>>,
>(
  knex: Knex,
  date: `${TTable}.${TKey}`,
  time: `${TTable}.${TKey}`,
  format: string,
  option?: {
    from_tz?: string,
    alias?: string,
  }
): Knex.Raw<TRawResult>;

/**
 * Concat date string and time string columns and then convert it to unixtimestamp.
 * @param {Knex} knex The knex instance.
 * @param {string} date The column name of date.
 * @param {string} time The column name of time.
 * @param {string} format The format of the `${date}${time}`.
 * @param {object} [option]
 * @param {string} [option.from_tz] The timezone of the datetime string.
 * @param {string} [option.alias] With alias.
 */
export function knexRawStrDateTimeToUnixtimestamp<
  TTable extends Knex.TableNames,
  TRawResult = any,
  TKey extends StrKey<Knex.ResolveTableType<Knex.TableType<TTable>>> = StrKey<Knex.ResolveTableType<Knex.TableType<TTable>>>,
>(
  knex: Knex,
  date: `${TTable}.${TKey}`,
  time: `${TTable}.${TKey}`,
  format: string,
  option?: {
    from_tz?: string,
    alias?: string,
  }
): Knex.Raw<TRawResult> {
  let sql = `STR_TO_DATE(CONCAT(??, ??), ?)`;
  const binding: Knex.RawBinding[] = [date, time, format];

  if (option?.from_tz) {
    // https://stackoverflow.com/a/19069310/16027098
    sql = `CONVERT_TZ(${sql}, ?, @@session.time_zone)`;
    binding.push(option.from_tz);
  }

  sql = `UNIX_TIMESTAMP(${sql})`;

  if (option?.alias) {
    sql += " as ??";
    binding.push(option.alias);
  }

  return knex.raw<TRawResult>(sql, binding);
};

export function safeColumnName<
  TTable extends Knex.TableNames,
  TKey extends TableColumnName<TTable> = TableColumnName<TTable>,
>(column_name: `${TTable}.${TKey}`): `${TTable}.${TKey}`;

export function safeColumnName<
  TTable extends string,
  TRecord extends {},
  TKey extends StrKey<TRecord> = StrKey<TRecord>,
>(column_name: `${TTable}.${TKey}`): `${TTable}.${TKey}`;

export function safeColumnName<
  TTable extends string,
  TKey extends string,
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

export type KnexDefaultResetTablesOption<T extends Knex.TableNames = Knex.TableNames> = {
  [N in T]: boolean
};

export type KnexResetTablesOption<T extends Knex.TableNames = Knex.TableNames> = {
  [N in T]: true;
};

export type KnexResetTablesResult<T extends Knex.TableNames = Knex.TableNames> = {
  [TableName in T]: number;
};

export type KnexResetTablesAdvanceOption<T extends Knex.TableNames = Knex.TableNames> = {
  strategy: "only" | "except",
  tables: Partial<KnexResetTablesOption<T>>,
};

/**
 * Delete all rows of {@link table}.
 */
export async function knexResetTable<T extends Knex.TableNames = Knex.TableNames>(knex: Knex, table: T): Promise<number> {
  const result = await knexResetTables<T>(knex, [table]);
  return result[table];
};

/**
 * Delete all rows of {@link tables} in order.
 */
export async function knexResetTables<T extends Knex.TableNames = Knex.TableNames>(knex: Knex, tables: T[]): Promise<KnexResetTablesResult> {
  const result = tables.reduce(function(acc, cur, _i) {
    acc[cur] = 0;
    return acc;
  }, {} as KnexResetTablesResult<T>);

  for(const table of tables) {
    const affected = await knex(table).delete();
    result[table] = affected;
  }
  return result;
};

/**
 * Delete all rows of tables based on the {@link tables} and {@link option}.
 *
 * If the strategy is `only` or no strategy is provided (undefined), the tables with the `true` option will be chosen.
 * Otherwise (except), the tables with the `false` option will be chosen.
 *
 * The deletion will follow the order of `keyof` {@link tables}.
 *
 * This operation is considered DANGEROUS and should not exist in production code.
 * USE AT YOUR OWN RISK.
 *
 * @example
 * // All defaults set to `false` are recommended
 * const DEFAULT_OPTION = {
 *   users: false,
 *   roles: false,
 *   user_role: false,
 * };
 * await knexResetTablesAdvance(knex, DEFAULT_OPTION); // No rows deleted
 * await knexResetTablesAdvance(knex, DEFAULT_OPTION, { strategy: "only", tables: { user_role: true } }); // Only delete rows from the user_role table
 * await knexResetTablesAdvance(knex, DEFAULT_OPTION, { strategy: "except", tables: { users: true } }); // Keep rows in the users table, delete others.
 * await knexResetTablesAdvance(knex, DEFAULT_OPTION, { strategy: "except", tables: {} }); // Delete rows from all tables.
 */
export async function knexResetTablesAdvance(knex: Knex, tables: KnexDefaultResetTablesOption, option?: KnexResetTablesAdvanceOption): Promise<KnexResetTablesResult> {
  const opt = { ...tables, ...option?.tables };
  const chosen = (Object.keys(opt) as Array<keyof KnexDefaultResetTablesOption>).filter((v) => {
    switch (option?.strategy) {
      case "only":
      case undefined:
        return opt[v] === true;

      case "except":
        return opt[v] === false;
    }
  });
  return await knexResetTables(knex, chosen);
};

declare module 'knex' {
  namespace Knex {
    interface JoinClause {
      on<
        TTable1 extends Knex.TableNames,
        TTable2 extends Knex.TableNames,
        TKey1 extends TableColumnName<TTable1> = TableColumnName<TTable1>,
        TKey2 extends TableColumnName<TTable2> = TableColumnName<TTable2>,
      >(column1: `${TTable1}.${TKey1}`, operator: string, column2: `${TTable2}.${TKey2}`): Knex.JoinClause;

      on<
        TTable1 extends Knex.TableNames,
        TTable2 extends string,
        TRecord2 extends {},
        TKey1 extends TableColumnName<TTable1> = TableColumnName<TTable1>,
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

      on<TResult = any>(column1: Knex.Raw<TResult>, operator: string, column2: string): Knex.JoinClause;
      on<TResult = any>(column1: string, operator: string, column2: Knex.Raw<TResult>): Knex.JoinClause;
      on<TResult = any>(column1: Knex.Raw<TResult>, operator: string, column2: Knex.Raw<TResult>): Knex.JoinClause;
    }
  }
};

export interface KnexGenericAfterCreateFunction<C = any, E = Error> {
  (connection: C, callback: (error?: E | null, connection?: C | null) => void): void
};

export interface KnexGenericPoolConfig<Client extends string> extends Knex.PoolConfig {
  afterCreate:
    Client extends "mysql"
    ? KnexGenericAfterCreateFunction<MysqlConnection, MysqlError>
    : Client extends "mysql2"
      ? KnexGenericAfterCreateFunction<Mysql2Connection, Mysql2QueryError>
      : Function;
};

export interface KnexGenericConfig<Driver extends string, SV extends {} = any> extends Knex.Config<SV> {
  client: Driver;
  pool: KnexGenericPoolConfig<Driver>;
};
