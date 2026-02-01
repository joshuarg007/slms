import { useEffect } from "react";

const BASE_TITLE = "Site2CRM";
const BASE_URL = "https://site2crm.io";
const DEFAULT_IMAGE = "https://site2crm.io/og-image.png";

type SEOProps = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: "website" | "article" | "product";
  noIndex?: boolean;
  jsonLd?: Record<string, unknown>;
};

/**
 * Comprehensive SEO hook for dynamic meta tag management
 * Updates title, description, canonical, OG tags, and JSON-LD
 */
export function useSEO({
  title,
  description,
  path = "",
  image = DEFAULT_IMAGE,
  type = "website",
  noIndex = false,
  jsonLd,
}: SEOProps) {
  useEffect(() => {
    // Store previous values for cleanup
    const prevTitle = document.title;
    const canonicalUrl = `${BASE_URL}${path}`;

    // Set document title
    document.title = `${title} | ${BASE_TITLE}`;

    // Helper to set/create meta tag
    const setMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    // Helper to set/create link tag
    const setLink = (rel: string, href: string) => {
      let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
      if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", rel);
        document.head.appendChild(el);
      }
      el.setAttribute("href", href);
    };

    // Set meta description
    setMeta("description", description);

    // Set robots
    if (noIndex) {
      setMeta("robots", "noindex, nofollow");
    } else {
      setMeta("robots", "index, follow");
    }

    // Set canonical URL
    setLink("canonical", canonicalUrl);

    // Set Open Graph tags
    setMeta("og:title", title, true);
    setMeta("og:description", description, true);
    setMeta("og:url", canonicalUrl, true);
    setMeta("og:image", image, true);
    setMeta("og:type", type, true);
    setMeta("og:site_name", BASE_TITLE, true);

    // Set Twitter Card tags
    setMeta("twitter:title", title, true);
    setMeta("twitter:description", description, true);
    setMeta("twitter:image", image, true);
    setMeta("twitter:card", "summary_large_image", true);

    // Set JSON-LD structured data
    let jsonLdScript: HTMLScriptElement | null = null;
    if (jsonLd) {
      jsonLdScript = document.createElement("script");
      jsonLdScript.type = "application/ld+json";
      jsonLdScript.id = "seo-json-ld";
      jsonLdScript.textContent = JSON.stringify(jsonLd);

      // Remove existing JSON-LD if present
      const existing = document.getElementById("seo-json-ld");
      if (existing) existing.remove();

      document.head.appendChild(jsonLdScript);
    }

    // Cleanup on unmount
    return () => {
      document.title = prevTitle;
      if (jsonLdScript) {
        jsonLdScript.remove();
      }
    };
  }, [title, description, path, image, type, noIndex, jsonLd]);
}

// Pre-built JSON-LD schemas
export const schemas = {
  organization: {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Site2CRM",
    url: "https://site2crm.io",
    logo: "https://site2crm.io/logo.png",
    description: "AI chat widgets and lead capture forms with CRM integration. Persistent sales AI that handles objections and syncs leads instantly.",
    parentOrganization: {
      "@type": "Organization",
      name: "Axion Deep Labs",
      url: "https://axiondeep.com",
    },
    sameAs: [
      "https://twitter.com/site2crm",
      "https://linkedin.com/company/site2crm",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      email: "labs@axiondeep.com",
      contactType: "customer support",
    },
  },

  product: (options?: {
    pricing?: { starter: string; pro: string };
    rating?: { value: string; count: string };
  }) => {
    const schema: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Site2CRM",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: "AI Chat Widget Pro and lead capture forms with instant CRM integration. Goal-driven AI that handles objections.",
    };

    if (options?.pricing) {
      schema.offers = [
        {
          "@type": "Offer",
          name: "Starter",
          price: options.pricing.starter,
          priceCurrency: "USD",
          priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        },
        {
          "@type": "Offer",
          name: "Professional",
          price: options.pricing.pro,
          priceCurrency: "USD",
          priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        },
      ];
    }

    // Only include ratings if real data is provided
    if (options?.rating) {
      schema.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: options.rating.value,
        ratingCount: options.rating.count,
      };
    }

    return schema;
  },

  faqPage: (faqs: { question: string; answer: string }[]) => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }),

  breadcrumb: (items: { name: string; url: string }[]) => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }),
};

export default useSEO;
