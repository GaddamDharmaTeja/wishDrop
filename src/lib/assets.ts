import { ImageSourcePropType } from 'react-native';

/** Optional brand assets — drop files into assets/brand per README. */
const optional: Record<string, ImageSourcePropType | undefined> = {
  // Uncomment after adding files:
  // logo: require('../../assets/brand/logo.png'),
  // welcomeHero: require('../../assets/brand/welcome-hero.png'),
  // homeHero: require('../../assets/brand/home-hero.png'),
};

export function brandAsset(key: keyof typeof optional): ImageSourcePropType | undefined {
  return optional[key];
}

export function hasBrandAsset(key: keyof typeof optional): boolean {
  return Boolean(optional[key]);
}
