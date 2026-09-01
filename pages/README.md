# Pages

- Home, Collection, and Product Detail are currently defined in `App.tsx` because they share the Shopify catalog state.
- `CheckoutPage.tsx` and `AddressPage.tsx` are standalone pages in this folder.
- The App shell links the purchase flow: Home → Collection → Product → Checkout → Add Address.
