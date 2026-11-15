import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

// Oyuncu kartı: isim, puan ve seviye bilgisini props ile alır
function OyuncuKarti({ isim, puan, seviye }) {
  return (
    <View style={styles.kart}>
      <View style={styles.kartUst}>
        <Text style={styles.isim}>{isim}</Text>
        <Text style={styles.seviye}>Seviye {seviye}</Text>
      </View>
      <Text style={styles.detay}>Puan: {puan}</Text>
    </View>
  );
}

// Eşya kartı: eşyanın adını, türünü ve değerini props ile alır
function EsyaKarti({ ad, tur, deger }) {
  return (
    <View style={[styles.kart, styles.esyaKart]}>
      <View style={styles.kartUst}>
        <Text style={styles.isim}>{ad}</Text>
        <Text style={styles.deger}>{deger} altın</Text>
      </View>
      <Text style={styles.detay}>Tür: {tur}</Text>
    </View>
  );
}

export default function App() {
  return (
    <View style={styles.ekran}>
      <Text style={styles.baslik}>Skor Tablosu</Text>
      <OyuncuKarti isim="Ayşe" puan={40} seviye={3} />
      <OyuncuKarti isim="Veli" puan={15} seviye={1} />
      <OyuncuKarti isim="Zeynep" puan={70} seviye={5} />

      <Text style={styles.baslik}>Envanter</Text>
      <EsyaKarti ad="Kılıç" tur="Silah" deger={150} />
      <EsyaKarti ad="Kalkan" tur="Zırh" deger={90} />
      <EsyaKarti ad="Asa" tur="Büyü" deger={300} />
      <EsyaKarti ad="İksir" tur="Tüketim" deger={20} />

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: {
    flex: 1,
    backgroundColor: '#1e1e2e',
    padding: 24,
    paddingTop: 60,
  },
  baslik: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f9e2af',
    marginTop: 8,
    marginBottom: 12,
  },
  kart: {
    backgroundColor: '#313244',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#89b4fa',
  },
  esyaKart: {
    borderLeftColor: '#a6e3a1',
  },
  kartUst: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  isim: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#cdd6f4',
  },
  seviye: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#89b4fa',
  },
  deger: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f9e2af',
  },
  detay: {
    fontSize: 14,
    color: '#a6adc8',
    marginTop: 4,
  },
});