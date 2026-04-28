export type ProjectMode = "solo" | "team";
export type JoinMode = "owner-approved" | "open" | "invite";
export type MemberRole = "owner" | "member";
export type QuestStatus = "open" | "active" | "completed";
export type InviteStatus = "active" | "used" | "revoked";
export type MemoryEventKind = "conversation" | "memory-change" | "setup" | "quest" | "pair" | "handoff" | "todo" | "invite";
export type TodoStatus = "open" | "done";

export type LanguagePreferences = {
  conversationLanguage: string;
  codingLanguage: string;
};

export type PairRecord = {
  partner: string;
  task: string;
  startedAt: string;
  updatedAt: string;
};

export type HandoffRecord = {
  at: string;
  finished: string;
  nextAction: string;
  blockerAtHandoff: string | null;
};

export type MemberMemory = {
  name: string;
  codename: string;
  role: MemberRole;
  class: string;
  level: number;
  xp: number;
  currentQuest: string | null;
  activePair: PairRecord | null;
  inventory: string[];
  lastHandoff: HandoffRecord | null;
  lastBlocker: string | null;
  firstOnboarded: string;
  lastSession: string;
  sessionsCount: number;
  joinedVia: JoinMode | "owner" | "solo";
  languagePreferences: LanguagePreferences;
  personalNotes: Array<{ at: string; note: string }>;
  createdAt: string;
  updatedAt: string;
};

export type Roster = {
  project: "EmptyProject";
  coreName: "MYney";
  initialized: true;
  mode: ProjectMode;
  joinMode: JoinMode;
  owner: string;
  activeMember: string;
  members: string[];
  approvedMembers: string[];
  createdAt: string;
  updatedAt: string;
};

export type Invite = {
  code: string;
  status: InviteStatus;
  codename: string | null;
  createdBy: string;
  createdAt: string;
  usedBy: string | null;
  usedAt: string | null;
  revokedAt: string | null;
};

export type Quest = {
  id: string;
  title: string;
  status: QuestStatus;
  assignedTo: string | null;
  createdBy: string;
  xp: number;
  gate: string | null;
  notes: string[];
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
};

export type AgentProtocol = {
  name: string;
  file: string;
  title: string;
  purpose: string;
  commandHint: string;
};

export type InstalledSkill = {
  name: string;
  trigger: string;
  purpose: string;
};

export type RpgClassOption = {
  name: string;
  archetype: string;
  codingFocus: string;
  adventureStyle: string;
};

export type CommandProtocol = {
  command: string;
  file: string;
  purpose: string;
};

export type MemoryEvent = {
  id: string;
  at: string;
  actor: string;
  kind: MemoryEventKind;
  summary: string;
};

