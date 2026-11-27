import { getSupabaseBrowserClient } from "@/lib/supabase";

const API_BASE_URL = import.meta.env["VITE_API_BASE_URL"]?.replace(/\/$/, "") ?? "";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiErrorPayload = {
  message?: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("The LaundryFlow API is not configured. Set VITE_API_BASE_URL to connect it.");
  }

  let response: Response;
  try {
    const {
      data: { session },
      error: sessionError,
    } = await getSupabaseBrowserClient().auth.getSession();

    if (sessionError) {
      throw new ApiError("Unable to verify your session. Please sign in again.", 401);
    }

    const headers = new Headers(init?.headers);
    if (!(init?.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    if (session?.access_token) {
      headers.set("Authorization", `Bearer ${session.access_token}`);
    }

    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.message.includes("Supabase is not configured")) {
      throw error;
    }
    throw new ApiError(
      "Unable to reach the LaundryFlow service. Check your connection and try again.",
      0,
    );
  }

  if (!response.ok) {
    let message = `LaundryFlow service returned an error (${response.status}).`;
    try {
      const payload = (await response.json()) as ApiErrorPayload;
      if (payload.message) message = payload.message;
    } catch {
      // Keep the status-based fallback when the API response is not JSON.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
