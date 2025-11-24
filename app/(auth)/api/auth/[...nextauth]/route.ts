// This route has to stay dynamic because NextAuth spins up a full Node runtime.
// Trying to statically analyze it caused the build to exhaust the worker memory.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// biome-ignore lint/performance/noBarrelFile: "Required"
export { GET, POST } from "@/app/(auth)/auth";
