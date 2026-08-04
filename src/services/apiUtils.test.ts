import { describe, expect, it } from "vitest";
import {
  extractApiError,
  normalizeApiList,
  unwrapApiData,
} from "./apiUtils.ts";

describe("API response compatibility", () => {
  it("unwraps wrapped responses", () =>
    expect(unwrapApiData({ success: true, data: { id: "1" } })).toEqual({
      id: "1",
    }));
  it("preserves direct serializer responses", () =>
    expect(unwrapApiData({ id: "1" })).toEqual({ id: "1" }));
  it("normalizes plain arrays", () =>
    expect(normalizeApiList([{ id: "1" }])).toEqual([{ id: "1" }]));
  it("normalizes paginated arrays", () =>
    expect(
      normalizeApiList({
        count: 1,
        next: null,
        previous: null,
        results: [{ id: "1" }],
      }),
    ).toEqual([{ id: "1" }]));
  it("extracts field and non-field errors", () => {
    const error = {
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          email: ["Already used."],
          non_field_errors: ["Invalid request."],
        },
      },
    };
    expect(extractApiError(error)).toMatchObject({
      status: 400,
      message: "Invalid request.",
      fields: { email: ["Already used."] },
    });
  });
});
