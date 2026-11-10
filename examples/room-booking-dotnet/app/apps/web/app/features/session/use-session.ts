import { ref } from "vue";
import type { Ref } from "vue";
import { personas, setCurrentPersonaKey, type Persona } from "../../shared/personas";

export interface Session {
  readonly personas: readonly Persona[];
  readonly current: Ref<string>;
  setPersona(key: string): void;
  role(): "Staff" | "Member" | undefined;
}

export const useSession = (): Session => {
  const current = ref(personas[0]?.key ?? "ben");

  return {
    personas,
    current,
    setPersona(key: string) {
      current.value = key;
      setCurrentPersonaKey(key);
    },
    role() {
      return personas.find(persona => persona.key === current.value)?.role;
    },
  };
};
