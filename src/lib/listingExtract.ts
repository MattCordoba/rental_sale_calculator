export type ConfidenceLevel = "high" | "medium" | "low";

export type ListingExtract = {
  address: string;
  city: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  price: number;
  hoa: number;
  propertyTaxAnnual?: number;
  rentRange: {
    low: number;
    median: number;
    high: number;
    source: "provider-estimate" | "web-estimate" | "manual";
  };
  confidence: {
    address: ConfidenceLevel;
    bedrooms: ConfidenceLevel;
    bathrooms: ConfidenceLevel;
    sqft: ConfidenceLevel;
    price: ConfidenceLevel;
    hoa: ConfidenceLevel;
    rentRange: ConfidenceLevel;
  };
};
