import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '@/constants/colors';

interface EmptyStateProps {
  icon: string;
  iconFamily?: 'ionicons' | 'material-community';
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, iconFamily = 'ionicons', title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  const IconComponent = iconFamily === 'material-community' ? MaterialCommunityIcons : Ionicons;
  return (
    <View style={styles.container}>
      <IconComponent name={icon as any} size={56} color={Colors.textLight} />
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <Pressable style={styles.actionBtn} onPress={onAction}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 8 },
  title: { fontFamily: 'NotoSansKR_500Medium', fontSize: 16, color: Colors.textSecondary, marginTop: 4 },
  subtitle: { fontFamily: 'NotoSansKR_400Regular', fontSize: 14, color: Colors.textLight, textAlign: 'center', paddingHorizontal: 40 },
  actionBtn: { marginTop: 12, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.primary },
  actionText: { fontFamily: 'NotoSansKR_500Medium', fontSize: 14, color: Colors.white },
});
