import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
  FlatList,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import * as Location from "expo-location";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/Toast";
import { apiRequest, queryClient, getApiUrl } from "@/lib/query-client";
import { LocationMap } from "@/components/LocationMap";
import { formatPrice } from "@/lib/mock-data";

const DEFAULT_LAT = 37.3448;
const DEFAULT_LNG = 126.9694;

export default function RiderScreen() {
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeRentalId, setActiveRentalId] = useState<number | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const broadcastIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const webTop = Platform.OS === "web" ? 67 : 0;

  const { data: deliveries, isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/rider/deliveries"],
    queryFn: async () => {
      const res = await fetch(new URL("/api/rider/deliveries", getApiUrl()).toString(), {
        credentials: "include",
      });
      return res.json();
    },
    refetchInterval: isOnDuty ? 8000 : false,
  });

  const acceptMutation = useMutation({
    mutationFn: async (rentalId: number) => {
      const res = await apiRequest("PATCH", `/api/rider/deliveries/${rentalId}/accept`, {});
      return res.json();
    },
    onSuccess: (_, rentalId) => {
      setActiveRentalId(rentalId);
      queryClient.invalidateQueries({ queryKey: ["/api/rider/deliveries"] });
      showToast("배달을 수락했습니다!", "success");
    },
    onError: (e: any) => showToast(e.message || "수락 실패", "error"),
  });

  const broadcastLocation = useCallback(
    async (lat: number, lng: number, rentalId?: number) => {
      try {
        await apiRequest("POST", "/api/rider/location", {
          lat,
          lng,
          rentalId: rentalId || null,
          isActive: true,
        });
      } catch {}
    },
    [],
  );

  const stopBroadcast = useCallback(async () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    if (broadcastIntervalRef.current) {
      clearInterval(broadcastIntervalRef.current);
      broadcastIntervalRef.current = null;
    }
    if (currentLocation) {
      try {
        await apiRequest("POST", "/api/rider/location", {
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          isActive: false,
        });
      } catch {}
    }
  }, [currentLocation]);

  const startDuty = async () => {
    if (Platform.OS === "web") {
      const mockLat = DEFAULT_LAT + (Math.random() - 0.5) * 0.01;
      const mockLng = DEFAULT_LNG + (Math.random() - 0.5) * 0.01;
      setCurrentLocation({ lat: mockLat, lng: mockLng });
      broadcastIntervalRef.current = setInterval(() => {
        const lat = mockLat + (Math.random() - 0.5) * 0.002;
        const lng = mockLng + (Math.random() - 0.5) * 0.002;
        setCurrentLocation({ lat, lng });
        broadcastLocation(lat, lng, activeRentalId || undefined);
      }, 5000);
      setIsOnDuty(true);
      showToast("운행을 시작했습니다 (웹 시뮬레이션)", "success");
      return;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("위치 권한 필요", "라이더 앱 사용을 위해 위치 권한이 필요합니다.");
      return;
    }

    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 10,
      },
      (loc) => {
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;
        setCurrentLocation({ lat, lng });
        broadcastLocation(lat, lng, activeRentalId || undefined);
      },
    );
    setIsOnDuty(true);
    showToast("운행을 시작했습니다!", "success");
  };

  const stopDuty = async () => {
    await stopBroadcast();
    setIsOnDuty(false);
    setActiveRentalId(null);
    showToast("운행을 종료했습니다", "info");
  };

  useEffect(() => {
    return () => {
      stopBroadcast();
    };
  }, []);

  if (!user?.isRider) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top + webTop }]}>
        <MaterialCommunityIcons name="moped" size={64} color={Colors.border} />
        <Text style={styles.notRiderTitle}>라이더 모드가 비활성화되어 있어요</Text>
        <Text style={styles.notRiderDesc}>설정에서 라이더 모드를 활성화하면 배달 수익을 얻을 수 있습니다.</Text>
        <Pressable
          onPress={() => router.push("/(tabs)/settings" as any)}
          style={styles.enableBtn}
        >
          <Text style={styles.enableBtnText}>설정으로 이동</Text>
        </Pressable>
      </View>
    );
  }

  const available = deliveries?.filter((d: any) => d.status === "paid" && !d.riderUserId) ?? [];
  const myActive = deliveries?.filter((d: any) => d.riderUserId === user.id) ?? [];

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTop }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>라이더 대시보드</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* Duty Toggle */}
        <View style={styles.dutyCard}>
          <View style={styles.dutyLeft}>
            <View style={[styles.dutyDot, isOnDuty ? styles.dutyDotOn : styles.dutyDotOff]} />
            <View>
              <Text style={styles.dutyTitle}>
                {isOnDuty ? "운행 중" : "운행 대기"}
              </Text>
              <Text style={styles.dutyDesc}>
                {isOnDuty
                  ? currentLocation
                    ? `위치 전송 중`
                    : "위치 확인 중..."
                  : "운행을 시작하면 배달 요청을 받을 수 있습니다"}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={isOnDuty ? stopDuty : startDuty}
            style={[styles.dutyToggle, isOnDuty ? styles.dutyToggleOn : styles.dutyToggleOff]}
          >
            <Text style={styles.dutyToggleText}>
              {isOnDuty ? "운행 종료" : "운행 시작"}
            </Text>
          </Pressable>
        </View>

        {/* Current Location Map */}
        {isOnDuty && currentLocation && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>내 현재 위치</Text>
            <LocationMap
              lat={currentLocation.lat}
              lng={currentLocation.lng}
              height={200}
              address="현재 위치"
              interactive
            />
          </View>
        )}

        {/* My Active Deliveries */}
        {myActive.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>진행 중인 배달</Text>
            {myActive.map((d: any) => (
              <DeliveryCard
                key={d.id}
                delivery={d}
                isActive
                onPress={() => {
                  setActiveRentalId(d.id);
                  showToast(`배달 #${d.id} 선택됨`, "info");
                }}
              />
            ))}
          </View>
        )}

        {/* Available Deliveries */}
        <View style={styles.section}>
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>배달 요청</Text>
            {isLoading && <ActivityIndicator size="small" color={Colors.primary} />}
          </View>

          {available.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="bicycle-outline" size={40} color={Colors.border} />
              <Text style={styles.emptyText}>현재 배달 요청이 없습니다</Text>
            </View>
          ) : (
            available.map((d: any) => (
              <DeliveryCard
                key={d.id}
                delivery={d}
                onAccept={() => acceptMutation.mutate(d.id)}
                accepting={acceptMutation.isPending}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function DeliveryCard({
  delivery,
  isActive,
  onAccept,
  accepting,
  onPress,
}: {
  delivery: any;
  isActive?: boolean;
  onAccept?: () => void;
  accepting?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable style={[styles.deliveryCard, isActive && styles.deliveryCardActive]} onPress={onPress}>
      <View style={styles.deliveryRow}>
        <View style={[styles.deliveryBadge, isActive && styles.deliveryBadgeActive]}>
          <Text style={styles.deliveryBadgeText}>{isActive ? "진행 중" : "대기"}</Text>
        </View>
        <Text style={styles.deliveryId}>배달 #{delivery.id}</Text>
      </View>
      <Text style={styles.deliveryTitle} numberOfLines={1}>
        {delivery.item?.title || "물건"}
      </Text>
      <View style={styles.deliveryMeta}>
        <Ionicons name="cash-outline" size={14} color={Colors.textLight} />
        <Text style={styles.deliveryMetaText}>
          배달비 {formatPrice(delivery.deliveryFee)}
        </Text>
        {delivery.item?.locationAddress && (
          <>
            <Ionicons name="location-outline" size={14} color={Colors.textLight} style={{ marginLeft: 8 }} />
            <Text style={styles.deliveryMetaText} numberOfLines={1}>
              {delivery.item.locationAddress}
            </Text>
          </>
        )}
      </View>
      {delivery.item?.locationLat && delivery.item?.locationLng && (
        <View style={styles.miniMap}>
          <LocationMap
            lat={delivery.item.locationLat}
            lng={delivery.item.locationLng}
            address={delivery.item.locationAddress || ""}
            height={140}
          />
        </View>
      )}
      {!isActive && onAccept && (
        <Pressable
          onPress={onAccept}
          disabled={accepting}
          style={styles.acceptBtn}
        >
          {accepting ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.acceptBtnText}>수락하기</Text>
          )}
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { alignItems: "center", justifyContent: "center" },
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
  headerTitle: { flex: 1, fontSize: 18, fontFamily: "NotoSansKR_700Bold", color: Colors.text, textAlign: "center" },
  dutyCard: {
    margin: 16,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  dutyLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  dutyDot: { width: 12, height: 12, borderRadius: 6 },
  dutyDotOn: { backgroundColor: Colors.success },
  dutyDotOff: { backgroundColor: Colors.border },
  dutyTitle: { fontSize: 16, fontFamily: "NotoSansKR_700Bold", color: Colors.textPrimary },
  dutyDesc: { fontSize: 12, color: Colors.textLight, marginTop: 2, maxWidth: 180 },
  dutyToggle: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  dutyToggleOn: { backgroundColor: Colors.error },
  dutyToggleOff: { backgroundColor: Colors.primary },
  dutyToggleText: { fontSize: 14, fontFamily: "NotoSansKR_700Bold", color: Colors.white },
  section: { marginHorizontal: 16, marginBottom: 20 },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontFamily: "NotoSansKR_700Bold", color: Colors.textPrimary, marginBottom: 10 },
  emptyBox: { alignItems: "center", paddingVertical: 32, backgroundColor: Colors.surface, borderRadius: 16 },
  emptyText: { fontSize: 14, color: Colors.textLight, marginTop: 8 },
  deliveryCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  deliveryCardActive: { borderWidth: 2, borderColor: Colors.primary },
  deliveryRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  deliveryBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  deliveryBadgeActive: { backgroundColor: Colors.primaryLight },
  deliveryBadgeText: { fontSize: 11, fontFamily: "NotoSansKR_700Bold", color: Colors.textSecondary },
  deliveryId: { fontSize: 13, color: Colors.textLight },
  deliveryTitle: { fontSize: 16, fontFamily: "NotoSansKR_700Bold", color: Colors.textPrimary, marginBottom: 6 },
  deliveryMeta: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap", marginBottom: 10 },
  deliveryMetaText: { fontSize: 12, color: Colors.textLight },
  miniMap: { borderRadius: 12, overflow: "hidden", marginBottom: 10 },
  acceptBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  acceptBtnText: { fontSize: 15, fontFamily: "NotoSansKR_700Bold", color: Colors.text },
  notRiderTitle: { fontSize: 18, fontFamily: "NotoSansKR_700Bold", color: Colors.textPrimary, marginTop: 16, textAlign: "center" },
  notRiderDesc: { fontSize: 14, color: Colors.textSecondary, textAlign: "center", marginTop: 8, maxWidth: 260 },
  enableBtn: {
    marginTop: 24,
    paddingHorizontal: 28,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 24,
  },
  enableBtnText: { fontSize: 15, fontFamily: "NotoSansKR_700Bold", color: Colors.text },
});
