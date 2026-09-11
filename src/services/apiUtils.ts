import axios from "axios";
import type { ApiEnvelope, PaginatedResponse } from "../types/api.ts";

export const isApiEnvelope = <T>(value: unknown): value is ApiEnvelope<T> =>
  Boolean(
    value && typeof value === "object" && "success" in value && "data" in value,
  );

export const unwrapApiData = <T>(value: T | ApiEnvelope<T>): T =>
  isApiEnvelope<T>(value) ? value.data : value;

export const isPaginatedResponse = <T>(
  value: unknown,
): value is PaginatedResponse<T> =>
  Boolean(
    value &&
    typeof value === "object" &&
    Array.isArray((value as PaginatedResponse<T>).results),
  );

export const normalizeApiList = <T>(
  value: T[] | PaginatedResponse<T> | ApiEnvelope<T[] | PaginatedResponse<T>>,
): T[] => {
  const unwrapped = unwrapApiData(value);
  return isPaginatedResponse<T>(unwrapped) ? unwrapped.results : unwrapped;
};

export interface ApiErrorDetails {
  status?: number;
  message: string;
  fields: Record<string, string[]>;
}
const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.flatMap(strings)
    : typeof value === "string"
      ? [value]
      : value && typeof value === "object"
        // Some views (e.g. ProfileView) wrap field errors one level deep as
        // {success, message, errors: {field: [...]}} rather than the flat
        // {field: [...]} DRF default — recurse so those field-level
        // messages aren't silently dropped.
        ? Object.values(value).flatMap(strings)
        : [];

export function extractApiError(error: unknown): ApiErrorDetails {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  const body: unknown = axios.isAxiosError(error)
    ? error.response?.data
    : undefined;
  const fields: Record<string, string[]> = {};
  if (body && typeof body === "object") {
    Object.entries(body as Record<string, unknown>).forEach(([key, value]) => {
      const messages = strings(value);
      if (messages.length) fields[key] = messages;
    });
  }
  const firstFieldMessage = Object.values(fields)[0]?.[0];
  const message =
    fields.non_field_errors?.[0] ||
    fields.detail?.[0] ||
    fields.errors?.[0] ||
    fields.message?.[0] ||
    (status === 403
      ? "You do not have permission to perform this action."
      : status === 404
        ? "The requested record was not found."
        : status === 409
          ? "This conflicts with an existing record."
          : status === 429
            ? "Too many requests. Please wait and try again."
            : firstFieldMessage ||
              (status
                ? `The request failed (${status}). Please try again.`
                : "Unable to reach League OS. Please try again."));
  return { status, message, fields };
}
