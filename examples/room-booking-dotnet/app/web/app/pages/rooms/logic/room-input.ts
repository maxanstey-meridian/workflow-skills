import type { FieldErrors } from "~/shared/error-envelope";

/**
 * Places a per-field error message with its field, however the server spelled
 * the field key ("Name" or "name"). Returns undefined when the server sent no
 * messages for that field.
 */
export const fieldMessage = (errors: FieldErrors, field: string): string | undefined => {
  const messages = Object.entries(errors).find(
    ([key]) => key.toLowerCase() === field.toLowerCase(),
  );
  if (messages === undefined) {
    return undefined;
  }
  return messages[1].join(" ");
};

/** The fast client-side check: are both parts of the room filled in? */
export const roomInputErrors = (name: string, capacity: string): FieldErrors => {
  const errors: Record<string, string[]> = {};
  if (name.trim() === "") {
    errors.Name = ["Enter a name for the room."];
  }
  if (capacity.trim() === "" || Number.isNaN(Number(capacity))) {
    errors.Capacity = ["Enter a capacity."];
  }
  return errors;
};
