import { Knex } from "knex";
import {
  CPaginationOption,
  ICursorPaginationOption,
  IOffsetPaginationOption,
  QueryOption,
  SelectOption,
  SelectOption2,
} from "./index.js";

export interface RepositoryConstructorParams<TRecord extends {} = any, TResult = any[]> {
  dbmain: Knex<TRecord, TResult>;
  dbreadonly?: Knex<TRecord, TResult>;
};

export abstract class Repository<
  TRecord extends {} = any,
  TResult = any[],
  TTable extends Knex.TableDescriptor | Knex.AliasDict = string
> {
  protected readonly dbmain: Knex<TRecord, TResult>;
  protected readonly dbreadonly: Knex<TRecord, TResult>;

  constructor(params: RepositoryConstructorParams<TRecord, TResult>) {
    this.dbmain = params.dbmain;
    this.dbreadonly = params.dbreadonly ?? params.dbmain;
  }

  private prependTableName(table: TTable, column: string): string {
    return `${table}.${column}`;
  }

  protected db(opt?: QueryOption): Knex<TRecord, TResult> {
    return opt?.readonly ? this.dbreadonly : this.dbmain;
  }

  protected qb<T extends {} = TRecord, V = TResult>(table: TTable, opt?: SelectOption2<T, V> & { disablePrependTableName?: boolean }): Knex.QueryBuilder<T, V>;
  protected qb<
    TTable extends Knex.TableNames,
    TRecord extends Knex.ResolveTableType<Knex.TableType<TTable>> = Knex.ResolveTableType<Knex.TableType<TTable>>,
    TResult = TRecord[],
  >(
    table: TTable,
    opt?: SelectOption & { disablePrependTableName?: boolean },
  ): Knex.QueryBuilder<TRecord, TResult>;
  protected qb<T extends {} = TRecord, V = TResult>(table: TTable, opt?: SelectOption & { disablePrependTableName?: boolean }): Knex.QueryBuilder<T, V>;
  protected qb<T extends {} = TRecord, V = TResult>(table: TTable, opt?: SelectOption & { disablePrependTableName?: boolean }): Knex.QueryBuilder<T, V> {
    const qb = this.db(opt)<T, V>(table);
    if (opt?.trx) {
      qb.transacting(opt.trx);
      if (opt?.for_update) {
        qb.forUpdate();
      }
    }
    if (opt?.order && opt.order_by) {
      qb.orderBy(opt?.disablePrependTableName ? opt.order_by : this.prependTableName(table, opt.order_by), opt.order);
    }
    return qb;
  }

  qbMax<T extends {} = TRecord, V = any>(
    table: TTable,
    column: Extract<keyof T, string>,
    opt?: SelectOption & { disablePrependTableName?: boolean },
  ): Knex.QueryBuilder<T, { max: V }>;
  qbMax<T extends {} = TRecord, V = any>(
    table: TTable,
    column: Extract<keyof T, string>,
    opt?: SelectOption2<T, V> & { disablePrependTableName?: boolean },
  ): Knex.QueryBuilder<T, { max: V }>;
  qbMax<T extends {} = TRecord, V = any>(
    table: TTable,
    column: Extract<keyof T, string>,
    opt?: SelectOption2<T, V> & { disablePrependTableName?: boolean },
  ): Knex.QueryBuilder<T, { max: V }> {
    return this.qb<T, V>(table, opt)
      .max(opt?.disablePrependTableName ? column: this.prependTableName(table, column), { as: "max" })
      .first() as Knex.QueryBuilder<T, { max: V }>; // FIXME: type cast
  }

  qbMin<T extends {} = TRecord, V = any>(
    table: TTable,
    column: Extract<keyof T, string>,
    opt?: SelectOption2<T, V> & { disablePrependTableName?: boolean },
  ): Knex.QueryBuilder<T, { min: V }> {
    return this.qb<T, V>(table, opt)
      .min(
        opt?.disablePrependTableName ? column : this.prependTableName(table, column), { as: "min" })
      .first() as Knex.QueryBuilder<T, { min: V }>; // FIXME: type cast
  }

  /**
   * [WARN] LIMITATION: The `id_column` is required, but its value (`opt.start_id`) is optional.
   * If no value is provided, it defaults to 1 (integer).
   * This can cause issues if the `id_column` cannot be coerced to a string or integer (e.g., when it is a datetime column),
   * resulting in an invalid format error.
   *
   * Cursor-based pagination: by default, this will return `${page_size + 1}` rows.
   * If `page_size` is less than or equal to 0, it will be treated as undefined, which results in returning all rows.
   *
   * This applies a cursor condition depending on the sort order:
   * * `asc` - `WHERE id_column >= start_id`
   * * `desc` - `WHERE id_column <= start_id`
   *
   * Also, this adds `ORDER BY` clause. If the (`opt.order_by`) is not specified, it defaults to using the {@param id_column}
   *
   * @param table The name of the table.
   * @param id_column The column used as the cursor for pagination.
   * @param opt Options for the query.
   *
   * @example
   * // First page (ascending order with date filter)
   * const page1 = await qbCPaginate("users", "created_at", {
   *   order: "asc",
   *   page_size: 10,
   *   start_id: "2025-01-01 00:00:00",
   * })
   * // this returns a QueryBuilder, so you can continue chaining
   * .andWhere("created_at", "<", "2026-01-01 00:00:00")
   * ;
   *
   * if (page1.length > 10) {
   *   // There is a next page
   *   // Reapply the original filters, but update the cursor (start_id)
   *   const remaining_page = await qbCPaginate("users", "created_at", {
   *     order: "asc",
   *     page_size: 10,
   *     start_id: page1[page1.length - 1].created_at,
   *   })
   *   .andWhere("created_at", "<", "2026-01-01 00:00:00")
   *   ;
   * }
   *
   * @example
   * // First page (descending order)
   * const page1 = await qbCPaginate("users", "user_id", {
   *   order: "desc",
   *   page_size: 10,
   * })
   * .select("user_id", "name")
   * ;
   *
   * if (page1.length > 10) {
   *   // There is a next page
   *   const remaining_page = await qbCPaginate("users", "user_id", {
   *     order: "desc",
   *     page_size: 10,
   *     // use the last element in the list (smallest user_id) because the results are ordered in descending order
   *     start_id: page1[page1.length - 1].user_id,
   *   })
   *   .select("user_id", "name")
   *   ;
   * }
   */
  protected qbCPaginate<T extends {} = TRecord, V = TResult>(
    table: TTable,
    id_column: Extract<keyof T, string>,
    opt?: SelectOption & CPaginationOption & { disablePrependTableName?: boolean; disablePageSizePlusOne?: boolean },
  ): Knex.QueryBuilder<T, V> {
    const page_size = (opt?.page_size && opt.page_size > 0) ? opt.page_size : 0;
    const order = "desc" === opt?.order ? "desc" : "asc"; // default asc
    const order_by = opt?.order_by ?? id_column; // default to id_column

    let comparator = "";
    let cursor: string | Knex.QueryBuilder | undefined | null = opt?.start_id;
    if (order === "asc") {
      comparator = ">=";
      cursor ??= "1";
    }
    else {
      comparator = "<=";
      cursor ??= this.qbMax<T, any>(table, id_column, opt); // subquery to find the last
    }

    return this.qb<T, V>(table, opt)
      .where(opt?.disablePrependTableName ? id_column : this.prependTableName(table, id_column), comparator, cursor)
      .modify((qb) => {
        if (page_size) {
          const extra = opt?.disablePageSizePlusOne ? 0 : 1;
          qb.limit(page_size + extra);
        }

        if (!opt?.order_by || !opt?.order) {
          qb.orderBy(opt?.disablePrependTableName ? order_by : this.prependTableName(table, order_by), order);
        }
      });
  }

  protected qbPaginate<T extends {} = TRecord, V = TResult>(table: TTable, option?: AnyPaginationOption<T, V>): Knex.QueryBuilder<T, V>;
  protected qbPaginate<T extends {} = TRecord, V = TResult>(table: TTable, option?: AnyPaginationOption<T, V>): Knex.QueryBuilder<T, V> {
    const opt = Object.assign({}, option);
    return this.qb<T, V>(table, opt)
      .modify((qb) => {
        // cursor
        if (opt?.order && "cursor_column" in opt && opt.cursor_column && opt?.cursor_comparator) {
          let cursor_value = opt?.cursor_value;
          if (!cursor_value) {
            if (opt?.order === "asc") {
              cursor_value ??= this.qbMin<T, any>(table, opt.cursor_column, opt); // subquery to find the first
            }
            else {
              cursor_value ??= this.qbMax<T, any>(table, opt.cursor_column, opt); // subquery to find the last
            }
          }

          qb.where(
            opt?.disablePrependTableName
            ? opt.cursor_column
            : this.prependTableName(table, opt.cursor_column), opt.cursor_comparator, cursor_value
          )
        }

        if ("page_size" in opt && opt?.page_size) {
          const extra = opt?.disablePageSizePlusOne ? 0 : 1;
          qb.limit(opt.page_size + extra);

          // offset
          if ("offset" in opt && opt.offset) {
            qb.offset(opt.offset);
          }
        }

        return qb;
      });
  }
};

type ExtraSelectOption = {
  disablePrependTableName?: boolean;
};

export type ExtraPaginationOption = ExtraSelectOption & {
  disablePageSizePlusOne?: boolean;
};

export type AnyPaginationOption<T extends {} = any, V = any[]> =
  (Partial<ICursorPaginationOption<T, V>> | Partial<IOffsetPaginationOption<T, V>> | SelectOption2<T, V>)
  & ExtraPaginationOption;
