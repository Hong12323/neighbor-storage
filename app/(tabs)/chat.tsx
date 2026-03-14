import React from 'react';
import { StyleSheet, Text, View, FlatList, Pressable, Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { formatRelativeTime } from '@/lib/mock-data';
import { ChatShimmer } from '@/components/ui/ShimmerPlaceholder';
import { EmptyState } from '@/components/ui/EmptyState';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const { data: rooms = [], isLoading: loading, isError } = useQuery<any[]>({
    queryKey: ['/api/chat/rooms'],
    refetchInterval: 5000,
  });

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: (Platform.OS === 'web' ? webTopInset : insets.top) + 8 }]}>
        <Text style={styles.headerTitle}>채팅</Text>
        {rooms.length > 0 && (
          <Text style={styles.headerCount}>{rooms.length}</Text>
        )}
      </View>

      {loading ? (
        <View>
          <ChatShimmer />
          <ChatShimmer />
          <ChatShimmer />
        </View>
      ) : isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title="채팅을 불러올 수 없어요"
          subtitle="잠시 후 다시 시도해 주세요"
        />
      ) : rooms.length === 0 ? (
        <EmptyState
          icon="chatbubbles-outline"
          title="아직 채팅이 없어요"
          subtitle="물건을 대여하면 채팅이 시작됩니다"
          actionLabel="물건 구경하기"
          onAction={() => router.push('/(tabs)')}
        />
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item: room }) => (
            <Pressable
              style={styles.chatRow}
              onPress={() => router.push({ pathname: '/chat-room', params: { roomId: room.id.toString() } })}
              testID={`chat-${room.id}`}
            >
              <View style={styles.avatarContainer}>
                <Image
                  source={{ uri: room.otherUser?.avatarUrl || `https://picsum.photos/seed/${room.id}/100/100` }}
                  style={styles.avatar}
                />
              </View>
              <View style={styles.chatInfo}>
                <View style={styles.chatHeader}>
                  <View style={styles.chatNameRow}>
                    <Text style={styles.chatName}>{room.otherUser?.nickname || '사용자'}</Text>
                  </View>
                  <Text style={styles.chatTime}>{room.lastMessageTime ? formatRelativeTime(room.lastMessageTime) : ''}</Text>
                </View>
                <Text style={styles.chatItemName} numberOfLines={1}>{room.item?.title || ''}</Text>
                <Text style={styles.chatMessage} numberOfLines={1}>{room.lastMessage || ''}</Text>
              </View>
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: Colors.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  headerTitle: { fontFamily: 'NotoSansKR_700Bold', fontSize: 22, color: Colors.textPrimary },
  headerCount: { fontFamily: 'NotoSansKR_400Regular', fontSize: 14, color: Colors.textLight },
  chatRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  avatarContainer: { position: 'relative' },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.surface },
  chatInfo: { flex: 1, marginLeft: 12 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chatName: { fontFamily: 'NotoSansKR_700Bold', fontSize: 15, color: Colors.textPrimary },
  chatTime: { fontFamily: 'NotoSansKR_400Regular', fontSize: 11, color: Colors.textLight },
  chatItemName: { fontFamily: 'NotoSansKR_400Regular', fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  chatMessage: { fontFamily: 'NotoSansKR_400Regular', fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  separator: { height: 1, backgroundColor: Colors.border, marginLeft: 80 },
});
