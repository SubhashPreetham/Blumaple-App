import { ImageSourcePropType } from 'react-native';

export type ShopProduct = { id: string; name: string; price: string; oldPrice: string; discount: string; image: ImageSourcePropType; vendor?: string };
export type BillingAddress = {
  gstin?: string;
  businessName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  country: string;
  countryCode: string;
  pincode: string;
};

export type ShippingAddress = {
  firstName: string;
  lastName?: string;
  name: string;
  email?: string;
  phone: string;
  company?: string;
  address1: string;
  address2?: string;
  line: string;
  city: string;
  state: string;
  country: string;
  countryCode: string;
  pincode: string;
  gstin?: string;
  billingSameAsShipping: boolean;
  billingAddress?: BillingAddress;
};
