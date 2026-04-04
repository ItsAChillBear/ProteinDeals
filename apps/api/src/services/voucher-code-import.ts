import { db } from "@proteindeals/db";
import type { VoucherCodesOffer } from "../scrapers/vouchercodes.js";
import type { VoucherCodeTestResult } from "../scrapers/vouchercodes-tester.js";

export interface ImportVoucherCodesResult {
  imported: number;
  created: number;
  updated: number;
  skipped: number;
}

export async function importWorkingVoucherCodes(args: {
  records: VoucherCodesOffer[];
  testResults: VoucherCodeTestResult[];
}) {
  const retailer = await ensureMyproteinRetailer();
  const testsById = new Map(args.testResults.map((result) => [result.id, result]));
  const eligible = args.records.filter((record) => {
    const test = testsById.get(record.id);
    return test?.status === "working" || test?.status === "better_offer";
  });

  const result: ImportVoucherCodesResult = {
    imported: 0,
    created: 0,
    updated: 0,
    skipped: args.records.length - eligible.length,
  };

  for (const record of eligible) {
    const test = testsById.get(record.id);
    if (!record.code || !test) continue;

    const existing = await db.voucherCode.findFirst({
      where: {
        retailerId: retailer.id,
        code: record.code,
      },
    });

    const data = {
      retailerId: retailer.id,
      source: "vouchercodes",
      externalId: String(record.id),
      title: record.title ?? "Untitled voucher code",
      code: record.code,
      description: record.description,
      sourceUrl: record.sourceUrl,
      merchantUrl: record.merchantUrl,
      isExclusive: record.isExclusive,
      worksWithSale: record.worksWithSale,
      termsAvailable: record.termsAvailable,
      lastUsedText: record.lastUsed,
      expiresAt: record.expiresAt ? new Date(record.expiresAt) : null,
      testStatus: test.status,
      testMessageType: test.messageType,
      testMessage: test.message,
      testedAt: new Date(test.testedAt),
      lastImportedAt: new Date(),
    };

    if (existing) {
      await db.voucherCode.update({
        where: { id: existing.id },
        data,
      });
      result.updated += 1;
    } else {
      await db.voucherCode.create({
        data,
      });
      result.created += 1;
    }

    result.imported += 1;
  }

  return result;
}

async function ensureMyproteinRetailer() {
  const existing = await db.retailer.findUnique({
    where: { slug: "myprotein" },
  });

  if (existing) return existing;

  return db.retailer.create({
    data: {
      name: "MyProtein",
      slug: "myprotein",
      baseUrl: "https://www.myprotein.com",
      affiliatePrefix: "https://www.awin1.com/myprotein",
      isActive: true,
    },
  });
}
