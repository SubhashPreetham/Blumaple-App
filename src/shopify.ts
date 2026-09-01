export type ShopifyProduct = {
  id: string;
  handle: string;
  title: string;
  vendor: string;
  brandName: { value: string } | null;
  tags: string[];
  collections: { nodes: Array<{ handle: string; title: string }> };
  description: string;
  images: { nodes: Array<{ url: string; altText: string | null }> };
  variants: {
    nodes: Array<{
      id: string;
      title: string;
      availableForSale: boolean;
      sku: string | null;
      price: { amount: string; currencyCode: string };
      compareAtPrice: { amount: string; currencyCode: string } | null;
    }>;
  };
};

export type ShopifyMenuItem = {
  id: string;
  title: string;
  type: string;
  url: string;
  resource: { id: string; handle: string; title: string } | null;
  items: ShopifyMenuItem[];
};

export type ShopifyCollectionPreview = {
  id: string;
  handle: string;
  title: string;
  products: { nodes: ShopifyProduct[] };
};

type ProductsResponse = {
  data?: { products: { nodes: ShopifyProduct[] } };
  errors?: Array<{ message: string }>;
};

type MenuResponse = {
  data?: { menu: { items: ShopifyMenuItem[] } | null };
  errors?: Array<{ message: string }>;
};

type CollectionPreviewsResponse = {
  data?: { nodes: Array<ShopifyCollectionPreview | null> };
  errors?: Array<{ message: string }>;
};

type CollectionProductsResponse = {
  data?: { node: ({ id: string; title: string; products: { nodes: ShopifyProduct[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } }) | null };
  errors?: Array<{ message: string }>;
};

type CollectionProductCountResponse = {
  data?: { node: ({ products: { nodes: Array<{ id: string }>; pageInfo: { hasNextPage: boolean; endCursor: string | null } } }) | null };
  errors?: Array<{ message: string }>;
};

export type ShopifyProductPage = {
  products: ShopifyProduct[];
  hasNextPage: boolean;
  endCursor: string | null;
};

const PRODUCTS_QUERY = `#graphql
  query MobileProducts($first: Int!) {
    products(first: $first) {
      nodes {
        id
        handle
        title vendor tags
        brandName: metafield(namespace: "custom", key: "brand_name") { value }
        collections(first: 20) { nodes { handle title } }
        description
        images(first: 4) { nodes { url altText } }
        variants(first: 1) {
          nodes { id title availableForSale sku price { amount currencyCode } compareAtPrice { amount currencyCode } }
        }
      }
    }
  }
`;

const MENU_ITEM_FIELDS = `
  id title type url
  resource { ... on Collection { id handle title } }
`;

const MAIN_MENU_QUERY = `#graphql
  query MobileMainMenu {
    menu(handle: "main-menu") {
      items {
        ${MENU_ITEM_FIELDS}
        items {
          ${MENU_ITEM_FIELDS}
          items { ${MENU_ITEM_FIELDS} }
        }
      }
    }
  }
`;

const COLLECTION_PREVIEWS_QUERY = `#graphql
  query MobileCollectionPreviews($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Collection {
        id handle title
        products(first: 1) {
          nodes {
            id handle title vendor tags description
            brandName: metafield(namespace: "custom", key: "brand_name") { value }
            collections(first: 20) { nodes { handle title } }
            images(first: 4) { nodes { url(transform: { maxWidth: 480, maxHeight: 480 }) altText } }
            variants(first: 1) {
              nodes { id title availableForSale sku price { amount currencyCode } compareAtPrice { amount currencyCode } }
            }
          }
        }
      }
    }
  }
`;

const COLLECTION_PRODUCTS_QUERY = `#graphql
  query MobileCollectionProducts($id: ID!, $first: Int!, $after: String) {
    node(id: $id) {
      ... on Collection {
        id title
        products(first: $first, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id handle title vendor tags description
            brandName: metafield(namespace: "custom", key: "brand_name") { value }
            collections(first: 20) { nodes { handle title } }
            images(first: 4) { nodes { url(transform: { maxWidth: 720, maxHeight: 720 }) altText } }
            variants(first: 1) {
              nodes { id title availableForSale sku price { amount currencyCode } compareAtPrice { amount currencyCode } }
            }
          }
        }
      }
    }
  }
`;

const COLLECTION_PRODUCT_COUNT_QUERY = `#graphql
  query MobileCollectionProductCount($id: ID!, $after: String) {
    node(id: $id) {
      ... on Collection {
        products(first: 250, after: $after) {
          nodes { id }
          pageInfo { hasNextPage endCursor }
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

export async function fetchShopifyMainMenu(): Promise<ShopifyMenuItem[]> {
  const rawDomain = process.env.EXPO_PUBLIC_SHOPIFY_STORE_DOMAIN;
  const token = process.env.EXPO_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;

  if (!rawDomain || !token) throw new Error('Shopify environment variables are missing.');

  const response = await fetch(`https://${normalizeDomain(rawDomain)}/api/2026-07/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': token.trim(),
    },
    body: JSON.stringify({ query: MAIN_MENU_QUERY }),
  });

  const payload = (await response.json()) as MenuResponse;
  if (!response.ok) throw new Error(`Shopify menu request failed (${response.status}).`);
  if (payload.errors?.length) throw new Error(payload.errors.map(error => error.message).join('\n'));
  return payload.data?.menu?.items ?? [];
}

