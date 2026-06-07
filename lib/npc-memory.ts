import type { SupabaseClient } from "@supabase/supabase-js";

export interface NpcMemoryRow {
  npc_name: string | null;
  memory_log: unknown;
}

export interface MemoryLogEntry {
  timestamp: string;
  userMessage: string;
  dmResponse: string;
}

export function parseMemoryLog(value: unknown): MemoryLogEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      timestamp: typeof item.timestamp === "string" ? item.timestamp : "",
      userMessage:
        typeof item.userMessage === "string" ? item.userMessage : "",
      dmResponse: typeof item.dmResponse === "string" ? item.dmResponse : "",
    }))
    .filter((item) => item.userMessage.length > 0 || item.dmResponse.length > 0);
}

export function detectMentionedNpcs(
  userMessage: string,
  npcRows: NpcMemoryRow[],
): NpcMemoryRow[] {
  const normalizedMessage = userMessage.toLowerCase();

  return npcRows.filter((row) => {
    const npcName = row.npc_name?.trim();
    if (!npcName) {
      return false;
    }

    return normalizedMessage.includes(npcName.toLowerCase());
  });
}

function formatMemoryLogEntries(entries: MemoryLogEntry[]): string {
  return entries
    .map((entry, index) => {
      const lines = [`  Interaction ${index + 1}:`];

      if (entry.timestamp) {
        lines.push(`    When: ${entry.timestamp}`);
      }

      if (entry.userMessage) {
        lines.push(`    Player: ${entry.userMessage}`);
      }

      if (entry.dmResponse) {
        lines.push(`    DM: ${entry.dmResponse}`);
      }

      return lines.join("\n");
    })
    .join("\n");
}

export function buildNpcMemorySection(mentionedNpcs: NpcMemoryRow[]): string | null {
  const npcSections = mentionedNpcs
    .map((npc) => {
      const npcName = npc.npc_name?.trim();
      if (!npcName) {
        return null;
      }

      const memoryLog = parseMemoryLog(npc.memory_log);
      if (memoryLog.length === 0) {
        return null;
      }

      return `- ${npcName}:\n${formatMemoryLogEntries(memoryLog)}`;
    })
    .filter((section): section is string => section !== null);

  if (npcSections.length === 0) {
    return null;
  }

  return `NPC MEMORY:
The following NPCs have prior interactions with the player. Use this history to keep dialogue, relationships, grudges, promises, and behavior consistent across sessions.

${npcSections.join("\n\n")}`;
}

export async function persistNpcMemories(
  supabase: SupabaseClient,
  campaignId: string,
  playerId: string,
  mentionedNpcs: NpcMemoryRow[],
  userMessage: string,
  dmResponse: string,
): Promise<void> {
  if (mentionedNpcs.length === 0 || !dmResponse.trim()) {
    return;
  }

  const entry: MemoryLogEntry = {
    timestamp: new Date().toISOString(),
    userMessage,
    dmResponse,
  };

  await Promise.all(
    mentionedNpcs.map(async (npc) => {
      const npcName = npc.npc_name?.trim();
      if (!npcName) {
        return;
      }

      const updatedLog = [...parseMemoryLog(npc.memory_log), entry];

      const { error } = await supabase.from("npc_memory").upsert(
        {
          campaign_id: campaignId,
          player_id: playerId,
          npc_name: npcName,
          memory_log: updatedLog,
        },
        { onConflict: "campaign_id,player_id,npc_name" },
      );

      if (error) {
        console.error(`Failed to upsert NPC memory for ${npcName}:`, error);
      }
    }),
  );
}
