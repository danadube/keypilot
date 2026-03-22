// Load .env.local so DATABASE_URL is available to prismaAdmin in tests.
// Must run before any module that initializes PrismaClient.
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("dotenv").config({ path: ".env.local" });
