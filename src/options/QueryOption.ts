import { Knex } from "knex";

export interface QueryOption<TRecord extends {} = any, TResult = any[]> {
  /**
   * The dbreadonly instance will used if this is true.
   */
  readonly?: boolean | null;

  trx?: Knex.Transaction<TRecord, TResult> | null;
};

export interface BaseSelectOption<T = any> {
  /**
   * SELECT * FROM table FOR UPDATE;
   */
  for_update?: boolean | null;

  order?: "asc" | "desc" | null;

  order_by?: Extract<keyof T, string> | null;
};

export interface BaseSelectOption2<T extends string = string> {
  /**
   * SELECT * FROM table FOR UPDATE;
   */
  for_update?: boolean | null;

  order?: "asc" | "desc" | null;

  order_by?: T | null;
};

export interface SelectOption<T = any> extends BaseSelectOption<T>, QueryOption {};

export interface SelectOption2<T extends {} = any, V = any[], O extends string = Extract<keyof T, string>> extends BaseSelectOption2<O>, QueryOption<T, V> {};

export type DeleteOption<TRecord extends {} = any, TResult = any[]> = Pick<QueryOption<TRecord, TResult>, "trx"> & { readonly?: never };

export type InsertOption<TRecord extends {} = any, TResult = any[]> = Pick<QueryOption<TRecord, TResult>, "trx"> & { readonly?: never };

export type UpdateOption<TRecord extends {} = any, TResult = any[]> = Pick<QueryOption<TRecord, TResult>, "trx"> & { readonly?: never };

export function createSelectForUpdateOption(trx: Knex.Transaction): SelectOption {
  return {
    readonly: false,
    for_update: true,
    trx,
  };
};

export function createUpdateOption(trx?: Knex.Transaction): UpdateOption {
  return { trx };
};
