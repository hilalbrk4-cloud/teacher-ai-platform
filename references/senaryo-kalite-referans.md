# Senaryo Sorularında Kalite Referansı

Bu belge, EduPilot'un **gerçek hayat senaryo tipi** sorularını gerçek MEB
sınav seviyesine çıkarmak için hazırlanmıştır. Aşağıdaki üç örnek, 5-6. sınıf
kesirler konusundan gerçek çalışma kitabı sorularıdır. Amaç: senaryo
sorularının hem **matematiksel olarak doğru/güvenli** hem de bu örnekler
kadar **nitelikli ve düşündürücü** olmasını sağlamak.

---

## Bölüm 1 — Örnek sorular (hedef seviye)

### Örnek 1: Terzi ve kumaş (bölme + "en fazla" inceliği)

> Bir terzi aldığı **32/5** metrelik kumaşla gömlek dikecektir. Gömleklerin
> her biri için **8/5** metre kullanılacağına göre terzi aldığı kumaş ile
> **en fazla** kaç tane gömlek dikebilir?
>
> A) 1  B) 2  C) 3  **D) 4**

**Çözüm:** 32/5 ÷ 8/5 = 32/8 = 4. Cevap D.

**Neden kaliteli:**
- Cevap metinde verilmiyor; öğrenci **kesir bölme** işlemi yapmak zorunda.
- "En fazla" ifadesi bir incelik: tam bölünmeseydi aşağı yuvarlanacaktı.
- Gerçekçi, tanıdık bağlam (terzi, kumaş, gömlek).

### Örnek 2: Kroki ve uzaklık (birim bulma + ölçekleme)

> Krokide okul ile kütüphane arası uzaklık **2 2/5** km olduğuna göre,
> kütüphane ile kafe arası uzaklık kaç kilometredir?
>
> A) 3 1/5  B) 3 2/5  **C) 3 3/5**  D) 3 4/5

**Çözüm:** Verilen mesafeden bir birim (kare) uzunluğu bulunur; sonra
istenen iki nokta arasındaki birim sayısıyla çarpılır. (Ör: okul-kütüphane
2 birim = 2 2/5 km → 1 birim = 1 1/5 km; kütüphane-kafe 3 birim = 3 3/5 km.)

**Neden kaliteli:**
- İki adımlı: önce birim uzunluğu bul, sonra başka bir mesafeye uygula.
- Çeldiriciler birbirine çok yakın (3 1/5, 3 2/5, 3 3/5, 3 4/5) — öğrenci
  gerçekten hesaplamazsa ayırt edemez.
- Görsel (kroki) sadece süs değil; birim sayısı görselden okunuyor.

### Örnek 3: Koşu pisti ve engeller (aralık sayma + "+1/-1" tuzağı)

> **49/2** metre uzunluğundaki bir koşu pistine; ilk engelin başlangıç
> çizgisine, son engelin bitiş çizgisine uzaklığı ile ardışık iki engel
> arasındaki mesafe **1 3/4** metre olacak şekilde engeller yerleştirilmiştir.
> Buna göre bu piste toplam kaç engel yerleştirilmiştir?
>
> A) 10  B) 11  **C) 13**  D) 14

**Çözüm:** Toplam uzunluk 49/2 = 24,5 m. Aralık 1 3/4 = 7/4 = 1,75 m.
Aralık sayısı = 24,5 ÷ 1,75 = **14**. Başlangıç ve bitişte de birer boşluk
olduğu için engel sayısı = aralık sayısı − 1 = **13**. Cevap C.

**Neden kaliteli:**
- Çok adımlı: karışık sayıyı bölme + aralık sayma mantığı.
- Klasik "çit direği (fencepost)" tuzağı: 14 aralık ama 13 engel. D şıkkı
  (14) tam da bu tuzağa düşenler için konmuş bir çeldirici.
- Görsel, kurulumu (başlangıç–engel–...–bitiş) anlamaya yardımcı oluyor.

---

## Bölüm 2 — Ortak kalite ölçütleri (kontrol listesi)

Her senaryo sorusu bu ölçütleri karşılamalı:

1. **Cevap metinde açıkça verilmez.** Öğrenci en az bir işlem (bölme,
   çarpma, karşılaştırma, birim bulma, aralık sayma) yapmak zorunda kalmalı.
   Tek adımlı "hangisi büyük?" soruları KABUL EDİLMEZ.
2. **En az bir kesir işlemi içerir** (toplama/çıkarma/çarpma/bölme,
   ya da karışık sayı ↔ bileşik kesir dönüşümü).
3. **Çeldiriciler yaygın öğrenci hatalarına denk gelir.** Rastgele sayı
   değil: ters çevirmeyi unutma, +1/−1 hatası, yanlış işlem seçme,
   yuvarlama hatası gibi. Şıklar birbirine yakın ve akla yatkın olmalı.
4. **Bağlam gerçekçi ve işe dâhil.** Bağlam süs değil; çözüm o bağlamdaki
   bir işleme dayanmalı. Alakasız/kafa karıştırıcı cümle eklenmez.
5. **Tek net soru sorulur.** Birden fazla soru iç içe geçirilmez;
   soru cümlesi tek ve açık olmalı.
6. **"En fazla / en az / tam olarak" gibi incelikler** uygun yerde kullanılır
   (ama zorlama değil).
7. **MEB kazanımına ve sınıf seviyesine uygun** olur; sayılar seviyeye
   göre makul büyüklükte tutulur.

---

## Bölüm 3 — Aritmetik güvenlik (kod tarafı)

Yukarıdaki kalite ölçütleri soruları zorlaştırır; zor soru = çok işlem =
daha çok hata riski. Bu yüzden kalite çıtasıyla birlikte **cevabın
doğruluğunu kod garanti etmeli.** Sayı doğrusu ve kesir kartlarında
uygulanan "veri doğruluğun tek kaynağıdır" prensibi senaryolara da taşınmalı:

- Model, sorunun **işlem adımlarını yapılandırılmış veri** olarak yazsın
  (verilen kesirler, yapılacak işlem türü, ara sonuçlar) — sadece düz metin
  cevap değil.
- **Kod bu adımları kesin kesir aritmetiğiyle hesaplasın** ve doğru cevabı
  kendisi bulsun; modelin işaretlediği şıkkı bununla karşılaştırsın.
- **Tutarsızlık varsa** (modelin cevabı ≠ kodun hesabı) soru **reddedilsin**
  ve yeniden üretilsin.
- **Tam sayı çıkması gereken yerlerde** (kişi, nesne, gömlek, engel sayısı)
  kesirli sonuç çıkıyorsa reddedilsin.
- Çeldiriciler de deterministik üretilebilir: yaygın hata senaryolarının
  (ters çevirme, +1/−1, yanlış işlem) sonuçları çeldirici olarak konsun.

Böylece hem sorular bu referanstaki üç örnek kadar nitelikli olur, hem de
cevap anahtarı her zaman doğru kalır.
