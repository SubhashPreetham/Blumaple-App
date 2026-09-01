export type ShopifyProduct = {
  id: string;
  handle: string;
  title: string;
  description: string;
  images: { nodes: Array<{ url: string; altText: string | null }> };
  variants: {
    nodes: Array<{
      id: string;
      title: string;
      price: { amount: string; currencyCode: string };
      compareAtPrice: { amount: string; currencyCode: string } | null;
    }>;
  };
};

type ProductsResponse = {
  data?: { products: { nodes: ShopifyProduct[] } };
  errors?: Array<{ message: string }>;
};

const PRODUCTS_QUERY = `#graphql
  query MobileProducts($first: Int!) {
    products(first: $first) {
      nodes {
        id
        handle
        title
        description
        images(first: 4) { nodes { url altText } }
        variants(first: 1) {
          nodes { id title price { amount currencyCode } compareAtPrice { amount currencyCode } }
        }
      }
    }
  }
`;

function normalizeDomain(value: string) {
  return value.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export async function fetchShopifyProducts(first = 10): Promise<ShopifyProduct[]> {
  const rawDomain = process.env.EXPO_PUBLIC_SHOPIFY_STORE_DOMAIN;
  const token = process.env.EXPO_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;

  if (!rawDomain || !token) {
    throw new Error('Shopify environment variables are missing. Save both EXPO_PUBLIC_SHOPIFY values in .env and restart Expo.');
  }

  const response = await fetch(`https://${normalizeDomain(rawDomain)}/api/2026-07/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': token.trim(),
    },
    body: JSON.stringify({ query: PRODUCTS_QUERY, variables: { first } }),
  });

  const payload = (await response.json()) as ProductsResponse;
  if (!response.ok) throw new Error(`Shopify request failed (${response.status}).`);
  if (payload.errors?.length) throw new Error(payload.errors.map(error => error.message).join('\n'));
  return payload.data?.products.nodes ?? [];
}
