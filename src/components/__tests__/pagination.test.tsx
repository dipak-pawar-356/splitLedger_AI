import { describe, it, expect } from "vitest";
import { getPageNumbers } from "../pagination";

describe("Pagination Helper", () => {
  it("should return all page numbers when totalPages <= maxVisiblePages", () => {
    const pages = getPageNumbers(1, 4, 5);
    expect(pages).toEqual([1, 2, 3, 4]);
  });

  it("should return start ellipsis format when near beginning of many pages", () => {
    const pages = getPageNumbers(1, 10, 5);
    expect(pages).toEqual([1, 2, 3, 4, "...", 10]);
  });

  it("should return end ellipsis format when near end of many pages", () => {
    const pages = getPageNumbers(9, 10, 5);
    expect(pages).toEqual([1, "...", 7, 8, 9, 10]);
  });

  it("should return both ellipses when in the middle of many pages", () => {
    const pages = getPageNumbers(5, 10, 5);
    expect(pages).toEqual([1, "...", 4, 5, 6, "...", 10]);
  });

  it("should handle single page correctly", () => {
    const pages = getPageNumbers(1, 1, 5);
    expect(pages).toEqual([1]);
  });
});
