import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

type Membership = { plan:"free" | "plus"; status:string; currentPeriodEnd:string | null; updatedAt:string };
type UserRecord = { createdAt:string; updatedAt:string; profile:unknown | null; history:unknown[]; membership:Membership };
type RateRecord = { userId:string; feature:string; window:string; count:number; updatedAt:string };
type Store = {
  version:1;
  users:Record<string, UserRecord>;
  rateLimits:Record<string, RateRecord>;
  aiGenerations:Array<Record<string, unknown>>;
  feedback:Array<Record<string, unknown>>;
  usageEvents:Array<Record<string, unknown>>;
};

const dataDir = process.env.DATA_DIR || (process.env.NODE_ENV === "production" ? "/tmp/guanxiang-data" : path.join(process.cwd(), ".data"));
const dataFile = path.join(dataDir, "guanxiang-store.bin");
const emptyStore = (): Store => ({ version:1, users:{}, rateLimits:{}, aiGenerations:[], feedback:[], usageEvents:[] });
let cache: Store | null = null; let queue: Promise<unknown> = Promise.resolve(); let lastBackupAt = 0;

function encryptionKey() { const secret = process.env.DATA_ENCRYPTION_KEY?.trim(); return secret ? createHash("sha256").update(secret).digest() : null; }
function encode(store: Store) {
  const plain = JSON.stringify(store); const key = encryptionKey();
  if (!key && process.env.NODE_ENV === "production") throw new Error("DATA_ENCRYPTION_KEY is required in production");
  if (!key) return plain;
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", key, iv); const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `gx1:${iv.toString("base64")}:${cipher.getAuthTag().toString("base64")}:${encrypted.toString("base64")}`;
}
function decode(content: string): Store {
  let plain = content; const key = encryptionKey();
  if (content.startsWith("gx1:")) {
    if (!key) throw new Error("DATA_ENCRYPTION_KEY is required to restore this data file");
    const [, iv, tag, payload] = content.split(":"); const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64")); decipher.setAuthTag(Buffer.from(tag, "base64")); plain = Buffer.concat([decipher.update(Buffer.from(payload, "base64")), decipher.final()]).toString("utf8");
  }
  const parsed = JSON.parse(plain) as Partial<Store>;
  if (parsed.version !== 1 || !parsed.users || !parsed.rateLimits) throw new Error("Unsupported data snapshot");
  return { version:1, users:parsed.users, rateLimits:parsed.rateLimits, aiGenerations:Array.isArray(parsed.aiGenerations) ? parsed.aiGenerations : [], feedback:Array.isArray(parsed.feedback) ? parsed.feedback : [], usageEvents:Array.isArray(parsed.usageEvents) ? parsed.usageEvents : [] };
}

function tosConfig() {
  const endpoint = process.env.TOS_ENDPOINT?.trim(); const region = process.env.TOS_REGION?.trim(); const bucket = process.env.TOS_BUCKET?.trim(); const accessKeyId = process.env.TOS_ACCESS_KEY?.trim(); const secretAccessKey = process.env.TOS_SECRET_KEY?.trim();
  return endpoint && region && bucket && accessKeyId && secretAccessKey ? { endpoint, region, bucket, accessKeyId, secretAccessKey } : null;
}
function tosClient(config: NonNullable<ReturnType<typeof tosConfig>>) { return new S3Client({ endpoint:config.endpoint, region:config.region, forcePathStyle:false, credentials:{ accessKeyId:config.accessKeyId, secretAccessKey:config.secretAccessKey } }); }

async function restoreFromTos() {
  const config = tosConfig(); if (!config) return null;
  const prefix = (process.env.TOS_BACKUP_PREFIX || "guanxiang/backups").replace(/\/$/, "");
  try { const result = await tosClient(config).send(new GetObjectCommand({ Bucket:config.bucket, Key:process.env.TOS_BACKUP_KEY || `${prefix}/latest.bin` })); const content = await result.Body?.transformToString(); return content ? decode(content) : null; }
  catch { return null; }
}

async function loadStore() {
  if (cache) return cache;
  try { cache = decode(await readFile(dataFile, "utf8")); return cache; }
  catch {
    const restored = await restoreFromTos(); cache = restored ?? emptyStore(); await persistLocal(cache); return cache;
  }
}
async function persistLocal(store: Store) {
  await mkdir(dataDir, { recursive:true }); const temporary = `${dataFile}.${process.pid}.tmp`; await writeFile(temporary, encode(store), { mode:0o600 }); await rename(temporary, dataFile);
}
async function maybeBackup(store: Store) {
  const config = tosConfig(); if (!config) return;
  const interval = Math.max(60, Number(process.env.TOS_BACKUP_INTERVAL_SECONDS || 900)) * 1000; if (Date.now() - lastBackupAt < interval) return;
  const body = encode(store); const client = tosClient(config); const day = new Date().toISOString().slice(0, 10); const prefix = (process.env.TOS_BACKUP_PREFIX || "guanxiang/backups").replace(/\/$/, "");
  await Promise.all([
    client.send(new PutObjectCommand({ Bucket:config.bucket, Key:`${prefix}/latest.bin`, Body:body, ContentType:"application/octet-stream", ServerSideEncryption:"AES256" })),
    client.send(new PutObjectCommand({ Bucket:config.bucket, Key:`${prefix}/daily/${day}.bin`, Body:body, ContentType:"application/octet-stream", ServerSideEncryption:"AES256" })),
  ]); lastBackupAt = Date.now();
}

