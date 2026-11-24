import { defineComponent, h } from "vue";

/**
 * Presentation doubles for the Nuxt UI components the pages use. Each renders
 * plain HTML with the same props, slots, and v-model wiring, so page tests
 * assert what the user sees and does.
 */

const itemValue = (item: unknown): string | number => {
  if (typeof item === "number" || typeof item === "string") {
    return item;
  }
  if (typeof item === "object" && item !== null && "value" in item) {
    const value: unknown = item.value;
    return typeof value === "number" ? value : String(value ?? "");
  }
  return "";
};

const itemLabel = (item: unknown): string => {
  if (typeof item === "object" && item !== null && "label" in item) {
    const label: unknown = item.label;
    return label === undefined ? String(itemValue(item)) : String(label);
  }
  return String(item);
};

export const UInput = defineComponent({
  name: "UInput",
  props: { modelValue: { type: [String, Number], default: "" } },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    return () =>
      h("input", {
        value: props.modelValue,
        onInput: (event: Event) => {
          if (event.target instanceof HTMLInputElement) {
            emit("update:modelValue", event.target.value);
          }
        },
      });
  },
});

export const USelect = defineComponent({
  name: "USelect",
  props: {
    modelValue: { type: [String, Number], default: "" },
    items: { type: Array, default: () => [] },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    return () => {
      const items: readonly unknown[] = props.items;
      return h(
        "select",
        {
          onChange: (event: Event) => {
            if (!(event.target instanceof HTMLSelectElement)) {
              return;
            }
            const picked = items.find((item) => String(itemValue(item)) === event.target.value);
            if (picked !== undefined) {
              emit("update:modelValue", itemValue(picked));
            }
          },
        },
        items.map((item) =>
          h(
            "option",
            {
              value: String(itemValue(item)),
              selected: String(itemValue(item)) === String(props.modelValue),
            },
            itemLabel(item),
          ),
        ),
      );
    };
  },
});

export const UButton = defineComponent({
  name: "UButton",
  props: {
    label: { type: String, default: "" },
    disabled: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    type: { type: String, default: "button" },
    variant: { type: String, default: "solid" },
    color: { type: String, default: "primary" },
  },
  emits: ["click"],
  setup(props, { slots, emit }) {
    return () =>
      h(
        "button",
        {
          type: props.type,
          disabled: props.disabled,
          onClick: (event: MouseEvent) => emit("click", event),
        },
        slots.default?.() ?? props.label,
      );
  },
});

export const UAlert = defineComponent({
  name: "UAlert",
  props: {
    title: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  setup(props, { slots }) {
    return () =>
      h("div", { role: "status" }, [
        slots.title !== undefined || props.title !== ""
          ? h("p", {}, slots.title?.() ?? props.title)
          : null,
        props.description !== "" ? h("p", {}, props.description) : null,
        slots.default?.(),
      ]);
  },
});

export const UBadge = defineComponent({
  name: "UBadge",
  props: { color: { type: String, default: "neutral" } },
  setup(_, { slots }) {
    return () => h("span", {}, slots.default?.());
  },
});

export const UFormField = defineComponent({
  name: "UFormField",
  props: {
    label: { type: String, default: "" },
    description: { type: String, default: "" },
    error: { type: String, default: "" },
  },
  setup(props, { slots }) {
    return () =>
      h("div", [
        props.label !== "" ? h("span", props.label) : null,
        slots.default?.(),
        props.description !== "" ? h("p", props.description) : null,
        props.error !== "" ? h("p", { role: "alert" }, props.error) : null,
      ]);
  },
});

export const UModal = defineComponent({
  name: "UModal",
  props: {
    open: { type: Boolean, default: false },
    title: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  emits: ["update:open"],
  setup(props, { slots }) {
    return () =>
      props.open
        ? h("div", { role: "dialog" }, [
            h("p", props.title),
            props.description !== "" ? h("p", props.description) : null,
            slots.footer?.(),
          ])
        : null;
  },
});

export const uiComponents = {
  UAlert,
  UBadge,
  UButton,
  UFormField,
  UInput,
  UModal,
  USelect,
};
