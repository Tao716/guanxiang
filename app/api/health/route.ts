import { getAiRuntime } from "../../lib/ai-provider";
import { authConfiguration } from "../../lib/auth";
import { storageHealth } from "../../lib/storage";
export async function GET() {
  const storage = await storageHealth(); const auth = authConfiguration();
  const checks = { inviteCodes:auth.inviteCodes > 0, sessionSecret:auth.sessionSecret, encryptedStorage:storage.encrypted, durableBackup:storage.tosConfigured, ai:Boolean(getAiRuntime()) };
  return Response.json({ ok:true, ready:Object.values(checks).every(Boolean), service:"guanxiang", version:process.env.APP_VERSION || "development", checks, storage:{ provider:storage.provider, encrypted:storage.encrypted, tosConfigured:storage.tosConfigured, fileBytes:storage.fileBytes }, timestamp:new Date().toISOString() }, { headers:{ "Cache-Control":"no-store" } });
}
