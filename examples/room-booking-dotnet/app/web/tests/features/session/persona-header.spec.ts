import type { RivetFetch } from "@cowork/contracts";
import { mount } from "@vue/test-utils";
import { beforeEach, expect, test } from "vitest";
import { defineComponent, h, onMounted } from "vue";
import { createPersonaFetch, devUserHeader, usePersona, type Persona } from "~/features/session";
import { resetNuxtState } from "../../support/nuxt-state";

beforeEach(() => {
  resetNuxtState();
});

test("switching persona changes the header the client sends", async () => {
  const sentHeaders: string[] = [];
  const send: RivetFetch = async (input) => {
    sentHeaders.push(input.headers.get("X-Dev-User") ?? "");
    return new Response("{}", { status: 200 });
  };

  let sendWithPersona: RivetFetch | undefined;
  let switchPersona: ((persona: Persona) => void) | undefined;

  const Host = defineComponent({
    setup() {
      const session = usePersona();
      sendWithPersona = createPersonaFetch(() => devUserHeader(session.persona.value), send);
      switchPersona = session.selectPersona;
      onMounted(() => {
        void sendWithPersona?.(new Request("http://localhost:5199/api/rooms"));
      });
      return () => h("div");
    },
  });

  mount(Host);
  await flushRequests();

  if (switchPersona === undefined || sendWithPersona === undefined) {
    throw new Error("the host component did not set up the persona session");
  }

  expect(sentHeaders).toEqual(["staff:maya@cowork.test"]);

  const sam = switchPersona;
  const sendAgain = sendWithPersona;

  const personas = usePersona().personas;
  const samPersona = personas.find((persona) => persona.name === "Sam");
  if (samPersona === undefined) {
    throw new Error("the Sam persona is missing");
  }
  sam(samPersona);

  await sendAgain(new Request("http://localhost:5199/api/bookings/mine"));

  expect(sentHeaders).toEqual(["staff:maya@cowork.test", "member:sam@cowork.test"]);
});

const flushRequests = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};
