/** Thrown by every function Naz hasn't written yet. Tests fail until she does. */
export function todo(what: string): never {
  throw new Error(`TODO(Naz): ${what}`);
}
