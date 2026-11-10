import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import { useProvideInject } from "../../app/shared/use-provide-inject";

interface Greeting {
  hello(): string;
}

const [injectGreeting, provideGreeting] = useProvideInject<Greeting>("Greeting");

describe("useProvideInject", () => {
  it("throws when a component injects outside a provider", () => {
    const Child = defineComponent({
      setup() {
        injectGreeting();
        return () => h("div");
      },
    });
    expect(() => mount(Child)).toThrow("[Context:Greeting]");
  });

  it("returns the exact implementation the root provided", () => {
    const implementation = { hello: () => "hi" };
    let injected: Greeting | undefined;

    const Child = defineComponent({
      setup() {
        injected = injectGreeting();
        return () => h("div");
      },
    });
    const Root = defineComponent({
      setup() {
        const provided = provideGreeting(implementation);
        expect(provided).toBe(implementation);
        return () => h("div", [h(Child)]);
      },
    });

    mount(Root);
    expect(injected).toBe(implementation);
  });
});
