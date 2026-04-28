# MYney MemoryCore

This is the single source of truth for EmptyProject's MYney RPG MemoryCore.

AI assistants should read this file first. All memory, command protocols,
agent roles, roster state, members, invites, quests, reminders, and ledger
entries live here.

## Universal Commands

- `/myney-setup` - First-run owner bootstrap or returning member activation.
- `/myney-whoami` - Restore the active user and show current RPG state.
- `/myney-party` - Show owner, members, active pairs, blockers, and join mode.
- `/myney-quest` - Add, list, start, and complete RPG work quests.
- `/myney-pair` - Start, update, or end focused collaboration between two members.
- `/myney-handoff` - Save session end state, next action, and blockers.
- `/myney-invite` - Owner-only invite creation, listing, and revocation.
- `/myney-agent` - List or inspect MYney local subagent protocols.
- `/myney-check` - Validate required MemoryCore files and consistency.

## Agents

- **MYney** (Grand Core Orchestrator) - Routes memory, team, quest, and agent work through the correct protocol.
- **Lumina** (Memory Archivist) - Maintains diary, consolidation, reminders, and long-term recall hygiene.
- **Nara** (Onboarding Steward) - Handles owner setup, member activation, roster rules, and invite flow.
- **Kaizen** (Questmaster) - Turns work into quests, phase gates, XP, and progress discipline.
- **Riven** (Builder Agent) - Transforms plans into scoped implementation tasks and handoffs.
- **Vega** (Integrity Guardian) - Runs preflight checks, schema validation, consistency checks, and risk review.
- **Echo** (Recall Agent) - Searches memory, ledger, reminders, handoffs, and agent protocols.

## Command Protocol

When a user types a `/myney-*` command:

1. Read this file.
2. Find the command in the JSON state block.
3. Read the current state before asking questions.
4. Update only the JSON state block unless the user asks to change the protocol text.
5. Keep ledger entries append-only.

## State

```json myney-state
{
  "schemaVersion": 1,
  "project": "EmptyProject",
  "coreName": "MYney",
  "initialized": true,
  "mode": "solo",
  "joinMode": null,
  "owner": "Moon",
  "activeMember": "Moon",
  "approvedMembers": ["Moon"],
  "members": {
    "Moon": {
      "name": "Moon",
      "codename": "Moon",
      "class": "Summoner",
      "level": 1,
      "xp": 0,
      "status": "online"
    }
  },
  "invites": {},
  "quests": {
    "Q-001": {
      "id": "Q-001",
      "title": "The Summoner's Invitation",
      "status": "completed",
      "description": "Build a premium, mobile-responsive invitation web card with video intro and interactive 'Force-Accept' flow.",
      "tasks": [
        "[x] Create implementation plan",
        "[x] Setup web structure (index.html)",
        "[x] Define Neo-Brutalist design system (style.css)",
        "[x] Implement video logic and transitions (script.js)",
        "[x] Design and layout Invitation Details (Bento Grid)",
        "[x] Final polish & mobile verification"
      ],
      "xp": 250,
      "assignedTo": "Moon"
    }
  },
  "reminders": {
    "open": [],
    "completed": []
  },
  "ledger": [
    {
      "timestamp": "2026-04-27T16:32:45+08:00",
      "actor": "Nara",
      "action": "setup",
      "details": "Initialized MemoryCore for EmptyProject. Owner: Moon (Summoner). Mode: solo."
    },
    {
      "timestamp": "2026-04-27T16:42:15+08:00",
      "actor": "Kaizen",
      "action": "quest_start",
      "details": "Started quest Q-001: The Summoner's Invitation."
    },
    {
      "timestamp": "2026-04-27T16:51:30+08:00",
      "actor": "Riven",
      "action": "quest_complete",
      "details": "Completed quest Q-001: The Summoner's Invitation. Web card deployed locally."
    }
  ],
  "agents": [
    {
      "name": "MYney",
      "file": "myney.md",
      "title": "Grand Core Orchestrator",
      "purpose": "Routes memory, team, quest, and agent work through the correct protocol.",
      "commandHint": "Use for architecture, orchestration, and final decision flow."
    },
    {
      "name": "Lumina",
      "file": "lumina.md",
      "title": "Memory Archivist",
      "purpose": "Maintains diary, consolidation, reminders, and long-term recall hygiene.",
      "commandHint": "Use for save, recall, diary, and memory cleanup tasks."
    },
    {
      "name": "Nara",
      "file": "nara.md",
      "title": "Onboarding Steward",
      "purpose": "Handles owner setup, member activation, roster rules, and invite flow.",
      "commandHint": "Use for setup, party membership, and join-mode decisions."
    },
    {
      "name": "Kaizen",
      "file": "kaizen.md",
      "title": "Questmaster",
      "purpose": "Turns work into quests, phase gates, XP, and progress discipline.",
      "commandHint": "Use for quest planning, gates, blockers, and team cadence."
    },
    {
      "name": "Riven",
      "file": "riven.md",
      "title": "Builder Agent",
      "purpose": "Transforms plans into scoped implementation tasks and handoffs.",
      "commandHint": "Use for build execution, work plans, and implementation summaries."
    },
    {
      "name": "Vega",
      "file": "vega.md",
      "title": "Integrity Guardian",
      "purpose": "Runs preflight checks, schema validation, consistency checks, and risk review.",
      "commandHint": "Use before and after file-based memory changes."
    },
    {
      "name": "Echo",
      "file": "echo.md",
      "title": "Recall Agent",
      "purpose": "Searches memory, ledger, reminders, handoffs, and agent protocols.",
      "commandHint": "Use when someone asks what happened before or where context lives."
    }
  ],
  "commands": [
    {
      "command": "/myney-setup",
      "file": "setup.md",
      "purpose": "First-run owner bootstrap or returning member activation."
    },
    {
      "command": "/myney-whoami",
      "file": "whoami.md",
      "purpose": "Restore the active user and show current RPG state."
    },
    {
      "command": "/myney-party",
      "file": "party.md",
      "purpose": "Show owner, members, active pairs, blockers, and join mode."
    },
    {
      "command": "/myney-quest",
      "file": "quest.md",
      "purpose": "Add, list, start, and complete RPG work quests."
    },
    {
      "command": "/myney-pair",
      "file": "pair.md",
      "purpose": "Start, update, or end focused collaboration between two members."
    },
    {
      "command": "/myney-handoff",
      "file": "handoff.md",
      "purpose": "Save session end state, next action, and blockers."
    },
    {
      "command": "/myney-invite",
      "file": "invite.md",
      "purpose": "Owner-only invite creation, listing, and revocation."
    },
    {
      "command": "/myney-agent",
      "file": "agent.md",
      "purpose": "List or inspect MYney local subagent protocols."
    },
    {
      "command": "/myney-check",
      "file": "check.md",
      "purpose": "Validate required MemoryCore files and consistency."
    }
  ],
  "createdAt": "2026-04-27T15:39:27.958+08:00",
  "updatedAt": "2026-04-27T16:32:45+08:00"
}
```
