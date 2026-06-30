import { Stack } from 'expo-router';

export default function ProdukLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="tambah" />
      <Stack.Screen name="edit/[id]" />
      <Stack.Screen name="detail/[id]" />
    </Stack>
  );
}
