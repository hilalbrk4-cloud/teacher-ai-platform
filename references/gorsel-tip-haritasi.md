# Görsel Soru Tipleri Haritası (gerçek örneklere dayalı)

Bu belge, EduPilot'un **görsel yeni nesil** sorularını çeşitlendirmek içindir.
Amaç: tek bir görsel tipe (pizza) takılı kalmamak; aşağıdaki **tüm görsel tipleri**
sisteme ekleyip, her quizde farklı tiplerden dengeli dağıtmak.

Her tip, Hilal'in topladığı gerçek EBA / matematikçiler.com / derslig sorularına
dayanır. Her biri **"veri doğruluğun kaynağıdır"** prensibiyle kurulur: model
yapılandırılmış veri üretir, **kod görseli çizer ve doğru cevabı hesaplar**,
tutarsızsa soruyu reddeder.

Hepsinin ortak kuralı: **soru tek adımlı "resmi oku" olmamalı.** Görsel veriyi
verir; soru üstüne çok adımlı işlem (bölme, çarpma, toplama, karşılaştırma,
sadeleştirme, sayma + koşul) bindirir.

---

## MEVCUT TİPLER (dokunma, korunacak)
- **sayi_dogrusu** — birim kesir konumu, karşılaştırma, sıralama.
- **kesir_kartlari** — kesir türü, denklik, "yanlış söyleyen öğrenci."
- **gercek_hayat_senaryo** — görselsiz/sade metin senaryoları (terzi, harçlık,
  güveç, Ece, çiftçi vb. — v2 referansındaki aileler).

---

## YENİ GÖRSEL TİPLER (sırayla eklenecek)

### TİP 1 — daire_kesir (pizza/daire)  [ÖNCE BU]
**Gerçek örnekler:** 8 eş dilimli boyalı daire "denk DEĞİLDİR"; 4 dilimde sayılar
(24,30,28,40) sarı=pay/mavi=payda → oluşan kesre denk olan/olamaz.
**Görsel:** `dilim` eş parçaya bölünmüş daire, `boyali` parça dolu. Kod çizer.
**Çok adımlı görevler:**
- `dilime_cevir`: "Pizza N eş dilim, p/q'ü yendi, kaç dilim?" → N×p/q.
- `kalan_kisiler`: "N dilim, k kişi birer dilim yedi, kaçta kaçı kaldı (sadeleş)?"
- `iki_pizza_karsilastir` / `toplam_iki_pizza`: iki pizza, karşılaştır/topla.
- `denklik_degil`: boyalı bölgeye denk OLMAYAN kesri seç (derslig tarzı).
**Veri:** `{ daireler:[{dilim,boyali,renk,ad?}], gorev, senaryo, soru, secenekler, dogru_cevap, cozum }`

### TİP 2 — kesir_cubugu (şerit/bar modeli)
**Gerçek örnek:** Yan yana dikdörtgenlerde taralı bölge 3 tam + 1/2 = 7/2;
"buna eşit DEĞİLDİR" / tam sayılı ↔ bileşik dönüşüm.
**Görsel:** `cubukSayisi` dikdörtgen, her biri `parca` eş bölme, `tarali` bölüm dolu.
**Çok adımlı görevler:**
- İki şeridi karşılaştır (farklı payda).
- İki şeridi topla/çıkar.
- Taralı bölgeye EŞİT OLMAYAN gösterimi seç (3+1/2, 7/2, 3½ eşdeğerleri).
**Veri:** `{ cubuklar:[{parca, tarali}], gorev, ... }`

### TİP 3 — alan_izgara (alan/ızgara modeli)
**Gerçek örnekler:** Pınar 9/27'ye, Umut 28/35'e denk alan boyuyor → sonradan
boyanan kaç kare; çiftçi tarlası alanlarını sırala.
**Görsel:** `satir × sutun` ızgara (dikdörtgen), `boyaliKareler` dolu.
**Çok adımlı görevler:**
- "Önce A kadar, sonra B kadar boyandı → sonradan boyanan kaç kare?" (iki denkliği
  kareye çevir, fark al).
- Alan karşılaştırma / sıralama (farklı paydalı bölümler).
**Veri:** `{ satir, sutun, asamalar:[{denklik, boyaliSayi}], gorev, ... }`

### TİP 4 — tablo_kesir (tablo modeli)
**Gerçek örnekler:** Küre kütleleri (en hafif/en ağır → C olabilir?); tahta
boyları tablosu (2 metreden uzun kaç tane); kroki uzaklıkları.
**Görsel:** Satır-sütunlu tablo (kod çizer), değerler kesir.
**Çok adımlı görevler:**
- Eşik koşuluyla say ("2'den büyük kaç tane") → tam sayı.
- Eksik değeri aralıkla bul ("en ağır C ise C ne olabilir") → eşitsizlik.
- İki satırı topla/karşılaştır.
**Veri:** `{ basliklar:[...], satirlar:[{ad, deger}], gorev, kosul, ... }`

### TİP 5 — cetvel_olcum (cetvel/ölçüm modeli)
**Gerçek örnek:** Eş bölmeli 10 cm cetvel; bir kenar 3'e denk, diğer uç 7-8 arası
8'e yakın → kenar kaç cm olabilir?
**Görsel:** Bölmeli cetvel + ölçülen nesne (kod çizer, konumlar veriden).
**Çok adımlı görev:** Başlangıç-bitiş oku + "en yakın/arası" muhakemesi → aralık/kesir.
**Veri:** `{ cetvelUzunluk, bolme, baslangic, bitisAraligi, gorev, ... }`

---

## ÇEŞİTLİLİK (ajanın uyacağı dağılım)
1. Bir quizde **aynı görsel tip en fazla 1-2 kez** kullanılsın.
2. Görsel tipler + senaryo tipleri + muhakeme tipleri **karışık** gelsin.
3. Görsel tip, konuya uyduğunda seçilsin (pizza = paylaşma/bütün parça; tablo =
   çoklu veri; cetvel = ölçüm; ızgara = alan). Zorla pizzaya çevrilmesin.
4. Her görsel tipte görev de çeşitlensin (Tip 1'de sadece "dilime çevir" değil,
   karşılaştırma/toplama/denklik de).

## ARİTMETİK GÜVENLİK (tüm tipler)
Model veriyi üretir → kod doğru cevabı hesaplar → modelin şıkkıyla karşılaştırır
→ tutmazsa veya tam sayı gereken yerde kesir çıkarsa reddeder.

## EKLEME SIRASI (önerilen)
1. **daire_kesir** (demo hazır: `references/daire-kesir-demo.html`)
2. **kesir_cubugu**
3. **alan_izgara**
4. **tablo_kesir**
5. **cetvel_olcum**
Her tip ayrı turda eklenip test edilsin; bir öncekiler bozulmasın.
