import { useState } from "nuxt/app";
import { computed } from "vue";
import { defaultPersona, personas, type Persona } from "../logic/personas";
import type { Session } from "../ports/session";

/** Owns the persona state; the key lives here and nowhere else. */
export const usePersona = () => {
  const email = useState<string>("session:persona-email", () => defaultPersona.email);
  const persona = computed(
    () => personas.find((candidate) => candidate.email === email.value) ?? defaultPersona,
  );
  const selectPersona = (next: Persona) => {
    email.value = next.email;
  };

  const implementation = { persona, personas, selectPersona };
  return implementation satisfies Session;
};
