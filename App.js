import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, Image, ScrollView } from 'react-native';

// İstatistik kartlarının verisi (Ek görev 4: diziye taşındı)
const istatistikler = [
  { id: 1, deger: '1.250', baslik: 'Puan', renk: '#89b4fa' },
  { id: 2, deger: '48', baslik: 'Galibiyet', renk: '#a6e3a1' },
  { id: 3, deger: '320', baslik: 'Altın', renk: '#f9e2af' },
  { id: 4, deger: '12', baslik: 'Rozet', renk: '#f38ba8' },
];

// Son etkinlikler (Ek görev 2: iki yeni etkinlik eklendi)
const etkinlikler = [
  { id: 1, metin: 'Boss savaşını kazandın', zaman: '2 saat önce' },
  { id: 2, metin: 'Yeni rozet: Hız Ustası', zaman: 'Dün' },
  { id: 3, metin: '3. seviyeyi bitirdin', zaman: '2 gün önce' },
  { id: 4, metin: 'Efsanevi kılıç buldun', zaman: '3 gün önce' },
  { id: 5, metin: 'Loncaya katıldın', zaman: '1 hafta önce' },
];

// Adım 2: İstatistik kartı bileşeni
function StatKarti({ deger, baslik, renk }) {
  return (
    <View style={[styles.kart, { borderLeftColor: renk }]}>
      <Text style={styles.kartDeger}>{deger}</Text>
      <Text style={styles.kartBaslik}>{baslik}</Text>
    </View>
  );
}

// Adım 3 (Ek görev 3): İlerleme çubuğu bileşeni
function IlerlemeCubugu({ seviye, yuzde }) {
  return (
    <View style={styles.bolum}>
      <View style={styles.seviyeSatir}>
        <Text style={styles.bolumBaslik}>Seviye {seviye}</Text>
        <Text style={styles.yuzde}>%{yuzde}</Text>
      </View>
      <View style={styles.cubukDis}>
        <View style={[styles.cubukIc, { width: `${yuzde}%` }]} />
      </View>
    </View>
  );
}

export default function App() {
  return (
    <ScrollView
      style={styles.ekran}
      contentContainerStyle={styles.icerik}
    >
      {/* 1. Üst bar */}
      <View style={styles.ustBar}>
        <Image
          source={require('./assets/karakter.png')}
          style={styles.avatar}
        />
        <View>
          <Text style={styles.selam}>Merhaba, Kaan!</Text>
          <Text style={styles.altYazi}>Bugün de oynayalım mı?</Text>
        </View>
      </View>

      {/* 2. İstatistik kartları (2x2) */}
      <View style={styles.kartlar}>
        {istatistikler.map((i) => (
          <StatKarti key={i.id} deger={i.deger} baslik={i.baslik} renk={i.renk} />
        ))}
      </View>

      {/* 3. İlerleme çubuğu */}
      <IlerlemeCubugu seviye={7} yuzde={65} />

      {/* 4. Son etkinlikler */}
      <View style={styles.bolum}>
        <Text style={styles.bolumBaslik}>Son Etkinlikler</Text>
        {etkinlikler.map((e) => (
          <View key={e.id} style={styles.etkinlik}>
            <Text style={styles.etkinlikMetin}>• {e.metin}</Text>
            <Text style={styles.zaman}>{e.zaman}</Text>
          </View>
        ))}
      </View>

      <StatusBar style="light" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  ekran: { flex: 1, backgroundColor: '#1e1e2e' },
  icerik: { padding: 20, paddingTop: 60, paddingBottom: 40 },

  ustBar: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#f9e2af',
  },
  selam: { fontSize: 22, fontWeight: 'bold', color: '#cdd6f4' },
  altYazi: { fontSize: 14, color: '#a6adc8' },

  kartlar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  kart: {
    width: '48%',
    backgroundColor: '#313244',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 5,
    marginBottom: 12,
  },
  kartDeger: { fontSize: 24, fontWeight: 'bold', color: '#cdd6f4' },
  kartBaslik: { fontSize: 14, color: '#a6adc8', marginTop: 4 },

  bolum: {
    backgroundColor: '#313244',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  seviyeSatir: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bolumBaslik: { fontSize: 16, fontWeight: 'bold', color: '#cdd6f4' },
  yuzde: { fontSize: 16, fontWeight: 'bold', color: '#89b4fa' },
  cubukDis: { height: 12, backgroundColor: '#45475a', borderRadius: 6 },
  cubukIc: { height: 12, backgroundColor: '#89b4fa', borderRadius: 6 },

  etkinlik: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#45475a',
  },
  etkinlikMetin: { color: '#cdd6f4' },
  zaman: { fontSize: 12, color: '#a6adc8' },
});