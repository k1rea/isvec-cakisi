import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

const oyuncular = [
  { isim: 'Ayşe', puan: 40 },
  { isim: 'Veli', puan: 15 },
  { isim: 'Zeynep', puan: 70 },
  { isim: 'Mehmet', puan: 55 },
];

export default function App() {
  const isimler = oyuncular.map((o) => o.isim);
  const yuksekPuanlilar = oyuncular.filter((o) => o.puan > 30);

  const satirlar = [];
  oyuncular.forEach(({ isim, puan }) => {
    satirlar.push(`${isim}: ${puan} puan`);
  });

  return (
    <View style={styles.container}>
      <Text style={styles.baslik}>Skor Tablosu</Text>

      <Text style={styles.bolum}>Tüm oyuncular (forEach)</Text>
      {satirlar.map((satir) => (
        <Text key={satir} style={styles.satir}>{satir}</Text>
      ))}

      <Text style={styles.bolum}>30 puan üstü (filter + map)</Text>
      {yuksekPuanlilar.map(({ isim, puan }) => (
        <Text key={isim} style={styles.satir}>{`${isim} — ${puan}`}</Text>
      ))}

      <Text style={styles.bolum}>İsimler (map)</Text>
      <Text style={styles.satir}>{isimler.join(', ')}</Text>

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e2e',
    padding: 32,
    justifyContent: 'center',
  },
  baslik: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#f9e2af',
    marginBottom: 16,
  },
  bolum: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#89b4fa',
    marginTop: 16,
    marginBottom: 6,
  },
  satir: {
    fontSize: 18,
    color: '#cdd6f4',
    marginBottom: 4,
  },
});