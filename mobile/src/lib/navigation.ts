import { router, type Href } from 'expo-router';

/** Back if there's somewhere to go back to (a form opened from a deep link may have no history), else `fallback`. */
export function goBack(fallback: Href = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
