import type { ProfileField } from "@/lib/profile-validation";

export type ProfileFormState = {
  fieldErrors?: Partial<Record<ProfileField, string>>;
  /** Settings: the height changed, so the user must confirm before it saves. */
  confirmHeight?: boolean;
  /** Settings: confirmation after saving. */
  message?: string;
};

export const initialProfileFormState: ProfileFormState = {};
