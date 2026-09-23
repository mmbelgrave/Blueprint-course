// The Anthropic client for server code. Reads ANTHROPIC_API_KEY from the
// environment. An organisation-level key (not scoped to a workspace) also needs
// ANTHROPIC_WORKSPACE_ID; a key created inside a workspace does not.
import Anthropic from "@anthropic-ai/sdk";

export function anthropicClient() {
  const workspace = process.env.ANTHROPIC_WORKSPACE_ID?.trim();
  return new Anthropic(workspace ? { defaultHeaders: { "anthropic-workspace-id": workspace } } : {});
}
