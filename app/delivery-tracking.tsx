import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { LocationMap } from "@/components/LocationMap";
import { getApiUrl } from "@/lib/query-client";

const DEFAULT_LAT = 37.3448;
const DEFAULT_LNG = 126.9694;
const POLL_INTERVAL = 5000;

export default function DeliveryTracking() {
  const insets = useSafeAreaInsets();
  const { rentalId, itemTitle } = useLocalSearchParams<{ rentalId: string; itemTitle?: string }>();
  const webTop = Platform.OS === "web" ? 67 : 0;

  const [riderLocation, setRiderLocation] = useState<{
    lat: number;
    lng: number;
    rider?: { nickname: string; avatarUrl?: string };
    updatedAt?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLocation = async () => {
    if (!rentalId) return;
    try {
      const res = await fetch(
        new URL(`/api/rider/location/${rentalId}`, getApiUrl()).toString(),
        { credentials: "include" },
      );
      if (res.ok) {
        const data = await res.json();
        setRiderLocation({
          lat: parseFloat(data.lat),
          lng: parseFloat(data.lng),
          rider: data.rider,
          updatedAt: data.updatedAt,
        });
        setError(null);
      } else if (res.status === 404) {
        setError("라이더가 아직 배정되지 않았습니다");
        setRiderLocation(null);
      }
    } catch {
      setError("위치 정보를 가져올 수 없습니다");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocation();
    intervalRef.current = setInterval(fetchLocation, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [rentalId]);

  const getTimeSince = (updatedAt?: string) => {
    if (!updatedAt) return "";
    const diff = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 1000);
    if (diff < 60) return `${diff}초 전 업데이트`;
    return `${Math.floor(diff / 60)}분 전 업데이트`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTop }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>배달 추적</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Item Info */}
      {itemTitle && (
        <View style={styles.itemBanner}>
          <MaterialCommunityIcons name="package-variant" size={18} color={Colors.primary} />
          <Text style={styles.itemTitle} numberOfLines={1}>{itemTitle}</Text>
        </View>
      )}

      {/* Map */}
      <View style={styles.mapContainer}>
        <LocationMap
          lat={riderLocation?.lat ?? DEFAULT_LAT}
          lng={riderLocation?.lng ?? DEFAULT_LNG}
          address={riderLocation?.rider ? `${riderLocation.rider.nickname} 라이더` : "대기 중"}
          height={420}
          interactive
        />

        {/* Status Overlay */}
        <View style={styles.statusOverlay}>
          {loading ? (
            <View style={styles.statusCard}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.statusText}>위치 확인 중...</Text>
            </View>
          ) : error ? (
            <View style={[styles.statusCard, styles.statusError]}>
              <Ionicons name="time-outline" size={16} color={Colors.textLight} />
              <Text style={styles.statusText}>{error}</Text>
            </View>
          ) : riderLocation ? (
            <View style={styles.statusCard}>
              <View style={styles.riderDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.riderName}>
                  {riderLocation.rider?.nickname || "라이더"} 님이 배달 중
                </Text>
                {riderLocation.updatedAt && (
                  <Text style={styles.updateTime}>{getTimeSince(riderLocation.updatedAt)}</Text>
                )}
              </View>
              <Pressable onPress={fetchLocation} style={styles.refreshBtn}>
                <Ionicons name="refresh" size={16} color={Colors.primary} />
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>

      {/* Info Cards */}
      <View style={styles.infoSection}>
        <View style={styles.infoCard}>
          <Ionicons name="sync-circle-outline" size={22} color={Colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>실시간 위치 추적</Text>
            <Text style={styles.infoDesc}>라이더 위치가 5초마다 자동으로 업데이트됩니다</Text>
          </View>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark-outline" size={22} color={Colors.success} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>안전 보장</Text>
            <Text style={styles.infoDesc}>배달 완료 후 자동으로 반납 처리됩니다</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { padding: 8 },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: "NotoSansKR_700Bold",
    color: Colors.text,
    textAlign: "center",
  },
  itemBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  itemTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: "NotoSansKR_500Medium",
    color: Colors.textPrimary,
  },
  mapContainer: { position: "relative", marginHorizontal: 16, marginTop: 16, borderRadius: 20, overflow: "hidden" },
  statusOverlay: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
  },
  statusCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  statusError: { backgroundColor: Colors.surface },
  statusText: { fontSize: 13, color: Colors.textSecondary, fontFamily: "NotoSansKR_400Regular" },
  riderDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.success },
  riderName: { fontSize: 14, fontFamily: "NotoSansKR_700Bold", color: Colors.textPrimary },
  updateTime: { fontSize: 11, color: Colors.textLight, marginTop: 1, fontFamily: "NotoSansKR_400Regular" },
  refreshBtn: { padding: 4 },
  infoSection: {
    margin: 16,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  infoDivider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 14 },
  infoTitle: { fontSize: 14, fontFamily: "NotoSansKR_700Bold", color: Colors.textPrimary },
  infoDesc: { fontSize: 12, color: Colors.textLight, marginTop: 2, fontFamily: "NotoSansKR_400Regular" },
});
