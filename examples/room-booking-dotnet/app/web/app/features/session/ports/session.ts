import type { Ref } from "vue";
import { useProvideInject } from "~/shared/use-provide-inject";
import type { Persona } from "../logic/personas";

/**
 * The signed-in persona. The header switcher changes it; every API request
 * carries it as the dev authentication header.
 */
export interface Session {
  readonly persona: Ref<Persona>;
  readonly personas: readonly Persona[];
  readonly selectPersona: (persona: Persona) => void;
}

export const [injectSession, provideSession] = useProvideInject<Session>("Session");
