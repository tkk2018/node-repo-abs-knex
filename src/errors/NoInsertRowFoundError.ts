import { Trace } from "./trace.js";

export class NoInsertRowFoundError extends Error {
  resource_name: string;
  trace?: Trace;

  constructor(resource_name: string, trace?: Trace) {
    super();
    this.name = "NoInsertRowFoundError";
    this.resource_name = resource_name;
    this.trace = trace;
    this.message = `None of ${resource_name} was inserted.`;
  }
};
