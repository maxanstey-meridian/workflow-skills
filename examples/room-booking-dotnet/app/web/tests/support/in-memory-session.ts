import { ref } from "vue";
import { defaultPersona, personas, type Persona, type Session } from "~/features/session";

export const inMemorySession = (start: Persona = defaultPersona): Session => {
  const persona = ref<Persona>(start);
  return {
    persona,
    personas,
    selectPersona: (next) => {
      persona.value = next;
    },
  };
};
