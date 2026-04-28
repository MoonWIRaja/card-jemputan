import { randomBytes } from "node:crypto";
import {
  AGENTS,
  COMMANDS,
  INSTALLED_SKILLS,
  RPG_CLASSES,
  type CheckResult,
  type CommandProtocol,
  type Invite,
  type JoinMode,
  type LedgerEntry,
  type MemoryEvent,
  type MemoryEventKind,
  type MemoryCoreState,
  type MemberMemory,
  type PairRecord,
  type ProjectMode,
  type Quest,
  type TodoItem
} from "./schema.ts";
import { corePath, ensureDir, exists, pathOf, readText, timestamp, writeText } from "./storage.ts";

export type SetupInput = {
  name: string;
  codename: string;
  className?: string;
  conversationLanguage?: string;
  codingLanguage?: string;
  mode?: ProjectMode;
  joinMode?: JoinMode;
  roster?: string[];
  invite?: string;
};

const VALID_JOIN_MODES: JoinMode[] = ["owner-approved", "open", "invite"];
const VALID_MODES: ProjectMode[] = ["solo", "team"];
const DEFAULT_CONVERSATION_LANGUAGE = "Melayu";
const DEFAULT_CODING_LANGUAGE = "English";
const DEFAULT_RPG_CLASS = "Prompt Alchemist";
const MEMORY_FILE = "MYNEY.md";
const STATE_BLOCK = /```json myney-state\n([\s\S]*?)\n```/;

export function normalizeCodename(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, "-");
}

export function assertCodename(input: string): string {
  const codename = normalizeCodename(input);
  if (!/^[a-z][a-z0-9-]*$/.test(codename)) {
    throw new Error(`Invalid codename "${input}". Use lowercase ASCII letters, numbers, and hyphens.`);
  }
  return codename;
}

function slugify(input: string): string {
  const slug = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "quest";
}

function nextId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(2).toString("hex")}`;
}

function normalizeClassName(input?: string): string {
  const requested = input?.trim() || DEFAULT_RPG_CLASS;
  const match = RPG_CLASSES.find((option) => option.name.toLowerCase() === requested.toLowerCase());
  if (!match) {
    const choices = RPG_CLASSES.map((option) => option.name).join(", ");
    throw new Error(`Invalid RPG class "${requested}". Choose one of: ${choices}.`);
  }
  return match.name;
}

function memoryPath(root: string): string {
  return corePath(root, MEMORY_FILE);
}

function createEmptyState(): MemoryCoreState {
  const now = timestamp();
  return {
    schemaVersion: 1,
    project: "EmptyProject",
    coreName: "MYney",
    initialized: false,
    mode: null,
    joinMode: null,
    owner: null,
    activeMember: null,
    defaultLanguagePreferences: {
      conversationLanguage: DEFAULT_CONVERSATION_LANGUAGE,
      codingLanguage: DEFAULT_CODING_LANGUAGE
    },
    approvedMembers: [],
    members: {},
    invites: {},
    quests: {},
    reminders: {
      open: [],
      completed: []
    },
    memoryJournal: [],
    todos: [],
    ledger: [],
    agents: AGENTS,
    commands: COMMANDS,
    installedSkills: INSTALLED_SKILLS,
    rpgClasses: RPG_CLASSES,
    createdAt: now,
    updatedAt: now
  };
}

function renderMemoryFile(state: MemoryCoreState): string {
  const updatedState = {
    ...state,
    updatedAt: timestamp(),
    agents: AGENTS,
    commands: COMMANDS,
    installedSkills: INSTALLED_SKILLS,
    rpgClasses: RPG_CLASSES
  };
  return `# MYney MemoryCore

This is the single source of truth for EmptyProject's MYney RPG MemoryCore.

AI assistants should read this file first. All memory, command protocols,
agent roles, roster state, members, invites, quests, reminders, and ledger
entries live here.

## Universal Commands

${COMMANDS.map((command) => `- \`${command.command}\` - ${command.purpose}`).join("\n")}

## Language Protocol

- Default conversation language: **${updatedState.defaultLanguagePreferences.conversationLanguage}**.
- Default coding/adventure language: **${updatedState.defaultLanguagePreferences.codingLanguage}**.
- Members may override both during \`/myney-setup\`.
- Conversation language controls normal chat.
- Coding/adventure language controls code, technical names, quest wording, classes, and RPG flavor.

## Agents

${AGENTS.map((agent) => `- **${agent.name}** (${agent.title}) - ${agent.purpose}`).join("\n")}

## Installed Skills

${INSTALLED_SKILLS.map((skill) => `- **${skill.name}** (\`${skill.trigger}\`) - ${skill.purpose}`).join("\n")}

