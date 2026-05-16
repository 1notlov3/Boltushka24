import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export type ApiErrorBody = {
  error: string;
  details?: unknown;
};

export function apiError(error: string, status = 400, details?: unknown) {
  return NextResponse.json<ApiErrorBody>({ error, details }, { status });
}

export function unauthorized(message = "Unauthorized") {
  return apiError(message, 401);
}

export function forbidden(message = "Forbidden") {
  return apiError(message, 403);
}

export function notFound(message = "Not found") {
  return apiError(message, 404);
}

export function validationError(error: ZodError) {
  return apiError(error.errors[0]?.message ?? "Validation error", 400, error.flatten());
}
