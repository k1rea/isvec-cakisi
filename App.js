import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, Image, ScrollView } from 'react-native';

// İstatistik kutusu: değer ve ad bilgisini props ile alır
function StatKutusu({ deger, ad }) {
  return (
    <View style={styles.kutu}>
      <Text style={styles.deger}>{deger}</Text>
      <Text style={styles.kutuAd}>{ad}</Text>
    </View>
  );
}

export default function App() {
  return (
    <ScrollView
      style={styles.arkaPlan}
      contentContainerStyle={styles.ekran}
    >
      {/* Üst kısım: görsel ve isim */}
      <Image
        source={require('./assets/karakter.png')}
        style={styles.avatar}
      />
      <Text style={styles.isim}>Kahraman Kaan</Text>
      <Text style={styles.sinif}>Seviye 7 · Savaşçı</Text>

      {/* Ortadaki dört kutu: yan yana */}
      <View style={styles.satir}>
        <StatKutusu deger={120} ad="Can" />
        <StatKutusu deger={45} ad="Güç" />
        <StatKutusu deger={30} ad="Hız" />
        <StatKutusu deger={60} ad="Zeka" />
      </View>

      {/* Alt kısım: açıklama */}
      <Text style={styles.aciklama}>
        Kaan, kuzey dağlarından gelen cesur bir savaşçıdır.
      </Text>

      <StatusBar style="light" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  arkaPlan: {
    flex: 1,
    backgroundColor: '#1e1e2e',
  },
  ekran: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 80,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#f9e2af',
  },
  isim: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#cdd6f4',
  },
  sinif: {
    fontSize: 16,
    color: '#a6adc8',
    marginBottom: 24,
  },
  satir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  kutu: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#313244',
    paddingVertical: 16,
    marginHorizontal: 4,
    borderRadius: 10,
  },
  deger: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f9e2af',
  },
  kutuAd: {
    fontSize: 13,
    color: '#a6adc8',
    marginTop: 2,
  },
  aciklama: {
    marginTop: 24,
    fontSize: 16,
    color: '#cdd6f4',
    textAlign: 'center',
  },
});