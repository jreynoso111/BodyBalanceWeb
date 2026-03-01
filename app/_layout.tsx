import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useAuth } from '@/hooks/useAuth';
import { registerForPushNotificationsAsync } from '@/services/notificationService';
import * as Notifications from 'expo-notifications';
import { useColorScheme } from '@/components/useColorScheme';
import { GreetingRotator } from '@/components/GreetingRotator';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

import { AnimatedBackground } from '@/components/AnimatedBackground';

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  useAuth(); // Handle redirects based on auth state

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <GreetingRotator />
      <AnimatedBackground>
        <Stack
          screenOptions={{
            headerTransparent: true,
            headerTintColor: colorScheme === 'dark' ? '#F1F5F9' : '#0F172A',
            headerTitleStyle: {
              fontWeight: '800',
              fontSize: 18,
            },
            headerTitleAlign: 'center',
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/forgot-password" options={{ title: 'Recover Password' }} />
          <Stack.Screen name="(auth)/reset-password" options={{ title: 'Reset Password' }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="loan/[id]" options={{ title: 'Loan Details' }} />
          <Stack.Screen name="new-loan" options={{ title: 'New Loan' }} />
          <Stack.Screen name="new-contact" options={{ title: 'New Contact' }} />
          <Stack.Screen name="profile" options={{ title: 'Profile' }} />
          <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
          <Stack.Screen name="security" options={{ title: 'Security' }} />
          <Stack.Screen name="help-support" options={{ title: 'Help & Support' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </AnimatedBackground>
    </ThemeProvider>
  );
}
