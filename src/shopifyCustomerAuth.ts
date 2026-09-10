import { useCallback, useEffect, useState } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const TOKEN_KEY = 'blumaple.shopify.customerAccessToken';
const GOOGLE_TOKEN_KEY = 'blumaple.google.accessToken';
const CUSTOMER_AUTH_SCHEME = 'shop.88771821938.blumaple';

export type ShopifyCustomer = {
  id: string;
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  emailAddress?: { emailAddress: string } | null;
  phoneNumber?: { phoneNumber: string } | null;
  defaultAddress?: ShopifyCustomerAddress | null;
  addresses?: { nodes: ShopifyCustomerAddress[] } | null;
  orders?: { nodes: ShopifyCustomerOrder[] } | null;
  authProvider?: 'shopify' | 'google' | 'demo';
};

export type ShopifyCustomerAddress = { id: string; firstName?: string | null; lastName?: string | null; company?: string | null; address1?: string | null; address2?: string | null; city?: string | null; zoneCode?: string | null; provinceCode?: string | null; territoryCode?: string | null; zip?: string | null; phoneNumber?: string | null };
export type ShopifyCustomerOrder = { id: string; name: string; processedAt: string; financialStatus?: string | null; fulfillmentStatus: string; statusUrl?: string | null; totalPrice: { amount: string; currencyCode: string }; shippingAddress?: { formatted: string[]; phone?: string | null } | null; lineItems: { nodes: Array<{ title: string; quantity: number; variant?: { id: string; sku?: string | null; image?: { url: string } | null; price: { amount: string; currencyCode: string }; product: { id: string; title: string; handle: string; vendor: string; productType: string; featuredImage?: { url: string } | null } } | null }> } };

type Discovery = AuthSession.DiscoveryDocument & { customerApiEndpoint: string };

const CUSTOMER_QUERY = `#graphql
  query CustomerProfile {
    customer {
      id
      displayName
      firstName
      lastName
      emailAddress { emailAddress }
      phoneNumber { phoneNumber }
      defaultAddress { id firstName lastName company address1 address2 city zoneCode territoryCode zip phoneNumber }
      addresses(first: 20) { nodes { id firstName lastName company address1 address2 city zoneCode territoryCode zip phoneNumber } }
    }
  }
`;

const LEGACY_CUSTOMER_QUERY = `#graphql
  query LegacyCustomer($token: String!) {
    customer(customerAccessToken: $token) {
      id displayName firstName lastName email phone
      defaultAddress { id firstName lastName company address1 address2 city provinceCode countryCodeV2 zip phone }
      addresses(first: 20) { edges { node { id firstName lastName company address1 address2 city provinceCode countryCodeV2 zip phone } } }
      orders(first: 50, reverse: true, sortKey: PROCESSED_AT) {
        edges { node {
          id name processedAt financialStatus fulfillmentStatus statusUrl
          totalPrice { amount currencyCode }
          shippingAddress { formatted phone }
          lineItems(first: 50) { edges { node { title quantity variant { id sku image { url } price { amount currencyCode } product { id title handle vendor productType featuredImage { url } } } } } }
        } }
      }
    }
  }
`;

const LEGACY_LOGIN_MUTATION = `#graphql
  mutation CustomerLogin($input: CustomerAccessTokenCreateInput!) {
    customerAccessTokenCreate(input: $input) {
      customerAccessToken { accessToken expiresAt }
      customerUserErrors { field message }
    }
  }
`;