export async function fetchShopifyCollectionPreviews(ids: string[]): Promise<ShopifyCollectionPreview[]> {
  const rawDomain = process.env.EXPO_PUBLIC_SHOPIFY_STORE_DOMAIN;
  const token = process.env.EXPO_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;
  if (!rawDomain || !token || !ids.length) return [];

  const response = await fetch(`https://${normalizeDomain(rawDomain)}/api/2026-07/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': token.trim(),
    },
    body: JSON.stringify({ query: COLLECTION_PREVIEWS_QUERY, variables: { ids } }),
  });

  const payload = (await response.json()) as CollectionPreviewsResponse;
  if (!response.ok) throw new Error(`Shopify collection preview request failed (${response.status}).`);
  if (payload.errors?.length) throw new Error(payload.errors.map(error => error.message).join('\n'));
  return (payload.data?.nodes ?? []).filter((node): node is ShopifyCollectionPreview => Boolean(node));
}

export async function fetchShopifyCollectionProducts(id: string, first = 30, after: string | null = null): Promise<ShopifyProductPage> {
  const rawDomain = process.env.EXPO_PUBLIC_SHOPIFY_STORE_DOMAIN;
  const token = process.env.EXPO_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;
  if (!rawDomain || !token) throw new Error('Shopify environment variables are missing.');

  const response = await fetch(`https://${normalizeDomain(rawDomain)}/api/2026-07/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': token.trim(),
    },
    body: JSON.stringify({ query: COLLECTION_PRODUCTS_QUERY, variables: { id, first, after } }),
  });
  const payload = (await response.json()) as CollectionProductsResponse;
  if (!response.ok) throw new Error(`Shopify collection products request failed (${response.status}).`);
  if (payload.errors?.length) throw new Error(payload.errors.map(error => error.message).join('\n'));
  const connection = payload.data?.node?.products;
  return {
    products: connection?.nodes ?? [],
    hasNextPage: connection?.pageInfo.hasNextPage ?? false,
    endCursor: connection?.pageInfo.endCursor ?? null,
  };
}

export async function fetchShopifyCollectionProductCount(id: string): Promise<number> {
  const rawDomain = process.env.EXPO_PUBLIC_SHOPIFY_STORE_DOMAIN;
  const token = process.env.EXPO_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;
  if (!rawDomain || !token) throw new Error('Shopify environment variables are missing.');

  let total = 0;
  let after: string | null = null;
  let hasNextPage = true;
  while (hasNextPage) {
    const response = await fetch(`https://${normalizeDomain(rawDomain)}/api/2026-07/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': token.trim(),
      },
      body: JSON.stringify({ query: COLLECTION_PRODUCT_COUNT_QUERY, variables: { id, after } }),
    });
    const payload = (await response.json()) as CollectionProductCountResponse;
    if (!response.ok) throw new Error(`Shopify collection count request failed (${response.status}).`);
    if (payload.errors?.length) throw new Error(payload.errors.map(error => error.message).join('\n'));
    const connection = payload.data?.node?.products;
    if (!connection) break;
    total += connection.nodes.length;
    hasNextPage = connection.pageInfo.hasNextPage;
    after = connection.pageInfo.endCursor;
    if (hasNextPage && !after) break;
  }
  return total;
}
