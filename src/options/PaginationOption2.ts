import { Knex } from "knex";
import { SelectOption2 } from "./QueryOption.js";

interface PaginationOptionBase {
  page_size: number;
};

interface CursorPaginationOptionBase<C extends string = string> {
  cursor_column: C;
};

export interface ICursorPaginationOption<
  T extends {} = any,
  V = any[],
  O extends string = Extract<keyof T, string>,
  C extends string = Extract<keyof T, string>,
>extends SelectOption2<T, V, O>, CursorPaginationOptionBase<C>, PaginationOptionBase {
  cursor_column: C;
  cursor_comparator: string;
  cursor_value?: boolean | number | string | Knex.QueryBuilder | undefined | null;

  order: "asc" | "desc";
  order_by: O;
  page_size: number;

  readonly?: boolean | null | undefined;
  for_update?: boolean | null | undefined;
  trx?: Knex.Transaction<T, V> | null | undefined;
};

export class CursorPaginationOption<
  T extends {} = any,
  V = any[],
  O extends string = Extract<keyof T, string>,
  C extends string = Extract<keyof T, string>,
> implements ICursorPaginationOption<T, V, O, C> {
  page_size: number;
  cursor_column: C;
  cursor_comparator: string;
  cursor_value?: boolean | number | string | Knex.QueryBuilder | undefined | null;

  order: "asc" | "desc";
  order_by: O;

  readonly?: boolean | null | undefined;
  trx?: Knex.Transaction<T, V> | null | undefined;
  for_update?: boolean | null | undefined;

  static from<
    T extends {} = any,
    V = any[],
    O extends Extract<keyof T, string> = Extract<keyof T, string>,
    C extends Extract<keyof T, string> = O,
  >(option: Partial<ICursorPaginationOption<T, V>> & CursorPaginationOptionBase<C>): CursorPaginationOption<T, V, O, C> {
    const page_size = (option?.page_size && option.page_size > 0) ? option.page_size : 0;
    const order = "desc" === option?.order ? "desc" : "asc"; // default asc
    // default to cursor_column
    const order_by = option?.order_by ?? option.cursor_column;
    const cursor_comparator = order === "asc"
      ? ">="
      : "<="
      ;

    return new CursorPaginationOption<T, V, O, C>(Object.assign({}, option, {
      cursor_comparator,
      page_size,
      order,
      order_by: order_by as O, // FIXME: how to do without cast?
    }));
  }

  constructor(param: ICursorPaginationOption<T, V, O, C>) {
    this.cursor_column = param.cursor_column;
    this.cursor_comparator = param.cursor_comparator;
    this.cursor_value = param.cursor_value;
    this.order = param.order;
    this.order_by = param.order_by;
    this.page_size = param.page_size;
    this.readonly = param.readonly;
    this.for_update = param.for_update;
    this.trx = param.trx;
  }
};

interface OffsetPaginationOptionBase {
  offset: number;
};

export interface IOffsetPaginationOption<
  T extends {} = any,
  V = any[],
  O extends string = Extract<keyof T, string>,
> extends SelectOption2<T, V, O>, OffsetPaginationOptionBase, PaginationOptionBase {
  page_size: number;

  order?: "asc" | "desc";
  order_by?: O;

  readonly?: boolean | null | undefined;
  for_update?: boolean | null | undefined;
  trx?: Knex.Transaction<T, V> | null | undefined;
};

export class OffsetPaginationOption<
  T extends {} = any,
  V = any[],
  O extends string = Extract<keyof T, string>,
> implements IOffsetPaginationOption<T, V, O> {
  page_size: number;
  offset: number;

  order?: "asc" | "desc";
  order_by?: O;

  readonly?: boolean | null | undefined;
  for_update?: boolean | null | undefined;
  trx?: Knex.Transaction<T, V> | null | undefined;

  static from<
    T extends {} = any,
    V = any[],
    O extends string = Extract<keyof T, string>,
  >(option: Partial<IOffsetPaginationOption<T, V, O>> & OffsetPaginationOptionBase ): OffsetPaginationOption<T, V, O> {
    const page_size = (option?.page_size && option.page_size > 0) ? option.page_size : 0;
    return new OffsetPaginationOption<T, V, O>(Object.assign({}, option, {
      page_size,
    }));
  }

  constructor(param: IOffsetPaginationOption<T, V, O>) {
    this.offset = param.offset;
    this.order = param.order;
    this.order_by = param.order_by;
    this.page_size = param.page_size;
    this.readonly = param.readonly;
    this.for_update = param.for_update;
    this.trx = param.trx;
  }
};
