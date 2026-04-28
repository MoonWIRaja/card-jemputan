import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(projectRoot, "src", "cli.ts");

function run(cwd: string, args: string[]) {
  return spawnSync(process.execPath, ["--experimental-strip-types", cli, ...args], {
    cwd,
    encoding: "utf8"
  });
}

function state<T>(root: string): T {
  const content = readFileSync(join(root, "MYNEY.md"), "utf8");
  const match = content.match(/```json myney-state\n([\s\S]*?)\n```/);
  assert.ok(match, "MYNEY.md should contain myney-state JSON");
  return JSON.parse(match[1]) as T;
}

describe("MYney setup", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "myney-setup-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("creates the owner during first solo setup", () => {
    const result = run(root, [
      "setup",
      "--name",
      "Moon",
      "--codename",
      "moon",
      "--mode",
      "solo",
      "--class",
      "Necro Summoner",
      "--conversation-language",
      "Melayu",
      "--coding-language",
      "English"
    ]);
    assert.equal(result.status, 0, result.stderr);
    const memory = state<{ owner: string; mode: string; defaultLanguagePreferences: { conversationLanguage: string; codingLanguage: string }; members: Record<string, { role: string; class: string; languagePreferences: { conversationLanguage: string; codingLanguage: string } }>; todos: unknown[]; memoryJournal: unknown[] }>(root);
    const member = memory.members.moon;
    assert.equal(memory.owner, "moon");
    assert.equal(memory.mode, "solo");
    assert.equal(memory.defaultLanguagePreferences.conversationLanguage, "Melayu");
    assert.equal(memory.defaultLanguagePreferences.codingLanguage, "English");
    assert.deepEqual(Object.keys(memory.members), ["moon"]);
    assert.equal(member.role, "owner");
    assert.equal(member.class, "Necro Summoner");
    assert.equal(member.languagePreferences.conversationLanguage, "Melayu");
    assert.equal(member.languagePreferences.codingLanguage, "English");
    assert.equal(memory.todos.length, 1);
    assert.equal(memory.memoryJournal.length, 1);
  });

  it("rejects invalid codenames", () => {
    const result = run(root, ["setup", "--name", "Bad", "--codename", "123 bad", "--mode", "solo"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Invalid codename/);
  });

  it("supports open team member activation", () => {
    assert.equal(run(root, ["setup", "--name", "Moon", "--codename", "moon", "--mode", "team", "--join-mode", "open"]).status, 0);
    const result = run(root, ["setup", "--name", "Alya", "--codename", "alya", "--class", "Schema Druid"]);
    assert.equal(result.status, 0, result.stderr);
    const memory = state<{ members: Record<string, unknown>; joinMode: string }>(root);
    assert.equal(memory.joinMode, "open");
    assert.deepEqual(Object.keys(memory.members).sort(), ["alya", "moon"]);
  });

  it("supports owner-approved roster activation", () => {
    assert.equal(run(root, [
      "setup",
      "--name",
      "Moon",
      "--codename",
      "moon",
      "--mode",
      "team",
      "--join-mode",
      "owner-approved",
      "--roster",
      "ally,bob"
    ]).status, 0);

    const ok = run(root, ["setup", "--name", "Ally", "--codename", "ally"]);
    assert.equal(ok.status, 0, ok.stderr);

    const rejected = run(root, ["setup", "--name", "Eve", "--codename", "eve"]);
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /not in the owner-approved roster/);
  });

  it("supports invite activation and rejects used or revoked invites", () => {
    assert.equal(run(root, ["setup", "--name", "Moon", "--codename", "moon", "--mode", "team", "--join-mode", "invite"]).status, 0);
    assert.equal(run(root, ["invite", "create", "--actor", "moon", "--for", "ally", "--code", "ALLY-001"]).status, 0);

    const joined = run(root, ["setup", "--name", "Ally", "--codename", "ally", "--invite", "ALLY-001"]);
    assert.equal(joined.status, 0, joined.stderr);

    const reused = run(root, ["setup", "--name", "Ally Two", "--codename", "ally-two", "--invite", "ALLY-001"]);
    assert.notEqual(reused.status, 0);
    assert.match(reused.stderr, /used/);

    assert.equal(run(root, ["invite", "create", "--actor", "moon", "--for", "riven", "--code", "RIVEN-001"]).status, 0);
    assert.equal(run(root, ["invite", "revoke", "RIVEN-001", "--actor", "moon"]).status, 0);
    const revoked = run(root, ["setup", "--name", "Riven", "--codename", "riven", "--invite", "RIVEN-001"]);
    assert.notEqual(revoked.status, 0);
    assert.match(revoked.stderr, /revoked/);
  });
});
