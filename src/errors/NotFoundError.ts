import { Trace } from "./trace.js";

export class NotFoundError<T extends Trace = Trace>  extends Error {
  resource_name: string;
  trace?: T;

  constructor(resource_name: string, trace?: T) {
    super();
    this.name = "NotFoundError";
    this.resource_name = resource_name;
    this.trace = trace;
    this.message = `The ${resource_name} not found.`;
  }
};
