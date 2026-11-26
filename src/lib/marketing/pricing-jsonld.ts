import {
  PERIOD_MONTHS,
  PLAN_IDS,
  PLAN_MONTHLY_AZN,
  PLAN_SETUP_FEE_AZN,
  planTermTotalAzn,
  type PlanId,
} from "./pricing";

/**
 * schema.org Offers for the self-serve plans. The headline `price` is always the
 * month-to-month price; prepaid terms are listed as separate price specs with
 * their full billing duration so crawlers and AI agents never read a discounted
 * per-month figure as the monthly price.
 */
export function planOffers(siteUrl: string, locale: "az" | "en", names: Record<PlanId, string>) {
  return PLAN_IDS.map((plan) => {
    const prepaid = (["halfYear", "annual"] as const).map((period) => ({
      "@type": "UnitPriceSpecification",
      name:
        locale === "en"
          ? `${PERIOD_MONTHS[period]}-month prepaid term`
          : `${PERIOD_MONTHS[period]} aylıq əvvəlcədən ödəniş`,
      price: String(planTermTotalAzn(plan, period)),
      priceCurrency: "AZN",
      billingDuration: `P${PERIOD_MONTHS[period]}M`,
      referenceQuantity: { "@type": "QuantitativeValue", value: PERIOD_MONTHS[period], unitCode: "MON" },
    }));
    const setup = PLAN_SETUP_FEE_AZN[plan]
      ? [
          {
            "@type": "UnitPriceSpecification",
            name: locale === "en" ? "One-time setup fee" : "Birdəfəlik quraşdırma haqqı",
            price: String(PLAN_SETUP_FEE_AZN[plan]),
            priceCurrency: "AZN",
          },
        ]
      : [];
    return {
      "@type": "Offer",
      name: names[plan],
      price: String(PLAN_MONTHLY_AZN[plan].monthly),
      priceCurrency: "AZN",
      url: `${siteUrl}/${locale}/pricing`,
      priceSpecification: [
        {
          "@type": "UnitPriceSpecification",
          name: locale === "en" ? "Monthly" : "Aylıq",
          price: String(PLAN_MONTHLY_AZN[plan].monthly),
          priceCurrency: "AZN",
          unitCode: "MON",
          unitText: "MONTH",
          billingDuration: "P1M",
        },
        ...prepaid,
        ...setup,
      ],
    };
  });
}

export function pricingJsonLd(siteUrl: string, locale: "az" | "en", brand: string, names: Record<PlanId, string>) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: brand,
    url: `${siteUrl}/${locale}/pricing`,
    offers: planOffers(siteUrl, locale, names),
  };
}
