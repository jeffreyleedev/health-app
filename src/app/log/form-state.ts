export type EntryFormState = {
  fieldErrors?: Partial<Record<string, string>>;
  /** Set when the save was refused because the profile doesn't exist. */
  noProfile?: boolean;
  /** Confirmation after a successful save. */
  message?: string;
  /** What the user typed, so a failed save doesn't wipe the form. */
  values?: Record<string, string>;
};

export const initialEntryFormState: EntryFormState = {};

/** Result of editing one entry from the recent list. */
export type EditFormState = {
  fieldErrors?: Partial<Record<string, string>>;
  error?: string;
  ok?: boolean;
};

export const initialEditFormState: EditFormState = {};

/** What a delete removed, kept in the browser so Undo can re-save it. */
export type DeletedEntry =
  | { kind: "weighIn"; date: string; weightKg: number }
  | { kind: "calories"; date: string; calories: number };
