/**
 * Server refusals carry a user-facing message; banners quote it verbatim. Falls
 * back to given copy when the body has none (transport-level refusals).
 */
export const serverRefusalText = (error: unknown, fallback: string): string => {
  if (typeof error === "object" && error !== null && "message" in error) {
    const shape: { message?: unknown } = error;
    if (typeof shape.message === "string" && shape.message !== "") {
      return shape.message;
    }
  }
  return fallback;
};
