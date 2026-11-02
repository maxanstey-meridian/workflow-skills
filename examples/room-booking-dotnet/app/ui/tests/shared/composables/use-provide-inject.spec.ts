import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { useProvideInject } from "~/shared/composables/useProvideInject";

describe("useProvideInject", () => {
  it("injects what an ancestor provided", () => {
    const [injectThing, provideThing] = useProvideInject<{ label: string }>("Thing");

    const Child = defineComponent({
      setup() {
        const thing = injectThing();
        return () => h("p", thing.label);
      },
    });

    const Parent = defineComponent({
      setup() {
        provideThing({ label: "provided" });
        return () => h(Child);
      },
    });

    const wrapper = mount(Parent);
    expect(wrapper.text()).toBe("provided");
  });

  it("keeps the concrete implementation on the providing side", () => {
    const [injectThing, provideThing] = useProvideInject<{ label: string }>("Thing");

    const implementation = { label: "provided", extra: 1 };
    let provided: { label: string; extra: number } | undefined;

    const Child = defineComponent({
      setup() {
        const thing = injectThing();
        return () => h("p", thing.label);
      },
    });

    const Parent = defineComponent({
      setup() {
        provided = provideThing(implementation);
        return () => h(Child);
      },
    });

    expect(mount(Parent).text()).toBe("provided");
    expect(provided).toBe(implementation);
    expect(provided?.extra).toBe(1);
  });

  it("throws when nothing provides above", () => {
    const [injectThing] = useProvideInject<{ label: string }>("Missing");

    const Lone = defineComponent({
      setup() {
        return () => {
          expect(() => injectThing()).toThrowError(/\[Context:Missing\]/);
          return h("p", "lone");
        };
      },
    });

    const wrapper = mount(Lone);
    expect(wrapper.text()).toBe("lone");
  });
});
