import { ImageSourcePropType } from 'react-native';

export type ShopProduct = { id: string; name: string; price: string; oldPrice: string; discount: string; image: ImageSourcePropType; vendor?: string };
export type ShippingAddress = { name: string; phone: string; line: string; city: string; pincode: string; gstin?: string; email?: string };
