import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL as string);

async function main() {
  console.log("Dropping schema public...");
  await sql`DROP SCHEMA IF EXISTS public CASCADE;`;
  console.log("Creating schema public...");
  await sql`CREATE SCHEMA public;`;
  console.log("Granting usage to public...");
  await sql`GRANT ALL ON SCHEMA public TO postgres;`;
  await sql`GRANT ALL ON SCHEMA public TO public;`;
  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
