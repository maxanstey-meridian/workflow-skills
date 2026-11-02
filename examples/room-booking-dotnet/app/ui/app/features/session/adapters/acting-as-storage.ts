// Dev auth has no sign-in: every request carries the acting user's email, chosen
// in the browser and persisted there. A fresh browser starts as the seeded
// member — the API needs the header on /api/users too, so there is no
// "not signed in yet" screen to pick from.
const STORAGE_KEY = "roombooking:acting-as";
const DEFAULT_ACTING_AS_EMAIL = "ben@roombooking.dev";

export const readActingAsEmail = (): string | null => {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored ?? DEFAULT_ACTING_AS_EMAIL;
};

export const writeActingAsEmail = (email: string): void => {
  window.localStorage.setItem(STORAGE_KEY, email);
};
