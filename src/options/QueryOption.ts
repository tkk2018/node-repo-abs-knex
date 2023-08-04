import { Knex } from "knex";

export interface QueryOption<T = any> {
  /**
   * The dbreadonly instance will used if this is true.
   */
  readonly?: boolean;

  trx?: Knex.Transaction;

  /**
   * SELECT * FROM table FOR UPDATE;
   */
  for_update?: boolean;

  order?: "asc" | "desc";

  order_by?: Extract<keyof T, string>;
};

export type SelectOption<T = any> = QueryOption<T>;

export type DeleteOption = Pick<QueryOption<never>, "trx"> & { readonly: false };

export type InsertOption = DeleteOption;

export type UpdateOption = DeleteOption;

/**
 * @param {boolean} after Indicate whether this process is after insert, update or delete.
 */
export function createSelectOption(trx?: Knex.Transaction, after?: boolean): QueryOption {
  return { readonly: after ? false : true, trx };
};

export function createSelectForUpdateOption(trx: Knex.Transaction): QueryOption {
  return {
    readonly: false,
    for_update: true,
    trx,
  };
};

export function createInsertOption(trx?: Knex.Transaction): InsertOption {
  return { readonly: false, trx };
}

export function createUpdateOption(trx?: Knex.Transaction): UpdateOption {
  return { readonly: false, trx };
};

export function createDeleteOption(trx?: Knex.Transaction): DeleteOption {
  return { readonly: false, trx };
};
