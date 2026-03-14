import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ToastProvider } from "@/components/Toast";
import Colors from "@/constants/colors";
import {
  useFonts,
  NotoSansKR_400Regular,
  NotoSansKR_500Medium,
  NotoSansKR_700Bold,
} from "@expo-google-fonts/noto-sans-kr";

SplashScreen.preventAutoHideAsync();

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={gateStyles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerBackTitle: "뒤로", headerBackButtonDisplayMode: "minimal" }}>
      {!user ? (
        <Stack.Screen name="login" options={{ headerShown: false, title: "로그인" }} />
      ) : (
        <>
          <Stack.Screen name="(tabs)" options={{ headerShown: false, title: "이웃창고" }} />
          <Stack.Screen name="item/[id]" options={{ headerShown: false, title: "물건 상세" }} />
          <Stack.Screen name="checkout" options={{ headerShown: false, title: "결제" }} />
          <Stack.Screen name="chat-room" options={{ headerShown: false, title: "채팅" }} />
          <Stack.Screen name="admin" options={{ headerShown: false, title: "관리자" }} />
          <Stack.Screen name="community/[id]" options={{ headerShown: false, title: "동네생활" }} />
          <Stack.Screen name="rider" options={{ headerShown: false, title: "라이더 대시보드" }} />
          <Stack.Screen name="delivery-tracking" options={{ headerShown: false, title: "배달 추적" }} />
          <Stack.Screen
            name="upload-modal"
            options={{
              presentation: "formSheet",
              sheetAllowedDetents: [0.9],
              sheetGrabberVisible: true,
              headerShown: false,
              title: "물건 등록",
            }}
          />
        </>
      )}
    </Stack>
  );
}

const gateStyles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    NotoSansKR_400Regular,
    NotoSansKR_500Medium,
    NotoSansKR_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView>
          <KeyboardProvider>
            <AuthProvider>
              <ToastProvider>
                <AuthGate />
              </ToastProvider>
            </AuthProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
