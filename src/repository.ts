
import { Knex } from "knex";

export interface RepositoryConstructorParams<TRecord extends {} = any, TResult = any[]> {
  dbmain: Knex<TRecord, TResult>;
  dbreadonly?: Knex<TRecord, TResult>;
};

export abstract class Repository<TRecord extends {} = any, TResult = any[]> {
  protected readonly dbmain: Knex<TRecord, TResult>;
  protected readonly dbreadonly: Knex<TRecord, TResult>;

  constructor(params: RepositoryConstructorParams<TRecord, TResult>) {
    this.dbmain = params.dbmain;
    this.dbreadonly = params.dbreadonly ?? params.dbmain;
  }
};