## RPG Coding Classes

${RPG_CLASSES.map((option) => `- **${option.name}** - ${option.codingFocus}`).join("\n")}

## Memory Discipline

- At the start or end of every meaningful conversation, add a \`memoryJournal\` entry.
- Any setup choice, memory change, todo change, quest update, invite, pair, or handoff must write both memory state and ledger where relevant.
- Todos live in \`todos[]\`; do not rely on chat history for follow-ups.

## Command Protocol

When a user types a \`/myney-*\` command:

1. Read this file.
2. Find the command in the JSON state block.
3. Read the current state before asking questions.
4. Update only the JSON state block unless the user asks to change the protocol text.
5. Keep ledger entries append-only.

## State

\`\`\`json myney-state
${JSON.stringify(updatedState, null, 2)}
\`\`\`
`;
}

function parseState(content: string): MemoryCoreState {
  const match = content.match(STATE_BLOCK);
  if (!match) {
    throw new Error(`Missing \`json myney-state\` block in ${MEMORY_FILE}.`);
  }
  return JSON.parse(match[1]) as MemoryCoreState;
}

function migrateState(state: MemoryCoreState): MemoryCoreState {
  const fallback = createEmptyState();
  state.defaultLanguagePreferences ||= fallback.defaultLanguagePreferences;
  state.memoryJournal ||= [];
  state.todos ||= [];
  state.installedSkills = INSTALLED_SKILLS;
  state.rpgClasses = RPG_CLASSES;
  state.agents = AGENTS;
  state.commands = COMMANDS;
  state.reminders ||= { open: [], completed: [] };
  state.ledger ||= [];
  state.members ||= {};
  for (const member of Object.values(state.members)) {
    member.languagePreferences ||= state.defaultLanguagePreferences;
    member.class = normalizeClassName(member.class);
  }
  return state;
}

function loadState(root: string): MemoryCoreState {
  ensureCoreSkeleton(root);
  return migrateState(parseState(readText(memoryPath(root))));
}

function saveState(root: string, state: MemoryCoreState): void {
  writeText(memoryPath(root), renderMemoryFile(state));
}

function loadInitializedState(root: string): MemoryCoreState {
  const state = loadState(root);
  if (!state.initialized) {
    throw new Error("MYney is not initialized. Type `/myney-setup` first.");
  }
  return state;
}

function createMember(input: {
  name: string;
  codename: string;
  role: "owner" | "member";
  className?: string;
  conversationLanguage?: string;
  codingLanguage?: string;
  joinedVia: MemberMemory["joinedVia"];
}): MemberMemory {
  const now = timestamp();
  return {
    name: input.name.trim(),
    codename: input.codename,
    role: input.role,
    class: normalizeClassName(input.className),
    level: 1,
    xp: 0,
    currentQuest: null,
    activePair: null,
    inventory: [],
    lastHandoff: null,
    lastBlocker: null,
    firstOnboarded: now,
    lastSession: now,
    sessionsCount: 1,
    joinedVia: input.joinedVia,
    languagePreferences: {
      conversationLanguage: input.conversationLanguage?.trim() || DEFAULT_CONVERSATION_LANGUAGE,
      codingLanguage: input.codingLanguage?.trim() || DEFAULT_CODING_LANGUAGE
    },
    personalNotes: [],
    createdAt: now,
    updatedAt: now
  };
}

function saveMember(state: MemoryCoreState, member: MemberMemory): void {
  member.updatedAt = timestamp();
  state.members[member.codename] = member;
}

function resolveActor(root: string, actor?: string): { state: MemoryCoreState; member: MemberMemory } {
  const state = loadInitializedState(root);
  const codename = actor ? assertCodename(actor) : state.activeMember;
  if (!codename || !state.members[codename]) {
    throw new Error(`Unknown member "${codename || "none"}". Type /myney-setup for that member first.`);
  }
  return { state, member: state.members[codename] };
}

function addLedger(state: MemoryCoreState, kind: string, actor: string, message: string): LedgerEntry {
  const entry = { at: timestamp(), kind, actor, message };
  state.ledger.push(entry);
  return entry;
}

function addMemory(state: MemoryCoreState, actor: string, kind: MemoryEventKind, summary: string): MemoryEvent {
  const event = { id: nextId("mem"), at: timestamp(), actor, kind, summary };
  state.memoryJournal.push(event);
  return event;
}

function addTodoItem(state: MemoryCoreState, text: string, owner?: string | null): TodoItem {
  const todo = {
    id: nextId("todo"),
    text: text.trim(),
    status: "open" as const,
    owner: owner || null,
    createdAt: timestamp(),
    completedAt: null
  };
  state.todos.push(todo);
  return todo;
}

