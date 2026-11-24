import type { components } from "@cowork/contracts";

/** The one failure envelope every declared API failure uses. */
export type ErrorEnvelope = components["schemas"]["ErrorResponse"];

/** Per-field messages, keyed by the field name the server validated. */
export type FieldErrors = Readonly<Record<string, readonly string[]>>;

export const fieldErrorsOf = (errors: ErrorEnvelope["errors"]): FieldErrors => errors ?? {};

export const unreachableMessage =
  "The booking service could not be reached. Check your connection and try again.";
