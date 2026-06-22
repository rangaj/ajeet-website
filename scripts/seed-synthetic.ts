/**
 * Seed 5,000 synthetic alumni records for search/import performance testing.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed:synthetic
 *
 * Requires service role key — never use in frontend.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const count = Number(process.env.SEED_COUNT ?? 5000);
const batchSize = 500;

if (!url || !serviceKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

const courses = ["Science", "Commerce", "Arts"];
const streams = ["A", "B", "C"];
const companies = ["TCS", "Infosys", "Google", "Microsoft", "HDFC", "Self Employed"];
const locations = ["Mumbai", "Bangalore", "Delhi", "Chennai", "Pune", "Hyderabad"];
const houses = ["Red", "Blue", "Green", "Yellow"];

function row(i: number) {
  const year = 1990 + (i % 30);
  return {
    roll_number: `SEED-${String(i).padStart(5, "0")}`,
    name: `Alumni User ${i}`,
    email: `alumni${i}@example.test`,
    course: courses[i % courses.length],
    stream: streams[i % streams.length],
    course_start_year: year,
    course_end_year: year + 2,
    company: companies[i % companies.length],
    job_position: ["Engineer", "Manager", "Director", "Analyst"][i % 4],
    current_location: locations[i % locations.length],
    house: houses[i % houses.length],
    professional_skills: "Leadership, Communication",
    industries_worked_in: "Technology",
    status: "approved" as const,
    is_directory_visible: i % 10 !== 0,
  };
}

async function main() {
  console.log(`Seeding ${count} synthetic alumni...`);
  let inserted = 0;

  for (let offset = 0; offset < count; offset += batchSize) {
    const batch = Array.from(
      { length: Math.min(batchSize, count - offset) },
      (_, j) => row(offset + j + 1)
    );
    const { error } = await supabase.from("alumni_members").upsert(batch, {
      onConflict: "roll_number",
      ignoreDuplicates: true,
    });
    if (error) {
      console.error("Batch failed:", error.message);
      process.exit(1);
    }
    inserted += batch.length;
    console.log(`  ${inserted}/${count}`);
  }

  console.log("Done.");
}

main();
