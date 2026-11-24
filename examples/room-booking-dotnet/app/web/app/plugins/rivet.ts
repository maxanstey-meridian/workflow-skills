import { configureRivet } from "@cowork/contracts";
import { createPersonaFetch, devUserHeader, usePersona } from "~/features/session";

// Configures the generated client once at app startup. Every request carries
// the current persona as the dev authentication header, read per request so
// a persona switch applies to everything sent afterwards.
export default defineNuxtPlugin(() => {
  const session = usePersona();
  configureRivet({
    baseUrl: "http://localhost:5199",
    fetch: createPersonaFetch(() => devUserHeader(session.persona.value)),
  });
});
