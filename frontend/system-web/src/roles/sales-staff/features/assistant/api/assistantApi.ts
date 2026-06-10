import { employeeApi } from "../../../shared/api/client";

export interface AssistantChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantChatResponse {
  answer: string;
  role: string;
  roleLabel: string;
  provider: string;
  generatedAt: string;
  context: Record<string, unknown>;
  suggestions: string[];
}

export function sendAssistantMessage(message: string, history: AssistantChatMessage[]) {
  return employeeApi.post<AssistantChatResponse>("/ai/assistant/chat", {
    message,
    history: history.slice(-8),
  });
}
