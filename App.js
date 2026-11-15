import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.baslik}>Merhaba Dünya!</Text>
      <Text style={styles.altBaslik}>İlk Expo uygulamam çalışıyor.</Text>
      <Text style={styles.bilgi}>DOT311 · Mobil Uygulama Geliştirme I</Text>
      <Text style={styles.bilgi}>Hazırlayan: K1REA</Text>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e2e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  baslik: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f9e2af',
    marginBottom: 8,
  },
  altBaslik: {
    fontSize: 18,
    color: '#cdd6f4',
    marginBottom: 24,
  },
  bilgi: {
    fontSize: 14,
    color: '#a6adc8',
  },
});