export type TodoItem = {
  id: string;
  text: string;
  status: TodoStatus;
  owner: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type LedgerEntry = {
  at: string;
  kind: string;
  actor: string;
  message: string;
};

export type MemoryCoreState = {
  schemaVersion: 1;
  project: "EmptyProject";
  coreName: "MYney";
  initialized: boolean;
  mode: ProjectMode | null;
  joinMode: JoinMode | null;
  owner: string | null;
  activeMember: string | null;
  defaultLanguagePreferences: LanguagePreferences;
  approvedMembers: string[];
  members: Record<string, MemberMemory>;
  invites: Record<string, Invite>;
  quests: Record<string, Quest>;
  reminders: {
    open: string[];
    completed: string[];
  };
  memoryJournal: MemoryEvent[];
  todos: TodoItem[];
  ledger: LedgerEntry[];
  agents: AgentProtocol[];
  commands: CommandProtocol[];
  installedSkills: InstalledSkill[];
  rpgClasses: RpgClassOption[];
  createdAt: string;
  updatedAt: string;
};

export type CheckResult = {
  ok: boolean;
  failures: string[];
  warnings: string[];
};

export const AGENTS: AgentProtocol[] = [
  {
    name: "MYney",
    file: "myney.md",
    title: "Grand Core Orchestrator",
    purpose: "Routes memory, team, quest, and agent work through the correct protocol.",
    commandHint: "Use for architecture, orchestration, and final decision flow."
  },
  {
    name: "Lumina",
    file: "lumina.md",
    title: "Memory Archivist",
    purpose: "Maintains diary, consolidation, reminders, and long-term recall hygiene.",
    commandHint: "Use for save, recall, diary, and memory cleanup tasks."
  },
  {
    name: "Nara",
    file: "nara.md",
    title: "Onboarding Steward",
    purpose: "Handles owner setup, member activation, roster rules, and invite flow.",
    commandHint: "Use for setup, party membership, and join-mode decisions."
  },
  {
    name: "Kaizen",
    file: "kaizen.md",
    title: "Questmaster",
    purpose: "Turns work into quests, phase gates, XP, and progress discipline.",
    commandHint: "Use for quest planning, gates, blockers, and team cadence."
  },
  {
    name: "Riven",
    file: "riven.md",
    title: "Builder Agent",
    purpose: "Transforms plans into scoped implementation tasks and handoffs.",
    commandHint: "Use for build execution, work plans, and implementation summaries."
  },
  {
    name: "Vega",
    file: "vega.md",
    title: "Integrity Guardian",
    purpose: "Runs preflight checks, schema validation, consistency checks, and risk review.",
    commandHint: "Use before and after file-based memory changes."
  },
  {
    name: "Echo",
    file: "echo.md",
    title: "Recall Agent",
    purpose: "Searches memory, ledger, reminders, handoffs, and agent protocols.",
    commandHint: "Use when someone asks what happened before or where context lives."
  }
];

export const INSTALLED_SKILLS: InstalledSkill[] = [
  {
    name: "Language Protocol",
    trigger: "/myney-setup",
    purpose: "Sets conversation language and coding/adventure language per member."
  },
  {
    name: "Memory Journal",
    trigger: "/myney-memory",
    purpose: "Logs every meaningful conversation, setup choice, or memory change into MYNEY.md."
  },
  {
    name: "Todo Ledger",
    trigger: "/myney-todo",
    purpose: "Keeps open and completed todos so the core does not forget follow-ups."
  },
  {
    name: "Quest Engine",
    trigger: "/myney-quest",
    purpose: "Turns coding work into RPG quests with XP, owner, and completion state."
  },
  {
    name: "Party System",
    trigger: "/myney-party",
    purpose: "Tracks owner, active member, roster, pairings, blockers, and team mode."
  },
  {
    name: "Pair Sync",
    trigger: "/myney-pair",
    purpose: "Maintains cross-consistent pair state between two members."
  },
  {
    name: "Invite Gate",
    trigger: "/myney-invite",
    purpose: "Lets the owner control team activation with invite codes."
  },
  {
    name: "Agent Protocols",
    trigger: "/myney-agent",
    purpose: "Lists and explains MYney, Lumina, Nara, Kaizen, Riven, Vega, and Echo."
  },
  {
    name: "Integrity Check",
    trigger: "/myney-check",
    purpose: "Validates the single-file state, classes, skills, members, pairs, and todos."
  }
];

export const RPG_CLASSES: RpgClassOption[] = [
  {
    name: "Necro Summoner",
    archetype: "Legacy reviver",
    codingFocus: "Resurrects dead modules, migrates old code, and summons helper agents/tests.",
    adventureStyle: "Controls fallen systems and turns broken code into useful allies."
  },
  {
    name: "Daemon Tamer",
    archetype: "Service handler",
    codingFocus: "Manages background jobs, queues, workers, dev servers, and long-running processes.",
    adventureStyle: "Tames wild daemons and keeps async beasts obedient."
  },
  {
    name: "Stack Paladin",
    archetype: "Full-stack defender",
    codingFocus: "Protects product flow across frontend, backend, database, and deployment.",
    adventureStyle: "Carries the shield for end-to-end vertical slices."
  },
  {
    name: "Schema Druid",
    archetype: "Data shapeshifter",
    codingFocus: "Designs schemas, migrations, validation, fixtures, and data lifecycle.",
    adventureStyle: "Speaks to data roots and grows clean system structures."
  },
  {
    name: "Cipher Rogue",
    archetype: "Security infiltrator",
    codingFocus: "Finds auth, crypto, API, and permission flaws before enemies do.",
    adventureStyle: "Moves quietly through attack surfaces with sharp eyes."
  },
  {
    name: "Compiler Monk",
    archetype: "Type discipline master",
    codingFocus: "Refines types, build checks, lint rules, and static correctness.",
    adventureStyle: "Meditates until red squiggles submit."
  },
  {
    name: "UI Illusionist",
    archetype: "Interface spellcaster",
    codingFocus: "Builds polished interactions, responsive layouts, states, and accessible UI.",
    adventureStyle: "Turns raw flows into convincing user-facing magic."
  },
  {
    name: "Infra Warlock",
    archetype: "Deployment conjurer",
    codingFocus: "Handles Docker, servers, CI, secrets, observability, and release rituals.",
    adventureStyle: "Binds clouds, ports, logs, and machines into one pact."
  },
  {
    name: "Test Ranger",
    archetype: "Regression tracker",
    codingFocus: "Creates tests, probes edge cases, and guards critical paths.",
    adventureStyle: "Tracks bugs through forests of behavior until nothing escapes."
  },
  {
    name: "Prompt Alchemist",
    archetype: "AI logic crafter",
    codingFocus: "Designs AI workflows, prompts, agent protocols, memory, and tool flows.",
    adventureStyle: "Transmutes vague intent into reliable reasoning systems."
  }
];

export const COMMANDS: CommandProtocol[] = [
  {
    command: "/myney-setup",
    file: "setup.md",
    purpose: "First-run owner bootstrap or returning member activation."
  },
  {
    command: "/myney-whoami",
    file: "whoami.md",
    purpose: "Restore the active user and show current RPG state."
  },
  {
    command: "/myney-party",
    file: "party.md",
    purpose: "Show owner, members, active pairs, blockers, and join mode."
  },
  {
    command: "/myney-quest",
    file: "quest.md",
    purpose: "Add, list, start, and complete RPG work quests."
  },
  {
    command: "/myney-pair",
    file: "pair.md",
    purpose: "Start, update, or end focused collaboration between two members."
  },
  {
    command: "/myney-handoff",
    file: "handoff.md",
    purpose: "Save session end state, next action, and blockers."
  },
  {
    command: "/myney-invite",
    file: "invite.md",
    purpose: "Owner-only invite creation, listing, and revocation."
  },
  {
    command: "/myney-agent",
    file: "agent.md",
    purpose: "List or inspect MYney local subagent protocols."
  },
  {
    command: "/myney-skills",
    file: "skills.md",
    purpose: "List installed MYney skills and RPG coding class options."
  },
  {
    command: "/myney-memory",
    file: "memory.md",
    purpose: "Log or list conversation and memory-change journal entries."
  },
  {
    command: "/myney-todo",
    file: "todo.md",
    purpose: "Add, list, and complete persistent MemoryCore todos."
  },
  {
    command: "/myney-check",
    file: "check.md",
    purpose: "Validate required MemoryCore files and consistency."
  }
];
