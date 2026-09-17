import type { ErrorComponentProps } from "@tanstack/react-router";

const FALLBACK_MESSAGE = "Something went wrong. Try reloading.";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
      <img src="/kilode-logo-green.png" alt="Kilode" className="h-10 w-auto max-w-[180px] object-contain" />
      <h1 className="text-lg font-semibold">Kilode hit a snag</h1>
      <p className="max-w-md text-sm break-words text-muted">{errorMessage(error)}</p>
      <a href="/" className="btn-join rounded-lg px-4 py-2 text-sm font-bold">
        Back home
      </a>
    </main>
  );
}
