import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Mapa</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'map', selected: 'map.fill' }} md="map" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="requests">
        <NativeTabs.Trigger.Label>Zgłoszenia</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="list.bullet" md="list" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="new">
        <NativeTabs.Trigger.Label>Dodaj</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'plus.circle', selected: 'plus.circle.fill' }}
          md="add_circle"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
