import { NextResponse } from "next/server";

const parseNumber = (value: string | null) => {
  if (!value) return 0;
  const normalized = value.replace(/[^0-9.]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const extractJsonScript = (html: string, id: string) => {
  const match = html.match(new RegExp(`<script[^>]*id=[\"']${id}[\"'][^>]*>([\\s\\S]*?)<\\/script>`, "i"));
  return match ? match[1] : null;
};

const extractLdJson = (html: string) => {
  const match = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i
  );
  return match ? match[1] : null;
};

const parseRemaxHtml = (html: string) => {
  const nextDataRaw = extractJsonScript(html, "__NEXT_DATA__");
  if (nextDataRaw) {
    try {
      const parsed = JSON.parse(nextDataRaw);
      const listing =
        parsed?.props?.pageProps?.dehydratedState?.queries?.[0]?.state?.data ?? null;
      if (listing) {
        return {
          address: listing.address || listing.mlsAddress || "",
          city: listing.city || listing.mlsCity || "",
          bedrooms: parseNumber(listing.beds),
          bathrooms: parseNumber(listing.baths),
          sqft: parseNumber(listing.sqFtRaw ?? listing.sqFtSearch),
          price: parseNumber(String(listing.listPrice ?? listing.marketPrice ?? "")),
          hoa: 0,
          propertyTaxAnnual: parseNumber(String(listing.taxAmount ?? "")),
        };
      }
    } catch {
      // fall through to other parsing strategies
    }
  }

  const ldRaw = extractLdJson(html);
  if (ldRaw) {
    try {
      const parsed = JSON.parse(ldRaw);
      const graph = Array.isArray(parsed?.["@graph"]) ? parsed["@graph"] : [parsed];
      const product = graph.find((node: { ["@type"]?: string }) => node?.["@type"] === "Product");
      const residence = graph.find((node: { ["@type"]?: string }) =>
        ["House", "SingleFamilyResidence"].includes(node?.["@type"] ?? "")
      );
      const offer = product?.offers;
      return {
        address: residence?.address?.streetAddress || product?.name || "",
        city: residence?.address?.addressLocality || "",
        bedrooms: parseNumber(residence?.numberOfBedrooms),
        bathrooms: parseNumber(residence?.numberOfBathroomsTotal),
        sqft: parseNumber(residence?.floorSize?.value),
        price: parseNumber(String(offer?.price ?? "")),
        hoa: 0,
        propertyTaxAnnual: 0,
      };
    } catch {
      // ignore and fall through
    }
  }

  const priceMatch = html.match(/data-cy=["']property-price["'][^>]*>\s*\$?([0-9,]+)/i);
  const bedMatch = html.match(/data-cy=["']property-beds["'][^>]*>\s*<span[^>]*>([0-9,]+)/i);
  const bathMatch = html.match(/data-cy=["']property-baths["'][^>]*>\s*<span[^>]*>([0-9,]+)/i);
  const sqftMatch = html.match(/data-cy=["']property-sqft["'][^>]*>\s*<span[^>]*>([0-9,]+)/i);
  const addressMatch = html.match(/data-cy=["']property-address["'][^>]*>\s*<span[^>]*>([^<]+)/i);
  const taxMatch = html.match(/Property Tax<\/h4><span>:\s*<\/span><span>\$([0-9,]+)/i);

  const address = addressMatch ? addressMatch[1].trim() : "";
  const cityMatch = address.match(/,\s*([^,]+),\s*BC/i);
  const city = cityMatch ? cityMatch[1].trim() : "";

  return {
    address,
    city,
    bedrooms: parseNumber(bedMatch ? bedMatch[1] : null),
    bathrooms: parseNumber(bathMatch ? bathMatch[1] : null),
    sqft: parseNumber(sqftMatch ? sqftMatch[1] : null),
    price: parseNumber(priceMatch ? priceMatch[1] : null),
    hoa: 0,
    propertyTaxAnnual: parseNumber(taxMatch ? taxMatch[1] : null),
  };
};

export async function POST(req: Request) {
  const body = (await req.json()) as { url?: string; html?: string };
  const url = body.url?.trim();
  const html = body.html?.trim();

  if (!url && !html) {
    return NextResponse.json({ error: "Missing url or html" }, { status: 400 });
  }

  if (html) {
    const parsed = parseRemaxHtml(html);
    return NextResponse.json({
      data: {
        address: parsed.address,
        city: parsed.city || "Vancouver",
        bedrooms: parsed.bedrooms || 0,
        bathrooms: parsed.bathrooms || 0,
        sqft: parsed.sqft || 0,
        price: parsed.price || 0,
        hoa: parsed.hoa || 0,
        rentRange: {
          low: 0,
          median: 0,
          high: 0,
          source: "provider-estimate",
        },
        confidence: {
          address: parsed.address ? "medium" : "low",
          bedrooms: parsed.bedrooms ? "medium" : "low",
          bathrooms: parsed.bathrooms ? "medium" : "low",
          sqft: parsed.sqft ? "medium" : "low",
          price: parsed.price ? "high" : "low",
          hoa: "low",
          rentRange: "low",
        },
        propertyTaxAnnual: parsed.propertyTaxAnnual || 0,
      },
    });
  }

  if (url) {
    return NextResponse.json(
      { error: "Provider connection not configured for URL fetch." },
      { status: 400 }
    );
  }

  return NextResponse.json({ error: "Unsupported request." }, { status: 400 });
}
