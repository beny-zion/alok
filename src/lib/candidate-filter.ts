/**
 * Builds a MongoDB filter from URL search params. Shared between
 * /api/candidates (list + count) and /api/candidates/ids (select-all).
 * Keep these two endpoints in lock-step via this helper.
 */
export function buildCandidateFilter(
  searchParams: URLSearchParams
): Record<string, unknown> {
  const city = searchParams.get("city");
  const sector = searchParams.get("sector");
  const search = searchParams.get("search");
  const gender = searchParams.get("gender");
  const jobType = searchParams.get("jobType");
  const jobPermanence = searchParams.get("jobPermanence");
  const status = searchParams.get("status");
  const tag = searchParams.get("tag");
  const source = searchParams.get("source");
  const hasEmail = searchParams.get("hasEmail");
  const hasPhone = searchParams.get("hasPhone");
  const noName = searchParams.get("noName");
  const smooveStatus = searchParams.get("smooveStatus");
  const ageMin = searchParams.get("ageMin");
  const ageMax = searchParams.get("ageMax");
  const salaryMin = searchParams.get("salaryMin");
  const salaryMax = searchParams.get("salaryMax");

  const filter: Record<string, unknown> = {};

  if (city) filter.city = city;
  if (gender) filter.gender = gender;
  if (jobType) filter.jobType = jobType;
  if (jobPermanence) filter.jobPermanence = jobPermanence;
  if (status) filter.status = status;
  if (source) filter.source = source;
  if (sector) filter.sectors = { $in: [sector] };
  if (tag) filter.tags = { $in: [tag] };

  if (hasEmail === "true") filter.email = { $exists: true, $ne: "" };
  if (hasEmail === "false") filter.$or = [{ email: { $exists: false } }, { email: "" }];
  if (hasPhone === "true") filter.phone = { $exists: true, $ne: "" };
  if (hasPhone === "false") {
    const phoneMissing = { $or: [{ phone: { $exists: false } }, { phone: "" }] };
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, phoneMissing];
      delete filter.$or;
    } else {
      Object.assign(filter, phoneMissing);
    }
  }

  if (noName === "true") {
    const nameBlank = (f: string) => ({ $or: [{ [f]: { $exists: false } }, { [f]: "" }] });
    const noNameBlock = {
      $and: [nameBlank("firstName"), nameBlank("lastName"), nameBlank("fullName")],
    };
    if (filter.$and) (filter.$and as unknown[]).push(noNameBlock);
    else filter.$and = [noNameBlock];
  }

  if (smooveStatus === "synced") filter.smooveSynced = true;
  if (smooveStatus === "pending") {
    filter.email = { $exists: true, $ne: "" };
    filter.smooveSynced = { $ne: true };
    filter.smooveError = { $in: [null, undefined, ""] };
  }
  if (smooveStatus === "error") filter.smooveError = { $exists: true, $nin: [null, ""] };
  if (smooveStatus === "unsynced") filter.smooveSynced = { $ne: true };

  if (ageMin || ageMax) {
    const ageFilter: Record<string, number> = {};
    if (ageMin) ageFilter.$gte = Number(ageMin);
    if (ageMax) ageFilter.$lte = Number(ageMax);
    filter.age = ageFilter;
  }
  if (salaryMin || salaryMax) {
    const salaryFilter: Record<string, number> = {};
    if (salaryMin) salaryFilter.$gte = Number(salaryMin);
    if (salaryMax) salaryFilter.$lte = Number(salaryMax);
    filter.salaryExpectation = salaryFilter;
  }

  if (search) {
    const searchOr = [
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
      { fullName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { city: { $regex: search, $options: "i" } },
      { idNumber: { $regex: search, $options: "i" } },
    ];
    if (filter.$and) {
      (filter.$and as unknown[]).push({ $or: searchOr });
    } else if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
      delete filter.$or;
    } else {
      filter.$or = searchOr;
    }
  }

  return filter;
}
