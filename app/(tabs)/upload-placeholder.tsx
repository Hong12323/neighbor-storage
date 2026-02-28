import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Colors from '@/constants/colors';

export default function UploadPlaceholder() {
  useEffect(() => {
    router.push('/upload-modal');
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>물건 등록</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  text: { fontFamily: 'NotoSansKR_500Medium', fontSize: 16, color: Colors.textSecondary },
});
