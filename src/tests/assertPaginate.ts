import assert, { type AssertionError } from "node:assert";

type AssertPaginateMeta = {
  expected_total_data: number,
  page_size: number,
  extra_row: number,
};

type AssertPaginateNextFunction<T = any, M extends AssertPaginateMeta = AssertPaginateMeta>
  = (offset: number, cursor: T | undefined, meta: M) => Promise<T[]>;

/**
 * Assert that a paginated data source (cursor or offset based) returns the correct number of rows per page,
 * and that the pagination ends exactly where expected.
 *
 * @example
 *
 * const expected_total_data = repo.count();
 * const page_size = 10;
 * const extra_row = 1;
 *
 * // cursor
 * await assertPaginatedData<User>(async (_, cursor, meta) => {
 *   return repo.select({
 *     created_at_from: "2025-01-01T00:00:00.000Z",
 *     created_at_to: "2025-01-31T23:59:59.999Z",
 *   }, CursorPaginationOption.from({
 *     trx,
 *     page_size: meta.page_size,
 *     cursor_value: cursor?.user_id,
 *     cursor_column: "user_id",
 *   }));
 * }, {
 *   page_size,
 *   extra_row,
 *   expected_total_data,
 * });
 *
 * // offset
 * await assertPaginatedData<User>(async (offset, _, meta) => {
 *   return repo.select({
 *     created_at_from: "2025-01-01T00:00:00.000Z",
 *     created_at_to: "2025-01-31T23:59:59.999Z",
 *   }, OffsetPaginationOption.from({
 *     trx,
 *     page_size: meta.page_size,
 *     offset,
 *   }));
 * }, {
 *   page_size,
 *   extra_row,
 *   expected_total_data,
 * });
 *
 * @throws {AssertionError} when an assertion fails, see {@link AssertionError}.
 * @throws {Error} when the pagination state is invalid
 */
export async function assertPaginate<T = any, M extends AssertPaginateMeta = AssertPaginateMeta>(
  next: AssertPaginateNextFunction<T, M>,
  meta: M
) {
  const expected_total_pages = Math.ceil(meta.expected_total_data / meta.page_size);

  let cursor: T | undefined = undefined;
  let offset = 0;
  let current_page = 0;

  do {
    const data = await next(offset, cursor, meta);
    current_page++;

    // Assert each page:
    // - If it is not the last page, the row count should equal page_size + extra_row.
    // - If it is the last page, the row count should equal the remaining items.
    // - Otherwise, this state should be impossible.
    if (current_page < expected_total_pages) {
      assert.equal(data.length, meta.page_size + meta.extra_row);
    }
    else if (current_page === expected_total_pages) {
      let remaining = meta.expected_total_data - (expected_total_pages - 1) * meta.page_size;
      assert.equal(data.length, remaining);
    }
    else {
      throw new Error("current_page > expected_total_pages. This should not happen.");
    }

    // Check whether there is a next page:
    // - If the size equals page_size + extra_row, then there is a next page.
    // - Otherwise, no more pages should remain.
    const has_next = data.length === (meta.page_size + meta.extra_row)
    if (has_next) {
      const last = data.at(-1);
      assert.ok(last, "Unexpected empty page");
      cursor = last;
      offset = offset + data.length - meta.extra_row;
    }
    else {
      assert.equal(current_page, expected_total_pages);
    }
  } while (current_page < expected_total_pages)

  assert.equal(expected_total_pages, current_page);
};