export function useShopifyCustomerAuth() {
  const domain = process.env.EXPO_PUBLIC_SHOPIFY_STORE_DOMAIN?.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
  const clientId = process.env.EXPO_PUBLIC_SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID?.trim();
  const customerAccountUrl = process.env.EXPO_PUBLIC_SHOPIFY_CUSTOMER_ACCOUNT_URL?.trim().replace(/\/$/, '');
  const customerApiVersion = process.env.EXPO_PUBLIC_SHOPIFY_CUSTOMER_ACCOUNT_API_VERSION?.trim() || '2026-01';
  const redirectUri = AuthSession.makeRedirectUri({ scheme: CUSTOMER_AUTH_SCHEME, path: 'auth/callback' });
  const [discovery, setDiscovery] = useState<Discovery | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [customer, setCustomer] = useState<ShopifyCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const googleAndroidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim();
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();

  const [request, response, promptAsync] = AuthSession.useAuthRequest({
    clientId: clientId ?? '',
    scopes: ['openid', 'email', 'customer-account-api:full'],
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
  }, discovery);
  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    androidClientId: googleAndroidClientId,
    iosClientId: googleIosClientId,
    webClientId: googleWebClientId,
    scopes: ['openid', 'profile', 'email'],
  });

  const loadGoogleCustomer = useCallback(async (token: string) => {
    const result = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${token}` } });
    const profile = await result.json() as { sub?: string; name?: string; given_name?: string; family_name?: string; email?: string; error_description?: string };
    if (!result.ok || !profile.sub || !profile.email) throw new Error(profile.error_description || 'Google did not return a valid account.');
    setAccessToken(token);
    setCustomer({ id: `google:${profile.sub}`, displayName: profile.name || profile.email, firstName: profile.given_name || null, lastName: profile.family_name || null, emailAddress: { emailAddress: profile.email }, authProvider: 'google' });
  }, []);

  const loadCustomer = useCallback(async (token: string, config: Discovery) => {
    const result = await fetch(config.customerApiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query: CUSTOMER_QUERY }),
    });
    const payload = await result.json() as { data?: { customer?: ShopifyCustomer }; errors?: Array<{ message: string }> };
    if (!result.ok || payload.errors?.length) throw new Error(payload.errors?.map(item => item.message).join('\n') || `Customer request failed (${result.status}).`);
    if (!payload.data?.customer) throw new Error('Unable to load your Blumaple customer profile.');
    setCustomer(payload.data.customer);
  }, []);

  const storefrontRequest = useCallback(async (query: string, variables: Record<string, unknown>) => {
    const storefrontToken = process.env.EXPO_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN?.trim();
    if (!domain || !storefrontToken) throw new Error('Blumaple customer login is not configured.');
    const result = await fetch(`https://${domain}/api/2026-01/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': storefrontToken }, body: JSON.stringify({ query, variables }) });
    const payload = await result.json() as { data?: any; errors?: Array<{ message: string }> };
    if (!result.ok || payload.errors?.length) throw new Error(payload.errors?.map(item => item.message).join('\n') || `Customer request failed (${result.status}).`);
    return payload.data;
  }, [domain]);

  const loadLegacyCustomer = useCallback(async (token: string) => {
    const data = await storefrontRequest(LEGACY_CUSTOMER_QUERY, { token });
    const legacy = data?.customer;
    if (!legacy) throw new Error('Your login has expired. Please sign in again.');
    const mapAddress = (address: any): ShopifyCustomerAddress => ({ id: address.id, firstName: address.firstName, lastName: address.lastName, company: address.company, address1: address.address1, address2: address.address2, city: address.city, zoneCode: address.provinceCode, provinceCode: address.provinceCode, territoryCode: address.countryCodeV2, zip: address.zip, phoneNumber: address.phone });
    const orders: ShopifyCustomerOrder[] = (legacy.orders?.edges || []).map((edge: any) => ({ ...edge.node, lineItems: { nodes: (edge.node.lineItems?.edges || []).map((lineEdge: any) => lineEdge.node) } }));
    const mapped: ShopifyCustomer = { id: legacy.id, displayName: legacy.displayName || `${legacy.firstName || ''} ${legacy.lastName || ''}`.trim() || legacy.email, firstName: legacy.firstName, lastName: legacy.lastName, emailAddress: legacy.email ? { emailAddress: legacy.email } : null, phoneNumber: legacy.phone ? { phoneNumber: legacy.phone } : null, defaultAddress: legacy.defaultAddress ? mapAddress(legacy.defaultAddress) : null, addresses: { nodes: (legacy.addresses?.edges || []).map((edge: any) => mapAddress(edge.node)) }, orders: { nodes: orders }, authProvider: 'shopify' };
    setAccessToken(token);
    setCustomer(mapped);
  }, [storefrontRequest]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!clientId || !customerAccountUrl) throw new Error('Blumaple customer login is not configured.');
        const shopId = customerAccountUrl.match(/shopify\.com\/(\d+)\/account/i)?.[1];
        if (!shopId) throw new Error('Blumaple customer account URL is invalid.');
        const config: Discovery = {
          authorizationEndpoint: `https://shopify.com/authentication/${shopId}/oauth/authorize`,
          tokenEndpoint: `https://shopify.com/authentication/${shopId}/oauth/token`,
          revocationEndpoint: `https://shopify.com/authentication/${shopId}/oauth/revoke`,
          endSessionEndpoint: `https://shopify.com/authentication/${shopId}/logout`,
          customerApiEndpoint: `https://shopify.com/${shopId}/account/customer/api/${customerApiVersion}/graphql`,
        };
        if (!active) return;
        setDiscovery(config);
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        if (storedToken) {
          await loadLegacyCustomer(storedToken);
        } else {
          const storedGoogleToken = await SecureStore.getItemAsync(GOOGLE_TOKEN_KEY);
          if (storedGoogleToken) await loadGoogleCustomer(storedGoogleToken);
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to restore customer login.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [clientId, customerAccountUrl, customerApiVersion, loadCustomer, loadGoogleCustomer, loadLegacyCustomer]);

  useEffect(() => {
    if (googleResponse?.type !== 'success') return;
    const token = googleResponse.authentication?.accessToken;
    if (!token) { setError('Google did not return an access token.'); return; }
    setLoading(true);
    setError(null);
    SecureStore.setItemAsync(GOOGLE_TOKEN_KEY, token).then(() => loadGoogleCustomer(token)).catch(reason => setError(reason instanceof Error ? reason.message : 'Google sign-in failed.')).finally(() => setLoading(false));
  }, [googleResponse, loadGoogleCustomer]);

  useEffect(() => {
    if (response?.type !== 'success' || !response.params.code || !request?.codeVerifier || !discovery || !clientId) return;
    setLoading(true);
    setError(null);
    AuthSession.exchangeCodeAsync({
      clientId,
      code: response.params.code,
      redirectUri,
      extraParams: { code_verifier: request.codeVerifier },
    }, discovery)
      .then(async tokenResponse => {
        await SecureStore.setItemAsync(TOKEN_KEY, tokenResponse.accessToken);
        setAccessToken(tokenResponse.accessToken);
        await loadCustomer(tokenResponse.accessToken, discovery);
      })
      .catch(reason => setError(reason instanceof Error ? reason.message : 'Blumaple login failed.'))
      .finally(() => setLoading(false));
  }, [clientId, discovery, loadCustomer, redirectUri, request?.codeVerifier, response]);

  const login = useCallback(async (identifier?: string, password?: string) => {
    setError(null);
    if (!identifier?.trim() || !password) {
      setError('Enter your email address and password.');
      return;
    }
    setLoading(true);
    try {
      const data = await storefrontRequest(LEGACY_LOGIN_MUTATION, { input: { email: identifier.trim().toLowerCase(), password } });
      const loginResult = data?.customerAccessTokenCreate;
      const loginError = loginResult?.customerUserErrors?.[0]?.message;
      const token = loginResult?.customerAccessToken?.accessToken;
      if (!token) throw new Error(loginError || 'Incorrect email address or password.');
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await loadLegacyCustomer(token);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to sign in.');
    } finally { setLoading(false); }
  }, [loadLegacyCustomer, storefrontRequest]);

  const loginWithGoogle = useCallback(async () => {
    setError(null);
    const configured = [googleAndroidClientId, googleIosClientId, googleWebClientId].some(value => value && !value.startsWith('YOUR_'));
    if (!configured || !googleRequest) { setError('Google sign-in is not configured. Add the Google OAuth client IDs in .env and rebuild the app.'); return; }
    await promptGoogleAsync();
  }, [googleAndroidClientId, googleIosClientId, googleRequest, googleWebClientId, promptGoogleAsync]);

  const refreshCustomer = useCallback(async () => {
    if (!accessToken || customer?.authProvider !== 'shopify') return;
    try { await loadLegacyCustomer(accessToken); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to refresh your account.'); }
  }, [accessToken, customer?.authProvider, loadLegacyCustomer]);

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(GOOGLE_TOKEN_KEY);
    setAccessToken(null);
    setCustomer(null);
  }, []);

  return { customer, accessToken, isLoggedIn: Boolean(accessToken && customer), loading, error, login, loginWithGoogle, refreshCustomer, logout, redirectUri };
}
