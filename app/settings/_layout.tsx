import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="account" />
      <Stack.Screen name="premium" />
      <Stack.Screen name="cloud-backup" />
      <Stack.Screen name="printer" />
      <Stack.Screen name="qris" />
      <Stack.Screen name="device" />
      <Stack.Screen name="help" />
      <Stack.Screen name="about" />
    </Stack>
  );
}
