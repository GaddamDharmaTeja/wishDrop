import { Linking, Platform, Share } from 'react-native';

export function contributeInviteText(url: string) {
  return url;
}

export function revealInviteText(url: string) {
  return url;
}

export async function openWhatsAppText(text: string) {
  const encoded = encodeURIComponent(text);
  const webHref = `https://api.whatsapp.com/send?text=${encoded}`;
  if (Platform.OS === 'web') {
    await Linking.openURL(webHref);
    return;
  }
  const nativeHref = `whatsapp://send?text=${encoded}`;
  if (await Linking.canOpenURL(nativeHref)) {
    await Linking.openURL(nativeHref);
    return;
  }
  await Linking.openURL(webHref);
}

export async function sharePlainText(text: string) {
  if (Platform.OS === 'web') {
    const nav = typeof navigator === 'undefined' ? undefined : navigator;
    if (nav?.share) {
      try {
        // Pass only `text` (never `url`/`title`). WhatsApp otherwise replaces the
        // visible link with a label such as "Contribute now".
        await nav.share({ text });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
      }
    }
    if (nav?.clipboard?.writeText) {
      await nav.clipboard.writeText(text);
      return;
    }
  }
  await Share.share({ message: text });
}