export function isInitialized(root: string): boolean {
  if (!exists(memoryPath(root))) {
    return false;
  }
  return parseState(readText(memoryPath(root))).initialized;
}

export function ensureCoreSkeleton(root: string): void {
  ensureDir(corePath(root));
  const file = memoryPath(root);
  if (!exists(file)) {
    writeText(file, renderMemoryFile(createEmptyState()));
    return;
  }
  try {
    const migrated = migrateState(parseState(readText(file)));
    writeText(file, renderMemoryFile(migrated));
  } catch (error) {
    console.error(error);
    // Leave malformed files untouched so /myney-check can report the parse error.
  }
}

export function appendLedger(root: string, kind: string, actor: string, message: string): void {
  const state = loadState(root);
  addLedger(state, kind, actor, message);
  saveState(root, state);
}

export function runSetup(root: string, input: SetupInput): string {
  ensureCoreSkeleton(root);
  const state = loadState(root);
  const codename = assertCodename(input.codename);
  if (!input.name.trim()) {
    throw new Error("Name is required.");
  }

  if (!state.initialized) {
    return initializeProject(root, state, { ...input, codename });
  }
  return activateMember(root, state, { ...input, codename });
}

function initializeProject(root: string, state: MemoryCoreState, input: SetupInput & { codename: string }): string {
  const mode = input.mode || "solo";
  if (!VALID_MODES.includes(mode)) {
    throw new Error(`Invalid mode "${mode}". Use solo or team.`);
  }
  const joinMode = mode === "team" ? input.joinMode || "owner-approved" : "owner-approved";
  if (!VALID_JOIN_MODES.includes(joinMode)) {
    throw new Error(`Invalid join mode "${joinMode}".`);
  }
  const owner = input.codename;
  state.initialized = true;
  state.mode = mode;
  state.joinMode = joinMode;
  state.owner = owner;
  state.activeMember = owner;
  state.approvedMembers = [...new Set([owner, ...(input.roster || []).map(assertCodename)])].sort();
  saveMember(state, createMember({
    name: input.name,
    codename: owner,
    role: "owner",
    className: input.className,
    conversationLanguage: input.conversationLanguage,
    codingLanguage: input.codingLanguage,
    joinedVia: mode === "solo" ? "solo" : "owner"
  }));
  state.defaultLanguagePreferences = state.members[owner].languagePreferences;
  addLedger(state, "OWNER", owner, `Initialized ${mode} MemoryCore with join mode ${joinMode}.`);
  addMemory(state, owner, "setup", `Owner setup completed. Conversation language: ${state.defaultLanguagePreferences.conversationLanguage}. Coding/adventure language: ${state.defaultLanguagePreferences.codingLanguage}. Class: ${state.members[owner].class}.`);
  addTodoItem(state, "Review MYney setup choices after first real session.", owner);
  saveState(root, state);
  return `MYney initialized. Owner ${state.members[owner].name} (${owner}) is active.`;
}

function activateMember(root: string, state: MemoryCoreState, input: SetupInput & { codename: string }): string {
  const existing = state.members[input.codename];
  if (existing) {
    existing.lastSession = timestamp();
    existing.sessionsCount += 1;
    if (input.conversationLanguage) existing.languagePreferences.conversationLanguage = input.conversationLanguage;
    if (input.codingLanguage) existing.languagePreferences.codingLanguage = input.codingLanguage;
    if (input.className) existing.class = normalizeClassName(input.className);
    saveMember(state, existing);
    state.activeMember = existing.codename;
    addMemory(state, existing.codename, "setup", `Returning member activated. Conversation language: ${existing.languagePreferences.conversationLanguage}. Coding/adventure language: ${existing.languagePreferences.codingLanguage}. Class: ${existing.class}.`);
    saveState(root, state);
    return `Welcome back, ${existing.name}. Active member: ${existing.codename}.`;
  }

  if (state.mode === "solo") {
    throw new Error("This MemoryCore is in solo mode. Only the owner can activate.");
  }

  let joinedVia: JoinMode = state.joinMode || "owner-approved";
  if (state.joinMode === "owner-approved" && !state.approvedMembers.includes(input.codename)) {
    throw new Error(`Member "${input.codename}" is not in the owner-approved roster.`);
  }
  if (state.joinMode === "invite") {
    if (!input.invite) {
      throw new Error("Invite code is required for this MemoryCore.");
    }
    const invite = readInvite(state, input.invite);
    if (invite.status !== "active") {
      throw new Error(`Invite "${input.invite}" is ${invite.status}.`);
    }
    if (invite.codename && invite.codename !== input.codename) {
      throw new Error(`Invite "${input.invite}" is reserved for ${invite.codename}.`);
    }
    invite.status = "used";
    invite.usedBy = input.codename;
    invite.usedAt = timestamp();
    joinedVia = "invite";
  }

  const member = createMember({
    name: input.name,
    codename: input.codename,
    role: "member",
    className: input.className,
    conversationLanguage: input.conversationLanguage || state.defaultLanguagePreferences.conversationLanguage,
    codingLanguage: input.codingLanguage || state.defaultLanguagePreferences.codingLanguage,
    joinedVia
  });
  saveMember(state, member);
  state.activeMember = member.codename;
  if (!state.approvedMembers.includes(member.codename)) {
    state.approvedMembers.push(member.codename);
    state.approvedMembers.sort();
  }
  addLedger(state, "JOIN", member.codename, `Joined via ${joinedVia}.`);
  addMemory(state, member.codename, "setup", `Member activated via ${joinedVia}. Conversation language: ${member.languagePreferences.conversationLanguage}. Coding/adventure language: ${member.languagePreferences.codingLanguage}. Class: ${member.class}.`);
  saveState(root, state);
  return `Member ${member.name} (${member.codename}) activated via ${joinedVia}.`;
}

