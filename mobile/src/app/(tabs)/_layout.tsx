import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import type { IconName } from '@/components/ui';
import { colors } from '@/theme';

const icon = (name: IconName) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color as string} size={size} />;
  };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#8a8a8a',
        headerStyle: { backgroundColor: colors.primaryDark },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', headerShown: false, tabBarIcon: icon('home-outline') }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity', tabBarIcon: icon('add-circle-outline') }} />
      <Tabs.Screen name="meetings" options={{ title: 'Meetings', tabBarIcon: icon('calendar-outline') }} />
      <Tabs.Screen name="socials" options={{ title: 'Socials', headerTitle: 'Socials · Birthdays', tabBarIcon: icon('gift-outline') }} />
      <Tabs.Screen name="nearby" options={{ title: 'Nearby', headerTitle: 'Find Members Nearby', tabBarIcon: icon('location-outline') }} />
      <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: icon('menu-outline') }} />
    </Tabs>
  );
}
