import { describe, expect, it } from "vitest";
import { detectDateType, findDates } from "@/lib/date-ocr";

const y = new Date().getFullYear() + 1;

describe("findDates", () => {
  it("reads DD/MM/YYYY and DD-MM-YYYY day-first", () => {
    expect(findDates(`BEST BEFORE 05/03/${y}`)[0]?.iso).toBe(`${y}-03-05`);
    expect(findDates(`exp 28-11-${y}`)[0]?.iso).toBe(`${y}-11-28`);
  });
  it("reads YYYY-MM-DD", () => expect(findDates(`LOT 44 ${y}-07-14`)[0]?.iso).toBe(`${y}-07-14`));
  it("reads English month names", () => {
    expect(findDates(`Use by 12 MAR ${y}`)[0]?.iso).toBe(`${y}-03-12`);
    expect(findDates(`Best before September 3, ${y}`)[0]?.iso).toBe(`${y}-09-03`);
  });
  it("rejects impossible or implausible dates", () => {
    expect(findDates(`31/02/${y}`)).toEqual([]);
    expect(findDates("Batch 12/99/1980 tel 555-1234")).toEqual([]);
  });
  it("detects date type", () => {
    expect(detectDateType("BEST BEFORE END")).toBe("best_before");
    expect(detectDateType("Use by:")).toBe("use_by");
    expect(detectDateType("hello")).toBeNull();
  });
});
