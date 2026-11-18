import { describe, expect, it } from "vitest";
import { ACCOUNT_DELETED_NOTICE, accountDeletedNotice, parseDeleteAccountForm } from "./account-deletion";

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(values)) data.set(name, value);
  return data;
}

describe("parseDeleteAccountForm", () => {
  it("requires a password", () => {
    expect(parseDeleteAccountForm(form({}))).toEqual({ ok: false, error: expect.any(String) });
    expect(parseDeleteAccountForm(form({ password: "" }))).toEqual({ ok: false, error: expect.any(String) });
  });

  it("passes the password through unchanged (spaces included)", () => {
    expect(parseDeleteAccountForm(form({ password: " secret pass " }))).toEqual({
      ok: true,
      password: " secret pass ",
    });
  });

  it("ignores any user id the form tries to send", () => {
    const result = parseDeleteAccountForm(form({ password: "pw123456", userId: "someone-else" }));
    expect(result).toEqual({ ok: true, password: "pw123456" });
  });
});

describe("accountDeletedNotice", () => {
  it("shows the notice only for deleted=1", () => {
    expect(accountDeletedNotice("1")).toBe(ACCOUNT_DELETED_NOTICE);
    expect(accountDeletedNotice(undefined)).toBeNull();
    expect(accountDeletedNotice("0")).toBeNull();
    expect(accountDeletedNotice(["1", "1"])).toBeNull();
  });
});
