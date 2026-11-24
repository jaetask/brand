import type { PGlite, Transaction } from "@electric-sql/pglite";

export type DbRows = { rows: unknown[] };
export type DbExec = {
  execute(query: { sql: string; args?: unknown[] }): Promise<DbRows>;
  transaction?<T>(fn: (tx: DbExec) => Promise<T>): Promise<T>;
};

export class ActionFailure extends Error {
  readonly errorCode: string;
  readonly statusCode: number;
  constructor(message: string, errorCode: string, statusCode: number) {
    super(message);
    this.errorCode = errorCode;
    this.statusCode = statusCode;
  }
}

export function fail(
  message: string,
  options: { errorCode?: string; statusCode?: number } = {},
): ActionFailure {
  return new ActionFailure(
    message,
    options.errorCode ?? "invalid_input",
    options.statusCode ?? 400,
  );
}

export function toPostgresParams(sql: string): string {
  let out = "";
  let n = 0;
  let quote: "'" | '"' | null = null;
  for (const ch of sql) {
    if (quote) {
      out += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      out += ch;
      continue;
    }
    if (ch === "?") {
      n += 1;
      out += `$${n}`;
      continue;
    }
    out += ch;
  }
  return out;
}

const value = (v: unknown) => (v === undefined ? null : v);

function over(client: PGlite | Transaction, top: PGlite | undefined): DbExec {
  const exec: DbExec = {
    execute: async ({ sql, args = [] }) => {
      const result = await client.query(toPostgresParams(sql), args.map(value));
      return { rows: result.rows };
    },
  };
  if (top)
    exec.transaction = <T>(fn: (tx: DbExec) => Promise<T>) =>
      top.transaction((tx) => fn(over(tx, undefined)));
  return exec;
}

let current: DbExec | undefined;
export function bindDatabase(pg: PGlite): void {
  current = over(pg, pg);
}
export function getDbExec(): DbExec {
  if (!current) throw new Error("Brand's database is not open.");
  return current;
}
