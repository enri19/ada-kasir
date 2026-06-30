import { Stack } from 'expo-router';

export default function KategoriLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="tambah" />
      <Stack.Screen name="edit/[id]" />
    </Stack>
  );
}