export function renderWhoami(root: string, actor?: string): string {
  const { state, member } = resolveActor(root, actor);
  member.lastSession = timestamp();
  member.sessionsCount += 1;
  saveMember(state, member);
  saveState(root, state);
  const quest = member.currentQuest ? state.quests[member.currentQuest] : null;
  const lines = [
    `${member.name} (${member.codename})`,
    `Role: ${member.role}`,
    `Class: ${member.class}`,
    `Conversation language: ${member.languagePreferences.conversationLanguage}`,
    `Coding/adventure language: ${member.languagePreferences.codingLanguage}`,
    `Level: ${member.level}`,
    `XP: ${member.xp}`,
    `Session: #${member.sessionsCount}`,
    `Current quest: ${quest ? `${quest.id} - ${quest.title}` : "none"}`,
    `Active pair: ${member.activePair ? `${member.activePair.partner} on ${member.activePair.task}` : "none"}`,
    `Last blocker: ${member.lastBlocker || "none"}`
  ];
  if (member.lastHandoff) {
    lines.push(`Last handoff: ${member.lastHandoff.finished} Next: ${member.lastHandoff.nextAction}`);
  }
  return lines.join("\n");
}

export function renderParty(root: string): string {
  const state = loadInitializedState(root);
  const lines = [
    `Project: ${state.project}`,
    `Core: ${state.coreName}`,
    `Mode: ${state.mode}`,
    `Join mode: ${state.joinMode}`,
    `Owner: ${state.owner}`,
    `Active member: ${state.activeMember}`,
    "",
    "Members:"
  ];
  for (const codename of Object.keys(state.members).sort()) {
    const member = state.members[codename];
    const pair = member.activePair ? ` pair:${member.activePair.partner}` : "";
    const blocker = member.lastBlocker ? ` blocker:${member.lastBlocker}` : "";
    const quest = member.currentQuest ? ` quest:${member.currentQuest}` : "";
    lines.push(`- ${member.codename} (${member.name}) class:${member.class} chat:${member.languagePreferences.conversationLanguage} code:${member.languagePreferences.codingLanguage} level:${member.level}${quest}${pair}${blocker}`);
  }
  return lines.join("\n");
}

function loadQuest(state: MemoryCoreState, id: string): Quest {
  const quest = state.quests[id];
  if (!quest) {
    throw new Error(`Unknown quest "${id}".`);
  }
  return quest;
}

function saveQuest(state: MemoryCoreState, quest: Quest): void {
  quest.updatedAt = timestamp();
  state.quests[quest.id] = quest;
}

export function addQuest(root: string, input: {
  actor?: string;
  title: string;
  id?: string;
  assignee?: string;
  xp?: number;
  gate?: string;
}): string {
  const { state, member: actor } = resolveActor(root, input.actor);
  if (!input.title?.trim()) {
    throw new Error("Quest title is required.");
  }
  const id = input.id ? slugify(input.id) : `${slugify(input.title)}-${Date.now().toString(36)}`;
  if (state.quests[id]) {
    throw new Error(`Quest "${id}" already exists.`);
  }
  const assignee = input.assignee ? assertCodename(input.assignee) : null;
  if (assignee && !state.members[assignee]) {
    throw new Error(`Unknown member "${assignee}".`);
  }
  const now = timestamp();
  const quest: Quest = {
    id,
    title: input.title.trim(),
    status: "open",
    assignedTo: assignee,
    createdBy: actor.codename,
    xp: Number.isFinite(input.xp) ? Math.max(0, Math.trunc(input.xp || 0)) : 25,
    gate: input.gate?.trim() || null,
    notes: [],
    createdAt: now,
    startedAt: null,
    completedAt: null,
    updatedAt: now
  };
  saveQuest(state, quest);
  addLedger(state, "QUEST", actor.codename, `Added ${quest.id}: ${quest.title}.`);
  addMemory(state, actor.codename, "quest", `Quest added: ${quest.id} - ${quest.title}.`);
  saveState(root, state);
  return `Quest added: ${quest.id}`;
}

