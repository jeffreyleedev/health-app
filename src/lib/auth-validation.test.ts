import { describe, expect, it } from "vitest";
import {
  authConfirmUrl,
  formText,
  isPublicPath,
  isSignedOutOnlyPath,
  safeRedirectPath,
  validateEmail,
  validateNewPassword,
} from "./auth-validation";

describe("safeRedirectPath", () => {
  it("allows paths on this site", () => {
    expect(safeRedirectPath("/")).toBe("/");
    expect(safeRedirectPath("/update-password")).toBe("/update-password");
    expect(safeRedirectPath("/history?cadence=weekly")).toBe("/history?cadence=weekly");
  });

  it("rejects other sites and tricks, falling back to home", () => {
    expect(safeRedirectPath("https://evil.example")).toBe("/");
    expect(safeRedirectPath("//evil.example")).toBe("/");
    expect(safeRedirectPath("/\\evil.example")).toBe("/");
    expect(safeRedirectPath("javascript:alert(1)")).toBe("/");
    expect(safeRedirectPath("evil")).toBe("/");
  });

  it("uses the fallback when next is missing", () => {
    expect(safeRedirectPath(null)).toBe("/");
    expect(safeRedirectPath(undefined, "/sign-in")).toBe("/sign-in");
    expect(safeRedirectPath("")).toBe("/");
  });
});

describe("authConfirmUrl", () => {
  it("builds the confirm address from the request origin", () => {
    expect(authConfirmUrl("http://localhost:3000", "/")).toBe("http://localhost:3000/auth/confirm?next=%2F");
    expect(authConfirmUrl("https://health.example.com", "/update-password")).toBe(
      "https://health.example.com/auth/confirm?next=%2Fupdate-password",
    );
  });

  it("makes an unsafe next path safe", () => {
    expect(authConfirmUrl("http://localhost:3000", "//evil.example")).toBe(
      "http://localhost:3000/auth/confirm?next=%2F",
    );
  });

  it("rejects missing or non-web origins", () => {
    expect(authConfirmUrl(null, "/")).toBeNull();
    expect(authConfirmUrl("not a url", "/")).toBeNull();
    expect(authConfirmUrl("javascript:alert(1)", "/")).toBeNull();
  });
});

describe("public paths", () => {
  it("lets signed-out visitors reach the sign-in pages and email links", () => {
    for (const p of ["/sign-in", "/sign-up", "/forgot-password", "/auth/confirm", "/auth/error"]) {
      expect(isPublicPath(p), p).toBe(true);
    }
  });

  it("protects everything else", () => {
    for (const p of ["/", "/update-password", "/history", "/sign-in-trick", "/auth"]) {
      expect(isPublicPath(p), p).toBe(false);
    }
  });

  it("only sends signed-in users away from sign-in and sign-up", () => {
    expect(isSignedOutOnlyPath("/sign-in")).toBe(true);
    expect(isSignedOutOnlyPath("/sign-up")).toBe(true);
    expect(isSignedOutOnlyPath("/forgot-password")).toBe(false);
    expect(isSignedOutOnlyPath("/auth/confirm")).toBe(false);
  });
});

describe("validation", () => {
  it("checks email shape loosely", () => {
    expect(validateEmail("me@example.com").ok).toBe(true);
    expect(validateEmail("me@example").ok).toBe(false);
    expect(validateEmail("not an email").ok).toBe(false);
  });

  it("requires 8 to 72 bytes for new passwords", () => {
    expect(validateNewPassword("1234567").ok).toBe(false);
    expect(validateNewPassword("12345678").ok).toBe(true);
    expect(validateNewPassword("a".repeat(72)).ok).toBe(true);
    expect(validateNewPassword("a".repeat(73)).ok).toBe(false);
    // Multi-byte characters count by bytes: 19 × 4-byte emoji = 76 bytes.
    expect(validateNewPassword("🔒".repeat(19)).ok).toBe(false);
  });

  it("reads form fields safely", () => {
    const fd = new FormData();
    fd.set("email", "me@example.com");
    expect(formText(fd, "email")).toBe("me@example.com");
    expect(formText(fd, "missing")).toBe("");
  });
});