async function mutate<T>(operation: (store: Store) => T | Promise<T>) {
  let resolveResult: (value:T | PromiseLike<T>) => void = () => undefined; let rejectResult: (reason?:unknown) => void = () => undefined;
  const result = new Promise<T>((resolve, reject) => { resolveResult = resolve; rejectResult = reject; });
  queue = queue.then(async () => { const store = await loadStore(); const value = await operation(store); await persistLocal(store); try { await maybeBackup(store); } catch { /* Local durability remains available; health endpoint reports backup config. */ } resolveResult(value); }).catch(rejectResult);
  return result;
}

function defaultMembership(): Membership { return { plan:"free", status:"active", currentPeriodEnd:null, updatedAt:new Date().toISOString() }; }

export async function ensureUser(userId: string) { return mutate((store) => { const now = new Date().toISOString(); store.users[userId] ??= { createdAt:now, updatedAt:now, profile:null, history:[], membership:defaultMembership() }; store.users[userId].updatedAt = now; return store.users[userId]; }); }
export async function getUserState(userId: string) { const store = await loadStore(); const user = store.users[userId]; return user ? { profile:user.profile, history:user.history } : { profile:null, history:[] }; }
export async function saveUserState(userId: string, profile: unknown, history: unknown[]) { return mutate((store) => { const now = new Date().toISOString(); const user = store.users[userId] ?? { createdAt:now, updatedAt:now, profile:null, history:[], membership:defaultMembership() }; user.profile = profile; user.history = history.slice(0, 20); user.updatedAt = now; store.users[userId] = user; return { saved:user.history.length, syncedAt:now }; }); }
export async function deleteUserData(userId: string, scope:"readings" | "all") { return mutate((store) => { if (scope === "all") { delete store.users[userId]; for (const key of Object.keys(store.rateLimits)) if (store.rateLimits[key].userId === userId) delete store.rateLimits[key]; store.feedback = store.feedback.filter((item) => item.userId !== userId); store.usageEvents = store.usageEvents.filter((item) => item.userId !== userId); store.aiGenerations = store.aiGenerations.map((item) => item.userId === userId ? { ...item, userId:null } : item); } else if (store.users[userId]) { store.users[userId].history = []; store.users[userId].updatedAt = new Date().toISOString(); } return true; }); }

export async function membershipForUser(userId: string) { const store = await loadStore(); return store.users[userId]?.membership ?? defaultMembership(); }
export async function consumeUserQuota(userId: string, feature:string, limit:number) { return mutate((store) => { const window = new Date().toISOString().slice(0, 10); const key = `${userId}:${feature}:${window}`; const now = new Date().toISOString(); const record = store.rateLimits[key] ?? { userId, feature, window, count:0, updatedAt:now }; record.count += 1; record.updatedAt = now; store.rateLimits[key] = record; return { used:record.count, limit, remaining:Math.max(0, limit - record.count), allowed:record.count <= limit, window }; }); }
export async function usageForUser(userId: string) { const store = await loadStore(); const window = new Date().toISOString().slice(0, 10); const result:Record<string,number> = {}; for (const record of Object.values(store.rateLimits)) if (record.userId === userId && record.window === window) result[record.feature] = (result[record.feature] ?? 0) + record.count; return result; }
export async function appendAiGeneration(event: Record<string, unknown>) { return mutate((store) => { store.aiGenerations.push({ id:crypto.randomUUID(), ...event, createdAt:new Date().toISOString() }); store.aiGenerations = store.aiGenerations.slice(-5_000); }); }
export async function appendFeedback(event: Record<string, unknown>) { return mutate((store) => { store.feedback.push({ id:crypto.randomUUID(), ...event, createdAt:new Date().toISOString() }); store.feedback = store.feedback.slice(-5_000); }); }
export async function appendUsageEvent(event: Record<string, unknown>) { return mutate((store) => { store.usageEvents.push({ id:crypto.randomUUID(), ...event, createdAt:new Date().toISOString() }); store.usageEvents = store.usageEvents.slice(-10_000); }); }

export async function storageHealth() {
  let fileBytes = 0; try { fileBytes = (await stat(dataFile)).size; } catch { /* File will be created on first login. */ }
  const encrypted = Boolean(encryptionKey());
  return { provider:"encrypted-file", dataDir, encrypted, tosConfigured:Boolean(tosConfig()), writable:process.env.NODE_ENV !== "production" || encrypted, fileBytes };
}
