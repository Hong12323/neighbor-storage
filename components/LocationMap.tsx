import React from "react";
import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

type Props = {
  lat: number;
  lng: number;
  extraMarkers?: { lat: number; lng: number; title?: string; color?: string }[];
  height?: number;
  address?: string;
  interactive?: boolean;
};

export function LocationMap({ lat, lng, height = 200, address }: Props) {
  const openMaps = () => {
    Linking.openURL(
      `https://map.naver.com/v5/?c=${lng},${lat},15,0,0,0,dh&pinType=place&pinTitle=${encodeURIComponent(address || "거래 장소")}&lng=${lng}&lat=${lat}`,
    );
  };
  return (
    <Pressable style={[styles.webFallback, { height }]} onPress={openMaps}>
      <View style={styles.webPin}>
        <Ionicons name="location" size={32} color={Colors.error} />
      </View>
      <Text style={styles.webAddress} numberOfLines={2}>
        {address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
      </Text>
      <Text style={styles.webMapHint}>지도에서 보기 →</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  webFallback: {
    backgroundColor: "#e8f0fe",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  webPin: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  webAddress: {
    fontSize: 13,
    fontFamily: "NotoSansKR_500Medium",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  webMapHint: {
    fontSize: 12,
    color: Colors.primary,
    fontFamily: "NotoSansKR_700Bold",
    textDecorationLine: "underline",
  },
});
