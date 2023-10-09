import { Trace } from "./trace.js";

export class NotFoundError extends Error {
  resource_name: string;
  trace?: Trace;

  constructor(resource_name: string, trace?: Trace) {
    super();
    this.name = "NotFoundError";
    this.resource_name = resource_name;
    this.trace = trace;
    this.message = `The ${resource_name} not found.`;
  }
};
