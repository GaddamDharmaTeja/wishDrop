export type WishStyle = 'emotional' | 'funny' | 'sweet' | 'respectful' | 'casual';

const STYLES: WishStyle[] = ['emotional', 'funny', 'sweet', 'respectful', 'casual'];

const TEMPLATES: Record<WishStyle, (name: string, occasion: string) => string[]> = {
  emotional: (name, occasion) => [
    `Dear ${name}, on your ${occasion} I just want you to know how deeply you are loved. Your kindness lights up every room you enter, and I'm so grateful you're in my life.`,
    `${name}, celebrating your ${occasion} fills my heart. Thank you for every laugh, every late-night talk, and every quiet moment of support. You mean more than words can say.`,
    `Happy ${occasion}, ${name}. Watching you grow into who you are has been one of my greatest joys. Here's to more memories, more courage, and more love ahead.`,
  ],
  funny: (name, occasion) => [
    `Happy ${occasion}, ${name}! Another trip around the sun and somehow you're still cooler than the rest of us. Please share your secrets (and cake).`,
    `${name}, may your ${occasion} be filled with zero awkward group photos, maximum snacks, and at least one story we'll retell for years.`,
    `Dear ${name}: wishing you a ${occasion} so good that even Monday won't dare ruin the vibe. You're officially aging like a fine meme.`,
  ],
  sweet: (name, occasion) => [
    `Happy ${occasion}, sweet ${name}! You make ordinary days feel special. Hope this year wraps you in softness, joy, and all your favorite little things.`,
    `${name}, sending the warmest ${occasion} wishes. You deserve gentle mornings, big smiles, and people who love you as fiercely as you love them.`,
    `To ${name} on your ${occasion}: thank you for being such a soft place to land. May today feel as lovely as you make everyone else feel.`,
  ],
  respectful: (name, occasion) => [
    `Dear ${name}, warmest wishes on your ${occasion}. Your integrity and thoughtfulness inspire those around you. May the year ahead bring fulfillment and good health.`,
    `${name}, congratulations on your ${occasion}. It is a privilege to know someone of your character. Wishing you continued success and happiness.`,
    `On your ${occasion}, ${name}, please accept my sincere congratulations. May this milestone open doors to new opportunities and lasting peace.`,
  ],
  casual: (name, occasion) => [
    `Hey ${name}! Happy ${occasion} — hope it's chill, fun, and full of your people. Catch you soon!`,
    `${name}, happy ${occasion}! Keep doing your thing. Glad we get to celebrate you today.`,
    `Yo ${name}, it's ${occasion} time! Hope the day treats you right. You deserve the good stuff.`,
  ],
};

export function parseWishStyle(value: unknown): WishStyle {
  if (typeof value === 'string' && (STYLES as string[]).includes(value)) return value as WishStyle;
  return 'sweet';
}

export function suggestWish(style: WishStyle, recipientName: string, occasion: string, seed = Date.now()) {
  const name = recipientName.trim() || 'friend';
  const occ = occasion.trim() || 'celebration';
  const options = TEMPLATES[style](name, occ.toLowerCase());
  return options[Math.abs(seed) % options.length] ?? options[0];
}

export const WISH_STYLES = STYLES;
