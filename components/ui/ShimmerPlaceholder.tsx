import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import Colors from '@/constants/colors';

interface ShimmerProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Shimmer({ width, height, borderRadius = 8, style }: ShimmerProps) {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(animValue, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const opacity = animValue.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: Colors.surfaceDark, opacity },
        style,
      ]}
    />
  );
}

export function ItemCardShimmer() {
  return (
    <View style={shimmerStyles.itemCard}>
      <Shimmer width={120} height={120} borderRadius={0} />
      <View style={shimmerStyles.itemInfo}>
        <Shimmer width="80%" height={14} />
        <Shimmer width="40%" height={12} style={{ marginTop: 8 }} />
        <Shimmer width="50%" height={16} style={{ marginTop: 8 }} />
        <Shimmer width="30%" height={14} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

export function ProCardShimmer() {
  return (
    <View style={shimmerStyles.proCard}>
      <Shimmer width={160} height={110} borderRadius={0} />
      <View style={{ padding: 10, gap: 6 }}>
        <Shimmer width={120} height={12} />
        <Shimmer width={80} height={10} />
        <Shimmer width={60} height={14} />
      </View>
    </View>
  );
}

export function ChatShimmer() {
  return (
    <View style={shimmerStyles.chatRow}>
      <Shimmer width={52} height={52} borderRadius={26} />
      <View style={{ flex: 1, marginLeft: 12, gap: 6 }}>
        <Shimmer width="50%" height={14} />
        <Shimmer width="70%" height={12} />
        <Shimmer width="40%" height={12} />
      </View>
    </View>
  );
}

const shimmerStyles = StyleSheet.create({
  itemCard: {
    flexDirection: 'row', backgroundColor: Colors.white,
    borderRadius: 16, marginBottom: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border,
  },
  itemInfo: { flex: 1, padding: 12 },
  proCard: {
    width: 160, borderRadius: 16, backgroundColor: Colors.white,
    overflow: 'hidden', marginRight: 12,
  },
  chatRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
});
