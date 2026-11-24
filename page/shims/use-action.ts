import { type UseQueryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type Outcome =
  | { state: "succeeded"; output: unknown }
  | { state: string; reason?: { message?: string; code?: string } };

export class ActionError extends Error {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

export async function callAction<T = unknown>(
  name: string,
  args: unknown = {},
  _options?: { method?: string },
): Promise<T> {
  const response = await fetch("/api/calls", {
    method: "POST",
    credentials: "same-origin",
    headers: { "x-kit-request": "1", "content-type": "application/json" },
    body: JSON.stringify({ id: crypto.randomUUID(), action: `brand.${name}`, input: args ?? {} }),
  });
  const outcome = (await response.json()) as Outcome;
  if (outcome.state === "succeeded") return (outcome as { output: T }).output;
  const reason = "reason" in outcome ? outcome.reason : undefined;
  throw new ActionError(
    reason?.message ?? `The action ${name} did not go through.`,
    reason?.code ?? outcome.state,
  );
}

export function actionErrorMessage(error: unknown): string | undefined {
  return error instanceof Error ? error.message : undefined;
}

export function useActionQuery<T = unknown>(
  name: string,
  args: unknown = {},
  options: Partial<UseQueryOptions<T>> = {},
) {
  return useQuery<T>({
    queryKey: ["action", name, args],
    queryFn: () => callAction<T>(name, args),
    ...options,
  });
}

export function useActionMutation<T = unknown, A = Record<string, unknown>>(
  name: string,
  options: { onError?: (error: Error) => void; onSuccess?: (data: T) => void } = {},
) {
  const qc = useQueryClient();
  return useMutation<T, Error, A>({
    mutationFn: (args: A) => callAction<T>(name, args),
    onSuccess: async (data) => {
      await qc.invalidateQueries({ queryKey: ["action"] });
      options.onSuccess?.(data);
    },
    ...(options.onError ? { onError: options.onError } : {}),
  });
}