export function listQuests(root: string): string {
  ensureCoreSkeleton(root);
  const state = loadState(root);
  const quests = Object.values(state.quests).sort((a, b) => a.id.localeCompare(b.id));
  if (quests.length === 0) {
    return "No quests yet.";
  }
  return quests
    .map((quest) => `- ${quest.id} [${quest.status}] ${quest.title} -> ${quest.assignedTo || "unassigned"} (${quest.xp} XP)`)
    .join("\n");
}

export function startQuest(root: string, id: string, actorName?: string): string {
  const { state, member: actor } = resolveActor(root, actorName);
  const quest = loadQuest(state, id);
  if (quest.status === "completed") {
    throw new Error(`Quest "${id}" is already completed.`);
  }
  quest.status = "active";
  quest.startedAt ||= timestamp();
  quest.assignedTo ||= actor.codename;
  saveQuest(state, quest);
  const assignee = state.members[quest.assignedTo];
  assignee.currentQuest = quest.id;
  saveMember(state, assignee);
  addLedger(state, "QUEST", actor.codename, `Started ${quest.id}.`);
  addMemory(state, actor.codename, "quest", `Quest started: ${quest.id}.`);
  saveState(root, state);
  return `Quest started: ${quest.id}`;
}

export function completeQuest(root: string, id: string, actorName?: string): string {
  const { state, member: actor } = resolveActor(root, actorName);
  const quest = loadQuest(state, id);
  if (quest.status === "completed") {
    throw new Error(`Quest "${id}" is already completed.`);
  }
  quest.status = "completed";
  quest.completedAt = timestamp();
  saveQuest(state, quest);
  const assignee = state.members[quest.assignedTo || actor.codename];
  assignee.xp += quest.xp;
  assignee.level = Math.floor(assignee.xp / 100) + 1;
  if (assignee.currentQuest === quest.id) {
    assignee.currentQuest = null;
  }
  assignee.inventory.push(`Quest clear: ${quest.title}`);
  saveMember(state, assignee);
  addLedger(state, "QUEST", actor.codename, `Completed ${quest.id}; ${assignee.codename} gained ${quest.xp} XP.`);
  addMemory(state, actor.codename, "quest", `Quest completed: ${quest.id}; ${assignee.codename} gained ${quest.xp} XP.`);
  saveState(root, state);
  return `Quest completed: ${quest.id}`;
}

export function startPair(root: string, input: { actor?: string; partner: string; task: string }): string {
  const { state, member: actor } = resolveActor(root, input.actor);
  const partnerCode = assertCodename(input.partner);
  const partner = state.members[partnerCode];
  if (!partner) {
    throw new Error(`Unknown member "${partnerCode}".`);
  }
  if (actor.codename === partner.codename) {
    throw new Error("A member cannot pair with themselves.");
  }
  if (!input.task?.trim()) {
    throw new Error("Pair task is required.");
  }
  const now = timestamp();
  const actorPair: PairRecord = { partner: partner.codename, task: input.task.trim(), startedAt: now, updatedAt: now };
  const partnerPair: PairRecord = { partner: actor.codename, task: input.task.trim(), startedAt: now, updatedAt: now };
  actor.activePair = actorPair;
  partner.activePair = partnerPair;
  saveMember(state, actor);
  saveMember(state, partner);
  addLedger(state, "PAIR", actor.codename, `${actor.codename} + ${partner.codename}: ${input.task.trim()}.`);
  addMemory(state, actor.codename, "pair", `Pair started with ${partner.codename}: ${input.task.trim()}.`);
  saveState(root, state);
  return `Pair started: ${actor.codename} + ${partner.codename}`;
}

