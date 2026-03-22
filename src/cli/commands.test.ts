import { describe, expect, it } from "vitest";
import { formatHelp } from "../../bin/lib/a2b-help.mjs";

describe("a2b CLI help", () => {
  it("lists the page operation subcommands", () => {
    const help = formatHelp();

    expect(help).toContain("a2b market update");
    expect(help).toContain("a2b market categories");
    expect(help).toContain("a2b market list <category>");
    expect(help).toContain("a2b market show <entry>");
    expect(help).toContain("a2b market search <keyword>");
    expect(help).toContain("a2b screenshot <target>");
    expect(help).toContain("a2b eval-js <target> <expression>");
    expect(help).toContain("a2b click <target> <selector>");
    expect(help).toContain("a2b type <target> <selector> <text>");
    expect(help).toContain("a2b press <target> <selector> <key>");
    expect(help).toContain("a2b wait-for <target> <selector>");
    expect(help).toContain("a2b goto <target> <url>");
    expect(help).toContain("a2b reload <target>");
    expect(help).toContain("a2b back <target>");
    expect(help).toContain("a2b forward <target>");
    expect(help).toContain("a2b close <target>");
    expect(help).toContain("a2b run-js <target> <file>");
  });
});
