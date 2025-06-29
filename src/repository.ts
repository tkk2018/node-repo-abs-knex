import { Knex } from "knex";
import {
  CPaginationOption,
  QueryOption,
  SelectOption,
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
  ): Knex.QueryBuilder<T, { max: V }> {
    return this.qb<T>(table, opt)
      .max(opt?.disablePrependTableName ? column: this.prependTableName(table, column), { as: "max" })
      .first() as Knex.QueryBuilder<T, { max: V }>; // FIXME: type cast
  }

  /**
   * Cursor-based pagination. By default, this will return `${page_size + 1}` of data.
   * If the page_size is less than or equal to 0, it will be treated as undefined, which will result in returning all.
   *
   * @param table The name of table.
   * @param id_column The primary column name.
   * @param opt The option for query.
   * @example
   * // the very first time
   * const r1 = await qbCPaginate("users", "user_id", {
   *   order: "desc",
   *   page_size: 10,
   * });
   *
   * if (r1.length > 10) {
   *   // has next, subsequence
   *   const r2 = await qbCPaginate("users", "user_id", {
   *     order: "desc",
   *     page_size: 10,
   *     start_id: r1[r1.length - 1].user_id,
   *   })
   *   // can continue build the query
   *     .select("user_id", "name");
   * }
   */
  protected qbCPaginate<T extends {} = TRecord, V = TResult>(
    table: TTable,
    id_column: Extract<keyof T, string>,
    opt?: SelectOption & CPaginationOption & { disablePrependTableName?: boolean; disablePageSizePlusOne?: boolean },
  ): Knex.QueryBuilder<T, V> {
    const page_size = (opt?.page_size && opt.page_size > 0) ? opt.page_size : 0;
    const order = "desc" === opt?.order ? "desc" : "asc"; // default asc

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
      .orderBy(opt?.disablePrependTableName ? id_column : this.prependTableName(table, id_column), order)
      .modify((qb) => {
        if (page_size) {
          const extra = opt?.disablePageSizePlusOne ? 0 : 1;
          qb.limit(page_size + extra);
        }
      });
  }
};
