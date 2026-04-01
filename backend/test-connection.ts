import { checkDatabaseConnection, ensureConnection } from "./src/lib/db-utils";
import prisma from "./src/lib/prisma";

async function testConnection() {
  console.log("🔍 Testing database connection...");

  // Test 1: Basic connection check
  const isConnected = await checkDatabaseConnection();
  console.log(`✅ Connection check: ${isConnected ? "PASSED" : "FAILED"}`);

  // Test 2: Ensure connection
  await ensureConnection();
  console.log("✅ Ensure connection: PASSED");

  // Test 3: Simple query
  const userCount = await prisma.user.count();
  console.log(`✅ User count query: ${userCount} users found`);

  await prisma.$disconnect();
  console.log("✅ All tests passed!");
}

testConnection().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});
