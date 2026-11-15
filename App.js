import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, TextInput, Pressable } from 'react-native';

function yeniGizliSayi() {
  return Math.floor(Math.random() * 100) + 1;
}

export default function App() {
  const [gizli, setGizli] = useState(yeniGizliSayi());
  const [tahmin, setTahmin] = useState('');
  const [mesaj, setMesaj] = useState('1 ile 100 arasında bir sayı tuttum. Bil bakalım!');
  const [mesajTuru, setMesajTuru] = useState('bilgi'); // bilgi | ipucu | hata | kazandi
  const [deneme, setDeneme] = useState(0);
  const [bildi, setBildi] = useState(false);

  const tahminEt = () => {
    // Geçersiz giriş kontrolü: boş, sayı değil ya da 1–100 dışı
    if (tahmin.trim() === '') {
      setMesaj('Lütfen bir sayı yaz.');
      setMesajTuru('hata');
      return;
    }

    const sayi = Number(tahmin);

    if (isNaN(sayi) || sayi < 1 || sayi > 100) {
      setMesaj('Geçersiz giriş! 1 ile 100 arasında bir sayı yaz.');
      setMesajTuru('hata');
      setTahmin('');
      return;
    }

    const yeniDeneme = deneme + 1;
    setDeneme(yeniDeneme);

    if (sayi < gizli) {
      setMesaj(`${sayi} → Daha büyük!`);
      setMesajTuru('ipucu');
    } else if (sayi > gizli) {
      setMesaj(`${sayi} → Daha küçük!`);
      setMesajTuru('ipucu');
    } else {
      setMesaj(`Bildin! 🎉 Sayı ${gizli} idi. ${yeniDeneme}. tahminde buldun.`);
      setMesajTuru('kazandi');
      setBildi(true);
    }

    // Her tahminden sonra kutuyu temizle
    setTahmin('');
  };

  const yenidenOyna = () => {
    setGizli(yeniGizliSayi());
    setTahmin('');
    setDeneme(0);
    setBildi(false);
    setMesaj('Yeni bir sayı tuttum. Bil bakalım!');
    setMesajTuru('bilgi');
  };

  return (
    <View style={styles.ekran}>
      <Text style={styles.baslik}>Sayı Tahmin Oyunu</Text>
      <Text style={styles.sayac}>Tahmin sayısı: {deneme}</Text>

      <TextInput
        style={styles.kutu}
        value={tahmin}
        onChangeText={setTahmin}
        placeholder="1 - 100"
        placeholderTextColor="#6c7086"
        keyboardType="numeric"
        maxLength={3}
        editable={!bildi}
        onSubmitEditing={tahminEt}
      />

      <Pressable
        onPress={tahminEt}
        disabled={bildi}
        style={({ pressed }) => [
          styles.buton,
          pressed && styles.butonBasili,
          bildi && styles.butonPasif,
        ]}
      >
        <Text style={styles.butonYazi}>Tahmin Et</Text>
      </Pressable>

      <Text style={[styles.mesaj, styles[mesajTuru]]}>{mesaj}</Text>

      {bildi && (
        <Pressable
          onPress={yenidenOyna}
          style={({ pressed }) => [
            styles.buton,
            styles.yenidenButon,
            pressed && styles.butonBasili,
          ]}
        >
          <Text style={styles.butonYazi}>Yeniden Oyna</Text>
        </Pressable>
      )}

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  ekran: {
    flex: 1,
    backgroundColor: '#1e1e2e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  baslik: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f9e2af',
    marginBottom: 8,
  },
  sayac: {
    fontSize: 16,
    color: '#a6adc8',
    marginBottom: 24,
  },
  kutu: {
    width: '60%',
    backgroundColor: '#313244',
    color: '#cdd6f4',
    fontSize: 24,
    textAlign: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#45475a',
    marginBottom: 16,
  },
  buton: {
    width: '60%',
    backgroundColor: '#89b4fa',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  butonBasili: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  butonPasif: {
    backgroundColor: '#45475a',
  },
  yenidenButon: {
    backgroundColor: '#a6e3a1',
    marginTop: 16,
  },
  butonYazi: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e1e2e',
  },
  mesaj: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 24,
  },
  bilgi: { color: '#cdd6f4' },
  ipucu: { color: '#f9e2af' },
  hata: { color: '#f38ba8' },
  kazandi: { color: '#a6e3a1', fontWeight: 'bold' },
});