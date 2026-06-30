import { Redirect } from 'expo-router';
import { useAppStore } from '../src/stores/app.store';

export default function Index() {
  const isOnboardingComplete = useAppStore((state) => state.isOnboardingComplete);

  if (!isOnboardingComplete) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
