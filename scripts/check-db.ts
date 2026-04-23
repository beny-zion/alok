import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { Candidate } from "../src/models/candidate.model";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);

  const total = await Candidate.countDocuments();
  const withEmail = await Candidate.countDocuments({ email: { $exists: true, $ne: "" } });
  const withoutEmail = await Candidate.countDocuments({
    $or: [{ email: { $exists: false } }, { email: "" }, { noEmail: true }],
  });
  const smooveSynced = await Candidate.countDocuments({ smooveSynced: true });
  const smoovePending = await Candidate.countDocuments({
    email: { $exists: true, $ne: "" },
    smooveSynced: { $ne: true },
  });
  const smooveFailed = await Candidate.countDocuments({ smooveError: { $exists: true, $ne: null } });

  const byTag = await Candidate.aggregate([
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const multiTag = await Candidate.countDocuments({ "tags.1": { $exists: true } });

  console.log("━".repeat(50));
  console.log("📊 DATABASE STATE");
  console.log("━".repeat(50));
  console.log(`Total candidates:        ${total}`);
  console.log(`  with email:            ${withEmail}`);
  console.log(`  without email:         ${withoutEmail}`);
  console.log(`  multi-tag (cross-sheet): ${multiTag}`);
  console.log("");
  console.log("Smoove sync status:");
  console.log(`  synced:                ${smooveSynced}`);
  console.log(`  pending (email, not synced): ${smoovePending}`);
  console.log(`  failed (last error):   ${smooveFailed}`);
  console.log("");
  console.log("By tag:");
  byTag.forEach((t) => console.log(`  ${t._id.padEnd(20)} ${t.count}`));

  const sampleErr = await Candidate.findOne({ smooveError: { $exists: true, $ne: null } })
    .select("email smooveError")
    .lean();
  if (sampleErr) {
    console.log("\nSample Smoove error message:");
    console.log(`  ${sampleErr.email} → "${sampleErr.smooveError}"`);
  }

  await mongoose.disconnect();
}

main().catch(console.error);
