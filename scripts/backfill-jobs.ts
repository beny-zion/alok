import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { JobListing } from "../src/models/job-listing.model";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!);

  const total = await JobListing.countDocuments();
  console.log(`Total jobs in DB: ${total}`);

  const missingStatus = await JobListing.countDocuments({ status: { $exists: false } });
  const missingTitle = await JobListing.countDocuments({
    $or: [{ title: { $exists: false } }, { title: "" }],
  });
  console.log(`  missing status: ${missingStatus}`);
  console.log(`  missing title:  ${missingTitle}`);

  const result = await JobListing.updateMany(
    { status: { $exists: false } },
    {
      $set: {
        status: "open",
        publicVisible: false,
        urgent: false,
        placementsCount: 0,
        paymentSchedule: "two-installments",
        firstPaymentDays: 90,
      },
    }
  );
  console.log(`Backfilled defaults on ${result.modifiedCount} jobs.`);

  // Title fallback — derive from sector / jobPermanence / companyName
  const cursor = JobListing.find({
    $or: [{ title: { $exists: false } }, { title: "" }],
  }).cursor();

  let titled = 0;
  for await (const job of cursor) {
    const fallback = job.sector || job.jobPermanence || job.companyName;
    if (fallback) {
      job.title = fallback;
      await job.save();
      titled++;
    }
  }
  console.log(`Derived title for ${titled} jobs.`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
