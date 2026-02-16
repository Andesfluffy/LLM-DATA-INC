import { prisma } from "@/lib/db";
import { encryptPassword } from "@/lib/datasourceSecrets";

const DEMO_URL = process.env.DEMO_DATASOURCE_URL;

/**
 * Creates a DataSource record pointing to the demo database.
 * If DEMO_DATASOURCE_URL is not set, creates a demo pointing to localhost
 * with a known seed database.
 */
export async function createDemoDataSource(userId: string, orgId: string) {
  // Check if one already exists
  const existing = await prisma.dataSource.findFirst({
    where: { orgId, name: "Demo Database" },
  });
  if (existing) return existing;

  if (DEMO_URL) {
    // Parse the URL into parts
    const url = new URL(DEMO_URL);
    const password = url.password;
    let passwordFields: Record<string, string | null> = {
      passwordCiphertext: null,
      passwordIv: null,
      passwordTag: null,
    };

    if (password) {
      try {
        const encrypted = encryptPassword(password);
        passwordFields = {
          passwordCiphertext: encrypted.ciphertext,
          passwordIv: encrypted.iv,
          passwordTag: encrypted.authTag,
        };
      } catch {
        // If encryption fails, skip password
      }
    }

    return prisma.dataSource.create({
      data: {
        orgId,
        ownerId: userId,
        name: "Demo Database",
        type: "postgres",
        host: url.hostname,
        port: Number(url.port) || 5432,
        database: url.pathname.slice(1) || "demo",
        user: url.username || "demo_reader",
        ...passwordFields,
      },
    });
  }

  // Fallback: point to local seed DB
  return prisma.dataSource.create({
    data: {
      orgId,
      ownerId: userId,
      name: "Demo Database",
      type: "postgres",
      host: "localhost",
      port: 5432,
      database: "datavista_demo",
      user: "postgres",
    },
  });
}
