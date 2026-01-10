import { NextResponse } from "next/server";

const parseNumber = (value: string | null) => {
  if (!value) return 0;
  const normalized = value.replace(/[^0-9.]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseRemaxHtml = (html: string) => {
  const priceMatch = html.match(/\\$\\s*([0-9,]+)\\s*\\n?/i);
  const bedBathMatch = html.match(/(\\d+)\\s*bed\\s*(\\d+)\\s*bath/i);
  const sqftMatch = html.match(/([0-9,]+)\\s*sqft/i);
  const addressMatch = html.match(/([0-9]+\\s+[A-Z0-9\\s]+,\\s*[A-Z\\s]+,\\s*BC\\s*[A-Z0-9\\s]+)/i);
  const taxMatch = html.match(/Property Tax\\s*:?\\s*\\$\\s*([0-9,]+)/i);

  const address = addressMatch ? addressMatch[1].trim() : "";
  const cityMatch = address.match(/,\\s*([A-Z\\s]+),\\s*BC/i);
  const city = cityMatch ? cityMatch[1].trim().toLowerCase() : "";
  const cityTitle = city ? city.charAt(0).toUpperCase() + city.slice(1) : "";

  return {
    address,
    city: cityTitle,
    bedrooms: bedBathMatch ? Number.parseInt(bedBathMatch[1], 10) : 0,
    bathrooms: bedBathMatch ? Number.parseInt(bedBathMatch[2], 10) : 0,
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
