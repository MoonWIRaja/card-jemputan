import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  addMemoryEvent,
  addQuest,
  addTodo,
  checkProject,
  completeQuest,
  completeTodo,
  createInvite,
  endPair,
  handoff,
  isInitialized,
  listAgents,
  listCommands,
  listInvites,
  listMemoryEvents,
  listQuests,
  listSkillsAndClasses,
  listTodos,
  renderCheck,
  renderParty,
  renderWhoami,
  revokeInvite,
  runSetup,
  showAgent,
  showCommand,
  startPair,
  startQuest,
  updatePair
} from "./core.ts";

type ParsedArgs = {
  positionals: string[];
  flags: Record<string, string | boolean>;
};

function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = argv[index + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        index += 1;
      } else {
        flags[key] = true;
      }
    } else {
      positionals.push(token);
    }
  }
  return { positionals, flags };
}

function flag(flags: Record<string, string | boolean>, name: string): string | undefined {
  const value = flags[name];
  return typeof value === "string" ? value : undefined;
}

function numberFlag(flags: Record<string, string | boolean>, name: string): number | undefined {
  const value = flag(flags, name);
  return value === undefined ? undefined : Number(value);
}

async function promptFor(flags: Record<string, string | boolean>, name: string, question: string, fallback?: string): Promise<string> {
  const existing = flag(flags, name);
  if (existing) return existing;
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing --${name}.`);
  }
  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question(`${question} `);
    return answer.trim() || fallback || "";
  } finally {
    rl.close();
  }
}

function help(): string {
  return [
    "MYney RPG MemoryCore CLI",
    "",
    "Commands:",
    "  setup",
    "  whoami [--actor codename]",
    "  party",
    "  quest add|list|start|complete",
    "  pair start|update|end",
    "  handoff",
    "  invite create|list|revoke",
    "  agent list|show <name>",
    "  command list|show <name>",
    "  skills",
    "  memory add|list",
    "  todo add|list|done",
    "  check"
  ].join("\n");
}

async function main(): Promise<void> {
  const root = process.cwd();
  const { positionals, flags } = parseArgs(process.argv.slice(2));
  const command = positionals[0] || "help";
  const subcommand = positionals[1];

  if (command === "help" || command === "--help" || command === "-h") {
    console.log(help());
    return;
  }

  if (command === "setup") {
    const initialized = isInitialized(root);
    const name = await promptFor(flags, "name", initialized ? "Your display name?" : "Owner display name?");
    const codename = await promptFor(flags, "codename", initialized ? "Your codename?" : "Owner codename?");
    const className = await promptFor(flags, "class", "RPG coding class? (try: Necro Summoner, Stack Paladin, Prompt Alchemist)", "Prompt Alchemist");
    const conversationLanguage = await promptFor(flags, "conversation-language", "Conversation language?", "Melayu");
    const codingLanguage = await promptFor(flags, "coding-language", "Coding/adventure language?", "English");
    const mode = initialized ? undefined : await promptFor(flags, "mode", "Project mode (solo/team)?", "solo");
    const joinMode = !initialized && mode === "team"
      ? await promptFor(flags, "join-mode", "Join mode (owner-approved/open/invite)?", "owner-approved")
      : flag(flags, "join-mode");
    const roster = flag(flags, "roster")?.split(",").map((item) => item.trim()).filter(Boolean);
    console.log(runSetup(root, {
      name,
      codename,
      className,
      conversationLanguage,
      codingLanguage,
      mode: mode as "solo" | "team" | undefined,
      joinMode: joinMode as "owner-approved" | "open" | "invite" | undefined,
      roster,
      invite: flag(flags, "invite")
    }));
    return;
  }

  if (command === "whoami") {
    console.log(renderWhoami(root, flag(flags, "actor")));
    return;
  }

  if (command === "party") {
    console.log(renderParty(root));
    return;
  }

  if (command === "quest") {
    if (subcommand === "add") {
      console.log(addQuest(root, {
        actor: flag(flags, "actor"),
        title: flag(flags, "title") || "",
        id: flag(flags, "id"),
        assignee: flag(flags, "assignee"),
        xp: numberFlag(flags, "xp"),
        gate: flag(flags, "gate")
      }));
      return;
    }
    if (subcommand === "list") {
      console.log(listQuests(root));
      return;
    }
    if (subcommand === "start") {
      console.log(startQuest(root, positionals[2] || flag(flags, "id") || "", flag(flags, "actor")));
      return;
    }
    if (subcommand === "complete") {
      console.log(completeQuest(root, positionals[2] || flag(flags, "id") || "", flag(flags, "actor")));
      return;
    }
  }

  if (command === "pair") {
    if (subcommand === "start") {
      console.log(startPair(root, {
        actor: flag(flags, "actor"),
        partner: flag(flags, "partner") || "",
        task: flag(flags, "task") || ""
      }));
      return;
    }
    if (subcommand === "update") {
      console.log(updatePair(root, {
        actor: flag(flags, "actor"),
        task: flag(flags, "task"),
        note: flag(flags, "note"),
        status: flag(flags, "status")
      }));
      return;
    }
    if (subcommand === "end") {
      console.log(endPair(root, {
        actor: flag(flags, "actor"),
        summary: flag(flags, "summary") || "none"
      }));
      return;
    }
  }

  if (command === "handoff") {
    const finished = await promptFor(flags, "finished", "What finished this session?");
    const nextAction = await promptFor(flags, "next", "Next action?");
    const blocker = flag(flags, "blocker") || "none";
    console.log(handoff(root, {
      actor: flag(flags, "actor"),
      finished,
      nextAction,
      blocker
    }));
    return;
  }

  if (command === "invite") {
    if (subcommand === "create") {
      console.log(createInvite(root, {
        actor: flag(flags, "actor"),
        code: flag(flags, "code"),
        codename: flag(flags, "for")
      }));
      return;
    }
    if (subcommand === "list") {
      console.log(listInvites(root));
      return;
    }
    if (subcommand === "revoke") {
      console.log(revokeInvite(root, {
        actor: flag(flags, "actor"),
        code: positionals[2] || flag(flags, "code") || ""
      }));
      return;
    }
  }

  if (command === "agent") {
    if (subcommand === "list") {
      console.log(listAgents(root));
      return;
    }
    if (subcommand === "show") {
      console.log(showAgent(root, positionals[2] || ""));
      return;
    }
  }

  if (command === "command") {
    if (subcommand === "list") {
      console.log(listCommands(root));
      return;
    }
    if (subcommand === "show") {
      console.log(showCommand(root, positionals[2] || ""));
      return;
    }
  }

  if (command === "skills") {
    console.log(listSkillsAndClasses(root));
    return;
  }

  if (command === "memory") {
    if (subcommand === "add") {
      console.log(addMemoryEvent(root, {
        actor: flag(flags, "actor"),
        kind: flag(flags, "kind") as never,
        summary: flag(flags, "summary") || ""
      }));
      return;
    }
    if (subcommand === "list") {
      console.log(listMemoryEvents(root));
      return;
    }
  }

  if (command === "todo") {
    if (subcommand === "add") {
      console.log(addTodo(root, {
        actor: flag(flags, "actor"),
        owner: flag(flags, "owner"),
        text: flag(flags, "text") || ""
      }));
      return;
    }
    if (subcommand === "list") {
      console.log(listTodos(root));
      return;
    }
    if (subcommand === "done") {
      console.log(completeTodo(root, {
        actor: flag(flags, "actor"),
        id: positionals[2] || flag(flags, "id") || ""
      }));
      return;
    }
  }

  if (command === "check") {
    const result = checkProject(root);
    console.log(renderCheck(result));
    if (!result.ok) {
      process.exitCode = 1;
    }
    return;
  }

  throw new Error(`Unknown command. Use \`npm run myney -- help\`.\n${help()}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
