import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Image,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/Toast";

function SettingsRow({
  icon,
  label,
  value,
  accent,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  accent?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.settingsRow} onPress={onPress}>
      <View style={styles.settingsRowLeft}>
        {icon}
        <Text
          style={[
            styles.settingsLabel,
            accent && {
              color: Colors.primary,
              fontFamily: "NotoSansKR_500Medium",
            },
          ]}
        >
          {label}
        </Text>
      </View>
      <View style={styles.settingsRowRight}>
        {value && <Text style={styles.settingsValue}>{value}</Text>}
        <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      showToast("로그아웃 되었습니다", "info");
    } catch {
      showToast("로그아웃 실패", "error");
    }
  };

  const profileImage =
    user?.avatarUrl || `https://picsum.photos/seed/${user?.id || "default"}/100/100`;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          {
            paddingTop: (Platform.OS === "web" ? webTopInset : insets.top) + 8,
          },
        ]}
      >
        <Text style={styles.headerTitle}>설정</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View style={styles.profileCard}>
          <Image source={{ uri: profileImage }} style={styles.profileImage} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.nickname || "사용자"}
            </Text>
            <View style={styles.trustRow}>
              <View style={styles.trustBar}>
                <View
                  style={[
                    styles.trustFill,
                    {
                      width: `${Math.min(user?.trustScore || 36.5, 100)}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.trustText}>
                {user?.trustScore || 36.5}점
              </Text>
            </View>
            <Text style={styles.profileLocation}>
              {user?.location || "오전동"}
            </Text>
          </View>
          <Pressable style={styles.editBtn}>
            <Feather name="edit-2" size={16} color={Colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>계정</Text>
          <View style={styles.sectionCard}>
            <SettingsRow
              icon={
                <Feather name="user" size={18} color={Colors.textPrimary} />
              }
              label="프로필 수정"
            />
            <View style={styles.divider} />
            <SettingsRow
              icon={
                <Ionicons
                  name="location-outline"
                  size={18}
                  color={Colors.textPrimary}
                />
              }
              label="동네 설정"
              value={user?.location || "오전동"}
            />
            <View style={styles.divider} />
            <SettingsRow
              icon={
                <MaterialCommunityIcons
                  name="store-outline"
                  size={18}
                  color={Colors.primary}
                />
              }
              label="프로 파트너 신청"
              accent
            />
          </View>
        </View>

        {user?.isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>관리자</Text>
            <View style={styles.sectionCard}>
              <SettingsRow
                icon={
                  <MaterialCommunityIcons
                    name="shield-crown-outline"
                    size={18}
                    color={Colors.error}
                  />
                }
                label="관리자 대시보드"
                onPress={() => router.push("/admin")}
              />
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>알림</Text>
          <View style={styles.sectionCard}>
            <SettingsRow
              icon={
                <Ionicons
                  name="notifications-outline"
                  size={18}
                  color={Colors.textPrimary}
                />
              }
              label="푸시 알림"
              value="켜짐"
            />
            <View style={styles.divider} />
            <SettingsRow
              icon={
                <Ionicons
                  name="chatbubble-outline"
                  size={18}
                  color={Colors.textPrimary}
                />
              }
              label="채팅 알림"
              value="켜짐"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>이용 안내</Text>
          <View style={styles.sectionCard}>
            <SettingsRow
              icon={
                <Feather
                  name="help-circle"
                  size={18}
                  color={Colors.textPrimary}
                />
              }
              label="자주 묻는 질문"
            />
            <View style={styles.divider} />
            <SettingsRow
              icon={
                <Feather
                  name="file-text"
                  size={18}
                  color={Colors.textPrimary}
                />
              }
              label="이용약관"
            />
            <View style={styles.divider} />
            <SettingsRow
              icon={
                <Feather name="shield" size={18} color={Colors.textPrimary} />
              }
              label="개인정보 처리방침"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>정보</Text>
          <View style={styles.sectionCard}>
            <SettingsRow
              icon={
                <Feather name="mail" size={18} color={Colors.textPrimary} />
              }
              label="이메일"
              value={user?.email || ""}
            />
            <View style={styles.divider} />
            <SettingsRow
              icon={
                <Feather name="info" size={18} color={Colors.textPrimary} />
              }
              label="앱 버전"
              value="2.0.0"
            />
          </View>
        </View>

        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>

        <Text style={styles.footerText}>이웃창고 v2.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontFamily: "NotoSansKR_700Bold",
    fontSize: 22,
    color: Colors.textPrimary,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    margin: 16,
    padding: 16,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.surface,
  },
  profileInfo: { flex: 1, marginLeft: 14 },
  profileName: {
    fontFamily: "NotoSansKR_700Bold",
    fontSize: 18,
    color: Colors.textPrimary,
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  trustBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surfaceDark,
    maxWidth: 100,
  },
  trustFill: { height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  trustText: {
    fontFamily: "NotoSansKR_500Medium",
    fontSize: 12,
    color: Colors.primary,
  },
  profileLocation: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 3,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  section: { marginHorizontal: 16, marginBottom: 20 },
  sectionLabel: {
    fontFamily: "NotoSansKR_500Medium",
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 6,
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    overflow: "hidden",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  settingsRowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  settingsRowRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  settingsLabel: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 14,
    color: Colors.textPrimary,
  },
  settingsValue: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 13,
    color: Colors.textLight,
  },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: 42 },
  logoutBtn: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 14,
  },
  logoutText: {
    fontFamily: "NotoSansKR_500Medium",
    fontSize: 14,
    color: Colors.error,
  },
  footerText: {
    fontFamily: "NotoSansKR_400Regular",
    fontSize: 12,
    color: Colors.textLight,
    textAlign: "center",
    paddingVertical: 16,
  },
});
