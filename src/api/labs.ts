import { request } from "@/lib/api";
import type { CheckResult, LabDetail, LabSession } from "@/lib/types";

export const labsApi = {
  detail: (courseSlug: string, labSlug: string) =>
    request<LabDetail>(`/api/courses/${courseSlug}/labs/${labSlug}`, {
      auth: false,
    }),

  start: (labSlug: string) =>
    request<LabSession>(`/api/labs/${labSlug}/start`, { method: "POST" }),

  /** null when the student has no container running, which is the normal case
   *  on a fresh page load rather than an error. */
  current: () =>
    request<{ session: LabSession | null }>("/api/lab-sessions/current").then(
      (r) => r.session,
    ),

  stop: (id: string) =>
    request<void>(`/api/lab-sessions/${id}`, { method: "DELETE" }),

  /** Grades one task against the running container. Scoped to the session
   *  because that is what decides which container the check runs in. */
  check: (sessionID: string, taskID: number, selected: number[] = []) =>
    request<CheckResult>(
      `/api/lab-sessions/${sessionID}/tasks/${taskID}/check`,
      { method: "POST", body: { selected } },
    ),
};

/** The terminal lives on the API host, not the Vite dev server, and the scheme
 *  has to track https so a deployed page does not try to open ws:// from a
 *  secure origin — browsers refuse that outright. */
export function terminalURL(path: string): string {
  const base = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
  return new URL(path, base).toString().replace(/^http/, "ws");
}