export function updatePair(root: string, input: { actor?: string; task?: string; note?: string; status?: string }): string {
  const { state, member: actor } = resolveActor(root, input.actor);
  if (!actor.activePair) {
    throw new Error(`${actor.codename} has no active pair.`);
  }
  const partner = state.members[actor.activePair.partner];
  const summary = input.task || input.status || input.note;
  if (!summary?.trim()) {
    throw new Error("Pair update needs --task, --status, or --note.");
  }
  if (input.task?.trim()) {
    actor.activePair.task = input.task.trim();
    if (partner.activePair) {
      partner.activePair.task = input.task.trim();
    }
  }
  actor.activePair.updatedAt = timestamp();
  if (partner.activePair) {
    partner.activePair.updatedAt = actor.activePair.updatedAt;
  }
  saveMember(state, actor);
  saveMember(state, partner);
  addLedger(state, "PAIR", actor.codename, `Update with ${partner.codename}: ${summary.trim()}.`);
  addMemory(state, actor.codename, "pair", `Pair updated with ${partner.codename}: ${summary.trim()}.`);
  saveState(root, state);
  return `Pair updated: ${actor.codename} + ${partner.codename}`;
}

export function endPair(root: string, input: { actor?: string; summary: string }): string {
  const { state, member: actor } = resolveActor(root, input.actor);
  if (!actor.activePair) {
    throw new Error(`${actor.codename} has no active pair.`);
  }
  const partner = state.members[actor.activePair.partner];
  const partnerName = partner.codename;
  actor.activePair = null;
  partner.activePair = null;
  saveMember(state, actor);
  saveMember(state, partner);
  addLedger(state, "PAIR", actor.codename, `Closed pair with ${partnerName}. Summary: ${input.summary || "none"}.`);
  addMemory(state, actor.codename, "pair", `Pair closed with ${partnerName}. Summary: ${input.summary || "none"}.`);
  saveState(root, state);
  return `Pair ended: ${actor.codename} + ${partnerName}`;
}

export function handoff(root: string, input: {
  actor?: string;
  finished: string;
  nextAction: string;
  blocker?: string;
}): string {
  const { state, member: actor } = resolveActor(root, input.actor);
  const blocker = input.blocker && !["none", "takde", "no"].includes(input.blocker.toLowerCase()) ? input.blocker : null;
  actor.lastHandoff = {
    at: timestamp(),
    finished: input.finished.trim(),
    nextAction: input.nextAction.trim(),
    blockerAtHandoff: blocker
  };
  actor.lastSession = actor.lastHandoff.at;
  actor.lastBlocker = blocker;
  saveMember(state, actor);
  addLedger(state, blocker ? "BLOCKER" : "HANDOFF", actor.codename, `Finished: ${input.finished.trim()}. Next: ${input.nextAction.trim()}.`);
  addMemory(state, actor.codename, "handoff", `Handoff saved. Finished: ${input.finished.trim()}. Next: ${input.nextAction.trim()}.`);
  addTodoItem(state, input.nextAction.trim(), actor.codename);
  saveState(root, state);
  return `Handoff saved for ${actor.codename}.`;
}

function requireOwner(root: string, actorName?: string): { state: MemoryCoreState; actor: MemberMemory } {
  const { state, member: actor } = resolveActor(root, actorName);
  if (actor.codename !== state.owner) {
    throw new Error("Only the owner can manage invites.");
  }
  return { state, actor };
}

function readInvite(state: MemoryCoreState, code: string): Invite {
  const invite = state.invites[code.toUpperCase()];
  if (!invite) {
    throw new Error(`Invite "${code}" does not exist.`);
  }
  return invite;
}

export function createInvite(root: string, input: { actor?: string; code?: string; codename?: string }): string {
  const { state, actor } = requireOwner(root, input.actor);
  const code = (input.code || randomBytes(4).toString("hex")).toUpperCase();
  if (!/^[A-Z0-9-]+$/.test(code)) {
    throw new Error("Invite code must use uppercase letters, numbers, or hyphens.");
  }
  if (state.invites[code]) {
    throw new Error(`Invite "${code}" already exists.`);
  }
  const invite: Invite = {
    code,
    status: "active",
    codename: input.codename ? assertCodename(input.codename) : null,
    createdBy: actor.codename,
    createdAt: timestamp(),
    usedBy: null,
    usedAt: null,
    revokedAt: null
  };
  state.invites[code] = invite;
  addLedger(state, "INVITE", actor.codename, `Created invite ${code}${invite.codename ? ` for ${invite.codename}` : ""}.`);
  addMemory(state, actor.codename, "invite", `Invite created: ${code}${invite.codename ? ` for ${invite.codename}` : ""}.`);
  saveState(root, state);
  return `Invite created: ${code}`;
}

export function listInvites(root: string): string {
  ensureCoreSkeleton(root);
  const state = loadState(root);
  const invites = Object.values(state.invites).sort((a, b) => a.code.localeCompare(b.code));
  if (invites.length === 0) {
    return "No invites.";
  }
  return invites
    .map((invite) => `- ${invite.code} [${invite.status}] for ${invite.codename || "anyone"} usedBy:${invite.usedBy || "-"}`)
    .join("\n");
}

