import { prisma } from "./prisma";

export async function getSectorMenu(sectorSlug: string) {
  const sector = await prisma.sector.findUnique({
    where: { slug: sectorSlug },
    include: {
      legalLevels: {
        where: { isVisible: true },
        include: { legalLevel: true },
        orderBy: [
          { orderOverride: "asc" },
          { legalLevel: { legalOrder: "asc" } }
        ]
      }
    }
  });
  if (!sector) return [];
  return sector.legalLevels.map((item) => ({
    label: item.labelOverride || item.legalLevel.name,
    slug: item.legalLevel.slug,
    id: item.legalLevelId,
    order: item.orderOverride ?? item.legalLevel.legalOrder
  }));
}
