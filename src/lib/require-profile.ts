/**
 * The page-load profile check. Every protected page calls this (enforced by
 * src/lib/require-profile.guard.test.ts). Exempt pages: the sign-in pages,
 * /update-password, and /profile/setup itself.
 *
 *   signed out          → /sign-in
 *   signed in, no profile → /profile/setup
 *   otherwise           → returns the user and their profile
 */

import "server-only";
import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/data/profiles";

export async function requireProfile() {
  const result = await getMyProfile();
  if (!result) redirect("/sign-in");
  if (!result.profile) redirect("/profile/setup");
  return { user: result.user, profile: result.profile };
}