export function revokeInvite(root: string, input: { actor?: string; code: string }): string {
  const { state, actor } = requireOwner(root, input.actor);
  const invite = readInvite(state, input.code);
  if (invite.status !== "active") {
    throw new Error(`Invite "${invite.code}" is already ${invite.status}.`);
  }
  invite.status = "revoked";
  invite.revokedAt = timestamp();
  addLedger(state, "INVITE", actor.codename, `Revoked invite ${invite.code}.`);
  addMemory(state, actor.codename, "invite", `Invite revoked: ${invite.code}.`);
  saveState(root, state);
  return `Invite revoked: ${invite.code}`;
}

export function listAgents(root: string): string {
  ensureCoreSkeleton(root);
  return AGENTS.map((agent) => `- ${agent.name}: ${agent.title}`).join("\n");
}

export function showAgent(root: string, name: string): string {
  ensureCoreSkeleton(root);
  const target = AGENTS.find((agent) => agent.name.toLowerCase() === name.toLowerCase() || agent.file === name);
  if (!target) {
    throw new Error(`Unknown agent "${name}".`);
  }
  return `# ${target.name} - ${target.title}\n\n## Purpose\n${target.purpose}\n\n## When To Use\n${target.commandHint}\n`;
}

export function listCommands(root: string): string {
  ensureCoreSkeleton(root);
  return COMMANDS.map((command: CommandProtocol) => `${command.command}: ${command.purpose}`).join("\n");
}

export function showCommand(root: string, name: string): string {
  ensureCoreSkeleton(root);
  const normalized = name.startsWith("/") ? name : `/myney-${name.replace(/^myney-/, "")}`;
  const target = COMMANDS.find((command) => command.command === normalized || command.file === name);
  if (!target) {
    throw new Error(`Unknown MYney command "${name}".`);
  }
  return `# ${target.command}\n\n## Purpose\n${target.purpose}\n\n## Source Of Truth\nAll command behavior and state live in \`${MEMORY_FILE}\`.\n`;
}

export function listSkillsAndClasses(root: string): string {
  ensureCoreSkeleton(root);
  const skillLines = INSTALLED_SKILLS.map((skill) => `- ${skill.name} (${skill.trigger}): ${skill.purpose}`);
  const classLines = RPG_CLASSES.map((option) => `- ${option.name}: ${option.codingFocus}`);
  return ["Installed skills:", ...skillLines, "", "RPG coding classes:", ...classLines].join("\n");
}

export function addMemoryEvent(root: string, input: { actor?: string; kind?: MemoryEventKind; summary: string }): string {
  const { state, member } = resolveActor(root, input.actor);
  if (!input.summary?.trim()) {
    throw new Error("Memory summary is required.");
  }
  const kind = input.kind || "conversation";
  const event = addMemory(state, member.codename, kind, input.summary.trim());
  addLedger(state, "MEMORY", member.codename, `${kind}: ${input.summary.trim()}`);
  saveState(root, state);
  return `Memory logged: ${event.id}`;
}

export function listMemoryEvents(root: string): string {
  ensureCoreSkeleton(root);
  const state = loadState(root);
  if (state.memoryJournal.length === 0) {
    return "No memory journal entries yet.";
  }
  return state.memoryJournal
    .slice(-20)
    .map((event) => `- ${event.id} [${event.kind}] ${event.actor}: ${event.summary}`)
    .join("\n");
}

export function addTodo(root: string, input: { actor?: string; text: string; owner?: string }): string {
  const { state, member } = resolveActor(root, input.actor);
  if (!input.text?.trim()) {
    throw new Error("Todo text is required.");
  }
  const owner = input.owner ? assertCodename(input.owner) : member.codename;
  if (owner && !state.members[owner]) {
    throw new Error(`Unknown todo owner "${owner}".`);
  }
  const todo = addTodoItem(state, input.text, owner);
  addMemory(state, member.codename, "todo", `Todo added: ${todo.text}.`);
  addLedger(state, "TODO", member.codename, `Added ${todo.id}: ${todo.text}.`);
  saveState(root, state);
  return `Todo added: ${todo.id}`;
}

export function listTodos(root: string): string {
  ensureCoreSkeleton(root);
  const state = loadState(root);
  if (state.todos.length === 0) {
    return "No todos yet.";
  }
  return state.todos
    .map((todo) => `- ${todo.id} [${todo.status}] ${todo.text} -> ${todo.owner || "unassigned"}`)
    .join("\n");
}

