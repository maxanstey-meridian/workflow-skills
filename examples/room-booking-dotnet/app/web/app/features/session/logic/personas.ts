export type PersonaRole = "staff" | "member";

export interface Persona {
  readonly name: string;
  readonly email: string;
  readonly role: PersonaRole;
}

const maya: Persona = { name: "Maya", email: "maya@cowork.test", role: "staff" };
const alex: Persona = { name: "Alex", email: "alex@cowork.test", role: "member" };
const sam: Persona = { name: "Sam", email: "sam@cowork.test", role: "member" };

/** The development personas the API's dev authentication accepts. */
export const personas: readonly Persona[] = [maya, alex, sam];

export const defaultPersona: Persona = maya;

export const devUserHeader = (persona: Persona): string => `${persona.role}:${persona.email}`;

export const personaByEmail = (email: string): Persona | undefined =>
  personas.find((persona) => persona.email === email);
