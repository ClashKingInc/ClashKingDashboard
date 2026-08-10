interface WorkerLoader {
  load(options: Record<string, unknown>): any;
  get(id: string, getCodeCallback: () => Promise<Record<string, unknown>>): any;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

interface RosterAssistantEnv {
  LOADER: WorkerLoader;
  OPENAI_API_KEY: string;
  CLASHKING_API_URL: string;
  AI_USAGE_SECRET?: string;
}
