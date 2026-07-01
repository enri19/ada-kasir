import { ImageSourcePropType } from 'react-native';

/**
 * Local product category images for offline usage.
 * Store the PNG assets in assets/images/products/ with 512x512 resolution.
 */
export const productImages = {
  mie: require('../../assets/images/products/mie.jpg'),
  minuman: require('../../assets/images/products/minuman.jpg'),
  rokok: require('../../assets/images/products/rokok.jpg'),
  sembako: require('../../assets/images/products/sembako.jpg'),
  snack: require('../../assets/images/products/snack.jpg'),
  kopi: require('../../assets/images/products/kopi.jpg'),
  sabun: require('../../assets/images/products/sabun.jpg'),
  obat: require('../../assets/images/products/obat.jpg'),
  pulsa: require('../../assets/images/products/pulsa.jpg'),
  default: require('../../assets/images/products/default.jpg'),
} as const;

export type ProductImageKey = keyof typeof productImages;

export function getProductImage(imageKey?: string): ImageSourcePropType {
  if (!imageKey) return productImages.default;

  return productImages[imageKey as ProductImageKey] ?? productImages.default;
}
