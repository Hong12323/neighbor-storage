import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { NativeTabs, Icon, Label, Badge } from "expo-router/unstable-native-tabs";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import Colors from "@/constants/colors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>홈</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="chat">
        <Icon sf={{ default: "bubble.left.and.bubble.right", selected: "bubble.left.and.bubble.right.fill" }} />
        <Label>채팅</Label>
        
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="upload-placeholder">
        <Icon sf={{ default: "plus.circle.fill", selected: "plus.circle.fill" }} />
        <Label>등록</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="my-storage">
        <Icon sf={{ default: "archivebox", selected: "archivebox.fill" }} />
        <Label>내 창고</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
        <Label>설정</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const isIOS = Platform.OS === "ios";
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        headerShown: false,
        tabBarStyle: {
          position: "absolute" as const,
          backgroundColor: isIOS ? "transparent" : Colors.white,
          borderTopWidth: 0,
          borderTopColor: Colors.border,
          elevation: 8,
          height: isWeb ? 84 : 64 + insets.bottom,
          paddingBottom: isWeb ? 0 : insets.bottom,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint="light" style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border }]} />
          ) : null,
        tabBarLabelStyle: {
          fontFamily: 'NotoSansKR_500Medium',
          fontSize: 10,
          marginTop: -2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "홈",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "채팅",
          tabBarBadge: undefined,
          tabBarBadgeStyle: { backgroundColor: Colors.accent, fontSize: 10, fontFamily: 'NotoSansKR_700Bold' },
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="upload-placeholder"
        options={{
          title: "",
          tabBarIcon: () => (
            <View style={tabStyles.fabContainer}>
              <View style={tabStyles.fabButton}>
                <Ionicons name="add" size={30} color={Colors.secondary} />
              </View>
            </View>
          ),
          tabBarLabel: () => null,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push("/upload-modal");
          },
        }}
      />
      <Tabs.Screen
        name="my-storage"
        options={{
          title: "내 창고",
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons name={focused ? "archive" : "archive-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "설정",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "settings" : "settings-outline"} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const tabStyles = StyleSheet.create({
  fabContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
  },
  fabButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 4,
    borderColor: Colors.white,
  },
});

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