export function completeTodo(root: string, input: { actor?: string; id: string }): string {
  const { state, member } = resolveActor(root, input.actor);
  const todo = state.todos.find((item) => item.id === input.id);
  if (!todo) {
    throw new Error(`Unknown todo "${input.id}".`);
  }
  todo.status = "done";
  todo.completedAt = timestamp();
  addMemory(state, member.codename, "todo", `Todo completed: ${todo.text}.`);
  addLedger(state, "TODO", member.codename, `Completed ${todo.id}: ${todo.text}.`);
  saveState(root, state);
  return `Todo completed: ${todo.id}`;
}

export function checkProject(root: string): CheckResult {
  const failures: string[] = [];
  const warnings: string[] = [];
  const file = memoryPath(root);
  if (!exists(file)) {
    failures.push(`Missing ${MEMORY_FILE}.`);
    return { ok: false, failures, warnings };
  }

  let state: MemoryCoreState;
  try {
    state = migrateState(parseState(readText(file)));
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
    return { ok: false, failures, warnings };
  }

  if (state.schemaVersion !== 1) failures.push("Unsupported state schema version.");
  if (state.project !== "EmptyProject") failures.push("State project must be EmptyProject.");
  if (state.coreName !== "MYney") failures.push("State coreName must be MYney.");
  for (const command of COMMANDS) {
    if (!state.commands.some((item) => item.command === command.command)) {
      failures.push(`Missing command ${command.command} in state.`);
    }
  }
  for (const agent of AGENTS) {
    if (!state.agents.some((item) => item.name === agent.name)) {
      failures.push(`Missing agent ${agent.name} in state.`);
    }
  }
  for (const skill of INSTALLED_SKILLS) {
    if (!state.installedSkills.some((item) => item.name === skill.name)) {
      failures.push(`Missing installed skill ${skill.name} in state.`);
    }
  }
  for (const option of RPG_CLASSES) {
    if (!state.rpgClasses.some((item) => item.name === option.name)) {
      failures.push(`Missing RPG class ${option.name} in state.`);
    }
  }
  if (!state.defaultLanguagePreferences?.conversationLanguage) failures.push("Missing default conversation language.");
  if (!state.defaultLanguagePreferences?.codingLanguage) failures.push("Missing default coding/adventure language.");

  if (!state.initialized) {
    warnings.push("MYney is not initialized yet. Type /myney-setup to create the owner.");
    return { ok: failures.length === 0, failures, warnings };
  }

  if (!state.owner) failures.push("Initialized state has no owner.");
  if (!state.activeMember) failures.push("Initialized state has no active member.");
  if (!state.mode || !VALID_MODES.includes(state.mode)) failures.push(`Invalid project mode ${state.mode}.`);
  if (!state.joinMode || !VALID_JOIN_MODES.includes(state.joinMode)) failures.push(`Invalid join mode ${state.joinMode}.`);
  if (state.owner && !state.members[state.owner]) failures.push("Owner has no member record.");
  if (state.activeMember && !state.members[state.activeMember]) failures.push("Active member has no member record.");
  for (const [codename, member] of Object.entries(state.members)) {
    if (member.codename !== codename) failures.push(`Member key ${codename} does not match member codename ${member.codename}.`);
    if (!member.languagePreferences?.conversationLanguage) failures.push(`${member.codename} has no conversation language.`);
    if (!member.languagePreferences?.codingLanguage) failures.push(`${member.codename} has no coding/adventure language.`);
    try {
      assertCodename(member.codename);
      normalizeClassName(member.class);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }
    if (member.activePair) {
      const partner = state.members[member.activePair.partner];
      if (!partner) {
        failures.push(`${member.codename} pairs with missing ${member.activePair.partner}.`);
      } else if (!partner.activePair || partner.activePair.partner !== member.codename) {
        failures.push(`${member.codename} pair with ${partner.codename} is not cross-consistent.`);
      } else if (partner.activePair.task !== member.activePair.task) {
        failures.push(`${member.codename} pair task differs from ${partner.codename}.`);
      }
    }
  }
  for (const todo of state.todos) {
    if (!todo.id || !todo.text) failures.push("Todo item is missing id or text.");
    if (!["open", "done"].includes(todo.status)) failures.push(`Todo ${todo.id} has invalid status ${todo.status}.`);
  }

  if (!exists(pathOf(root, "setup.md"))) warnings.push("setup.md is missing from repo root.");
  return { ok: failures.length === 0, failures, warnings };
}

export function renderCheck(result: CheckResult): string {
  const lines = [result.ok ? "MYney check passed." : "MYney check failed."];
  if (result.failures.length) {
    lines.push("", "Failures:", ...result.failures.map((failure) => `- ${failure}`));
  }
  if (result.warnings.length) {
    lines.push("", "Warnings:", ...result.warnings.map((warning) => `- ${warning}`));
  }
  return lines.join("\n");
}
