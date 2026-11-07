import { inject, provide, type InjectionKey } from "vue";
import type { UserView, UserRoleWire } from "../api";

/** The identity the demo frontend acts as. A real deployment replaces this with real auth. */
export interface UserChoice {
  readonly id: string;
  readonly name: string;
  readonly role: UserRoleWire;
}

export interface IdentityPort {
  /** All seeded identities, loaded once from /api/users. */
  readonly users: readonly UserChoice[];
  /** Who the app is currently signed in as, or null before the first sign-in. */
  readonly current: UserChoice | null;
  /** Set the acting identity. */
  readonly signIn: (choice: UserChoice) => void;
}

export const toChoice = (user: UserView): UserChoice => ({
  id: user.id,
  name: user.name,
  role: user.role,
});

const key: InjectionKey<IdentityPort> = Symbol("Identity");

export const provideIdentity = (implementation: IdentityPort): IdentityPort => {
  provide(key, implementation);
  return implementation;
};

export const injectIdentity = (): IdentityPort => {
  const identity = inject(key);
  if (identity === undefined) {
    throw new Error("Identity was not provided by a composition root");
  }
  return identity;
};
