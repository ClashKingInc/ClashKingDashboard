interface WorkerLoader {
  load(options: Record<string, unknown>): any;
  get(id: string, getCodeCallback: () => Promise<Record<string, unknown>>): any;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

interface RosterAssistantRuntimeEnv {
  LOADER: RosterAssistantBindings["LOADER"];
  CLASHKING_API_ORIGIN: string;
  OPENAI_API_KEY: string;
  AI_USAGE_SECRET: string;
}
