import { prisma } from "@/lib/db";

/**
 * Builds a glossary context string for injection into the NL→SQL prompt.
 * Returns empty string if the org has no glossary terms.
 */
export async function getGlossaryContext(orgId: string): Promise<string> {
  const terms = await prisma.glossaryTerm.findMany({
    where: { orgId },
    orderBy: { term: "asc" },
  });

  if (terms.length === 0) return "";

  const lines = terms.map((t: any) => {
    const desc = t.description ? ` -- ${t.description}` : "";
    return `- "${t.term}" (${t.category}): ${t.definition}${desc}`;
  });

  return `BUSINESS GLOSSARY:\n${lines.join("\n")}`;
}
