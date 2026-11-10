import type { RivetFetch } from "@cowork/contracts";

/**
 * The acting dev persona. A real deployment replaces this with the signed-in user's
 * credentials; the API's policies and the pages stay unchanged.
 */
export interface Persona {
  readonly key: string;
  readonly name: string;
  readonly role: "Staff" | "Member";
}

export const personas: readonly Persona[] = [
  { key: "ada", name: "Ada", role: "Staff" },
  { key: "ben", name: "Ben", role: "Member" },
  { key: "cleo", name: "Cleo", role: "Member" },
];

const personaStore = { current: "ben" };

export const currentPersonaKey = (): string => personaStore.current;

export const setCurrentPersonaKey = (key: string): void => {
  personaStore.current = key;
};

/** Adds the dev persona header the API's security scheme names. */
export const personaFetch: RivetFetch = async (input: Request) => {
  const request = new Request(input);
  request.headers.set("X-Dev-User", personaStore.current);
  return fetch(request);
};
