import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  indexesSynced: boolean;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null, indexesSynced: false };
if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

async function syncCandidateIndexes() {
  if (cached.indexesSynced) return;
  try {
    const { Candidate } = await import("@/models/candidate.model");
    const existing = await Candidate.collection.indexes();
    const oldEmailIdx = existing.find(
      (i: { name?: string; unique?: boolean }) => i.name === "email_1" && i.unique
    );
    if (oldEmailIdx) {
      console.log("[db] Dropping legacy unique email index for new sparse non-unique schema");
      await Candidate.collection.dropIndex("email_1");
    }
    await Candidate.syncIndexes();
    cached.indexesSynced = true;
  } catch (err) {
    console.error("[db] Index sync failed:", err);
  }
}

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  await syncCandidateIndexes();
  return cached.conn;
}
