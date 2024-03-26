import { Knex } from "knex";

export interface QueryOption {
  /**
   * The dbreadonly instance will used if this is true.
   */
  readonly?: boolean | null;

  trx?: Knex.Transaction | null;
};

export interface BaseSelectOption<T = any> {
  /**
   * SELECT * FROM table FOR UPDATE;
   */
  for_update?: boolean | null;

  order?: "asc" | "desc" | null;

  order_by?: Extract<keyof T, string> | null;
}

export type SelectOption<T = any> = QueryOption & BaseSelectOption<T>;

export type DeleteOption = Pick<QueryOption, "trx"> & { readonly?: never };

export type InsertOption = Pick<QueryOption, "trx"> & { readonly?: never };

export type UpdateOption = Pick<QueryOption, "trx"> & { readonly?: never };

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
