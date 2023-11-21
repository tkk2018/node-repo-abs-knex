export interface Trace {
  /**
   * Request reference ID
   */
  reference_id?: string;

  /**
   * SQL/Query statement
   */
  statement?: string;

  /**
   * User readable message
   */
  description?: string;
};
