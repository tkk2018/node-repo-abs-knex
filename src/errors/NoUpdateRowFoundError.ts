import { Trace } from "./trace.js";

export class NoUpdateRowFoundError<T extends Trace = Trace>  extends Error {
  resource_name: string;
  trace?: T;

  constructor(resource_name: string, trace?: T) {
    super();
    this.name = "NoUpdateRowFoundError";
    this.resource_name = resource_name;
    this.trace = trace;
    this.message = `None of ${resource_name} was updated.`;
  }
};
