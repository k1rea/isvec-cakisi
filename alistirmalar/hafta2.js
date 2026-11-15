// DOT311 - 2. Hafta Alıştırması
const oyuncular = [
  { isim: "Ayşe", puan: 40 },
  { isim: "Veli", puan: 15 },
  { isim: "Zeynep", puan: 70 },
];

// 1) Sadece isimlerden oluşan bir dizi (map)
const isimler = oyuncular.map((o) => o.isim);
console.log(isimler); // [ 'Ayşe', 'Veli', 'Zeynep' ]

// 2) Puanı 30'dan büyük oyuncular (filter)
const yuksekPuanlilar = oyuncular.filter((o) => o.puan > 30);
console.log(yuksekPuanlilar); // Ayşe ve Zeynep

// 3) Her oyuncu için metin yazdır (forEach + template literal)
oyuncular.forEach(({ isim, puan }) => {
  console.log(`${isim}: ${puan} puan`);
});