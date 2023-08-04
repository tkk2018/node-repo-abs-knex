import { Trace } from "./trace.js";

export default class NoUpdateRowFoundError extends Error {
  resource_name: string;
  trace?: Trace;

  constructor(resource_name: string, trace?: Trace) {
    super();
    this.name = "NoUpdateRowFoundError";
    this.resource_name = resource_name;
    this.trace = trace;
    this.message = `None of ${resource_name} was updated.`;
  }
};
