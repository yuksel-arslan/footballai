# Canlı Rulet Strateji Analizi — Gerçek İstatistiklerle

> Bu rapor popüler haber/forum iddialarına değil, `simulate.py` ile **kendi
> üretilen** Monte Carlo verilerine dayanır. Tekrar üretmek için:
> `python3 simulate.py` (numpy gerekir, ~35 sn). Seed sabit, sonuçlar
> tekrarlanabilir.

## Yöntem

İki bağımsız deney:

1. **Part A — Ampirik ev avantajı:** Çark başına **40.000.000** bağımsız spin
   simüle edildi, her birinde 1 birim eşit-şans (kırmızı/siyah) bahsi.
   Ortalama net getiri → ev avantajının ampirik ölçümü.
2. **Part B — Strateji oturumları:** Çark ve strateji başına **60.000 oyuncu**
   (Labouchère için 20.000). Her oyuncunun gerçek bankrolü (€500), masa limiti
   (€100 eşit-şans max), hedefi (€1000'e ulaş) ve iflas koşulu var. 500 spin
   sonunda dağılım ölçüldü.

Test edilen sistemler: Flat, Martingale, Grand Martingale, D'Alembert,
Fibonacci, Paroli (ters Martingale), Labouchère.

## Part A — Ölçülen Ev Avantajı (40M spin/çark)

| Çark | Teorik avantaj | **Ölçülen avantaj** | %95 GA |
|------|---------------:|--------------------:|-------:|
| Avrupa (tek 0) | 2.7027% | **2.7038%** | ±0.031% |
| Fransız (la partage) | 1.3514% | **1.3586%** | ±0.031% |
| Amerikan (0 ve 00) | 5.2632% | **5.2552%** | ±0.031% |

Ölçülen değerler teorinin tam üstünde, gürültü payı içinde. **Riske ettiğin her
birim, ortalamada bu oranda erir — bahis sırasından bağımsız olarak.**

## Part B — Strateji Oturumları

### Avrupa Çarkı (teorik avantaj 2.7027%)

| Strateji | P(€1000'e ulaş) | P(kârla çık) | P(her şeyi kaybet) | Ort. net | Medyan | Std | Ort. riske edilen | **Gerçekleşen avantaj** |
|----------|---:|---:|---:|---:|---:|---:|---:|---:|
| flat | 0.00% | 25.60% | 0.00% | −13.65 | −14.0 | 22.3 | 500 | 2.729% |
| martingale | 0.00% | 50.94% | 0.20% | −54.93 | +9.0 | 255.4 | 1962 | 2.800% |
| grand_mart | 0.45% | 46.67% | 0.27% | −75.00 | −39.0 | 326.0 | 2723 | 2.755% |
| dalembert | 0.00% | 43.13% | 0.59% | −142.63 | −86.0 | 301.5 | 5234 | 2.725% |
| fibonacci | 0.00% | 67.56% | 0.17% | −45.29 | +70.0 | 209.9 | 1608 | 2.817% |
| paroli | 0.00% | 29.12% | 0.00% | −23.11 | −24.0 | 43.7 | 846 | 2.730% |
| labouchere | 0.00% | 53.91% | 0.40% | −90.92 | +69.0 | 313.9 | 3360 | 2.706% |

### Fransız Çarkı / la partage (teorik avantaj 1.3514%)

| Strateji | P(€1000'e ulaş) | P(kârla çık) | P(her şeyi kaybet) | Ort. net | Medyan | Std | Ort. riske edilen | **Gerçekleşen avantaj** |
|----------|---:|---:|---:|---:|---:|---:|---:|---:|
| flat | 0.00% | 37.31% | 0.00% | −6.89 | −7.0 | 22.1 | 500 | 1.377% |
| martingale | 0.00% | 56.93% | 0.15% | −25.59 | +44.5 | 225.7 | 1772 | 1.444% |
| grand_mart | 0.00% | 52.58% | 0.22% | −35.96 | +22.5 | 301.3 | 2522 | 1.426% |
| dalembert | 0.00% | 56.34% | 0.43% | −63.81 | +51.0 | 270.1 | 4615 | 1.383% |
| fibonacci | 0.00% | 72.53% | 0.09% | −20.10 | +52.0 | 170.0 | 1355 | 1.483% |
| paroli | 0.00% | 38.82% | 0.00% | −11.68 | −12.5 | 43.4 | 846 | 1.380% |
| labouchere | 0.00% | 63.28% | 0.26% | −42.14 | +124.5 | 289.7 | 3150 | 1.338% |

## Verinin Söyledikleri

1. **Hiçbir sistem ev avantajını yenemez.** "Gerçekleşen avantaj" sütunu
   (−ortalama net / riske edilen toplam) yedi sistemin tamamında çarkın teorik
   avantajına oturuyor (Avrupa ~%2.70, Fransız ~%1.35). Martingale, Fibonacci,
   Labouchère... hepsi aynı orana yakınsıyor. Sistem sadece **kazanç/kayıp
   dağılımının şeklini** değiştirir, ortalamasını asla.

2. **"Yüksek kazanma olasılığı" bir illüzyon.** Fibonacci'de oyuncuların
   %67.56'sı kârla çıkıyor (medyan +70€) — kulağa harika geliyor. Ama
   **ortalama** net −45€. Yani çok sayıda küçük kazanç, az sayıda yıkıcı kayıpla
   finanse ediliyor. Std sütunundaki büyük rakamlar (200-330€) bu kuyruğu
   gösteriyor. Bu, agresif sistemlerin matematiksel imzasıdır.

3. **Daha çok riske et = daha çok kaybet.** D'Alembert ortalama 5234€ riske
   ediyor ve en yüksek mutlak kaybı veriyor (−143€). Çünkü kayıp = (riske edilen)
   × (ev avantajı). Edge sabit olduğundan, toplam ciroyu artıran her sistem
   beklenen kaybı büyütür.

4. **Tek matematiksel optimizasyon çark seçimidir.** Fransız/la partage çarkında
   ev avantajı yarıya iner (%2.70 → %1.35). Aynı flat bahis Avrupa'da ortalama
   −13.65€, Fransız'da −6.89€. **Net %50 iyileşme** — ve bu kanıtlanabilir tek
   gerçek "strateji".

## Sonuç (sistemin neden "hatalı ve eksik" göründüğünün cevabı)

Aranan şey — ruleti uzun vadede kâra çeviren bir bahis sıralaması — **var
olmadığı için** hiçbir sistem onu sağlayamaz. Eksiklik koddaki bir hata değil,
oyunun yapısında: her bahis negatif beklenen değerli ve spinler bağımsız.
Simülasyon bunu uydurma değil, 40M+ veri noktasıyla ampirik olarak gösteriyor.

Rasyonel çıkarım:
- **En düşük avantajlı varyantı seç** (Fransız, la partage) — kanıtlanmış tek kazanım.
- **Düşük varyans istiyorsan flat bahis**; agresif sistemler sadece iflas kuyruğunu büyütür.
- Sıkı oturum limiti; oyunu eğlence gideri olarak gör, yatırım olarak değil.

> Pozitif beklenen değer arıyorsan adres rulet değil. Bu repodaki ML futbol
> tahmin çıktıları üzerine **Kelly criterion + bankroll yönetimi** kurarsak,
> ruletin aksine matematiksel olarak +EV mümkün olabilir (model piyasa
> oranlarından iyiyse). Onu kurmamı istersen söyle.
