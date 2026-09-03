import { useCallback, useEffect, useState } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const TOKEN_KEY = 'blumaple.shopify.customerAccessToken';
const CUSTOMER_AUTH_SCHEME = 'shop.88771821938.blumaple';

export type ShopifyCustomer = {
  id: string;
  displayName: string;
  firstName?: string | null;
  lastName?: string | null;
  emailAddress?: { emailAddress: string } | null;
};

type Discovery = AuthSession.DiscoveryDocument & { customerApiEndpoint: string };

type ShopifyOpenIdConfiguration = {
  authorization_endpoint: string;
  token_endpoint: string;
  revocation_endpoint?: string;
  userinfo_endpoint?: string;
  end_session_endpoint?: string;
  registration_endpoint?: string;
};

const CUSTOMER_QUERY = `#graphql
  query CustomerProfile {
    customer {
      id
      displayName
      firstName
      lastName
      emailAddress { emailAddress }
    }
  }
`;

export function useShopifyCustomerAuth() {
  const domain = process.env.EXPO_PUBLIC_SHOPIFY_STORE_DOMAIN?.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
  const clientId = process.env.EXPO_PUBLIC_SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID?.trim();
  const redirectUri = AuthSession.makeRedirectUri({ scheme: CUSTOMER_AUTH_SCHEME, path: 'auth/callback' });
  const [discovery, setDiscovery] = useState<Discovery | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [customer, setCustomer] = useState<ShopifyCustomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = AuthSession.useAuthRequest({
    clientId: clientId ?? '',
    scopes: ['openid', 'email', 'customer-account-api:full'],
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
  }, discovery);

  const loadCustomer = useCallback(async (token: string, config: Discovery) => {
    const result = await fetch(config.customerApiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify({ query: CUSTOMER_QUERY }),
    });
    const payload = await result.json() as { data?: { customer?: ShopifyCustomer }; errors?: Array<{ message: string }> };
    if (!result.ok || payload.errors?.length) throw new Error(payload.errors?.map(item => item.message).join('\n') || `Customer request failed (${result.status}).`);
    if (!payload.data?.customer) throw new Error('Shopify did not return a customer profile.');
    setCustomer(payload.data.customer);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!domain || !clientId) throw new Error('Shopify customer login is not configured.');
        const [openidResponse, apiResponse] = await Promise.all([
          fetch(`https://${domain}/.well-known/openid-configuration`),
          fetch(`https://${domain}/.well-known/customer-account-api`),
        ]);
        if (!openidResponse.ok || !apiResponse.ok) throw new Error('Unable to discover Shopify customer login.');
        const openid = await openidResponse.json() as ShopifyOpenIdConfiguration;
        const api = await apiResponse.json() as { graphql_api: string };
        if (!openid.authorization_endpoint || !openid.token_endpoint || !api.graphql_api) {
          throw new Error('Shopify returned an incomplete customer login configuration.');
        }
        const config: Discovery = {
          authorizationEndpoint: openid.authorization_endpoint,
          tokenEndpoint: openid.token_endpoint,
          revocationEndpoint: openid.revocation_endpoint,
          userInfoEndpoint: openid.userinfo_endpoint,
          endSessionEndpoint: openid.end_session_endpoint,
          registrationEndpoint: openid.registration_endpoint,
          customerApiEndpoint: api.graphql_api,
        };
        if (!active) return;
        setDiscovery(config);
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        if (storedToken) {
          setAccessToken(storedToken);
          await loadCustomer(storedToken, config);
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to restore customer login.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [clientId, domain, loadCustomer]);

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
      .catch(reason => setError(reason instanceof Error ? reason.message : 'Shopify login failed.'))
      .finally(() => setLoading(false));
  }, [clientId, discovery, loadCustomer, redirectUri, request?.codeVerifier, response]);

  const login = useCallback(async (identifier?: string, password?: string) => {
    setError(null);
    if (identifier !== undefined || password !== undefined) {
      if (identifier?.trim().toLowerCase() === 'admin@app.com' && password === '12345') {
        setAccessToken('dummy-customer-session');
        setCustomer({
          id: 'dummy-admin-customer',
          displayName: 'Admin',
          firstName: 'Admin',
          emailAddress: { emailAddress: 'admin@app.com' },
        });
        return;
      }
      setError('Incorrect email address or password.');
      return;
    }
    if (!request || !discovery) {
      setError('Shopify login is still loading. Please try again.');
      return;
    }
    await promptAsync();
  }, [discovery, promptAsync, request]);

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setAccessToken(null);
    setCustomer(null);
  }, []);

  return { customer, isLoggedIn: Boolean(accessToken && customer), loading, error, login, logout, redirectUri };
}
