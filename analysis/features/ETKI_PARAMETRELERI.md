# Maç Sonucu Etki Parametreleri Kataloğu

> Amaç: tahmin "laf" değil **isabet** üretsin. Bunun için sonucu etkileyen tüm
> davranış/özellikleri sistematik listeliyoruz. Mevcut model yalnızca **21
> takım-agregat özellik** kullanıyor (`services/ml-service/app/services/feature_engineering.py`).
> Aşağıdaki katalog bunu ~140 parametreye genişletir.
>
> Durum etiketleri:
> - **[VAR]** mevcut 21 özellikte zaten kullanılıyor
> - **[EKSİK-K]** eksik, veri kolay erişilir (mevcut API/DB'den türetilebilir)
> - **[EKSİK-O]** eksik, orta zorluk (ek toplama/parse gerekir)
> - **[EKSİK-Z]** eksik, zor veri (lineup/event/tracking API gerekir)
>
> "Sinyal" = beklenen tahmin gücü (●○○ zayıf … ●●● güçlü).

---

## 0. Senin örneğin: pozisyonel/diziliş uyumsuzluğu

Soru: "sağ kanat oyuncusunu solda oynatırsan ne olur?" Bu **ölçülebilir** bir
etkidir ve bir grup özellikle modellenir:

| # | Parametre | Neden önemli | Durum | Sinyal |
|--:|-----------|--------------|-------|:------:|
| 0.1 | `player_out_of_position_count` | Doğal pozisyonu dışında oynayan oyuncu sayısı | [EKSİK-Z] | ●●○ |
| 0.2 | `wrong_footed_winger` | Ters ayak kanat (sağ ayaklı solda) — içe kat eğilimi, kroslama düşer, gol şutu artar; stilist değişim | [EKSİK-Z] | ●●○ |
| 0.3 | `natural_position_match_pct` | İlk 11'in doğal pozisyonda oynama yüzdesi | [EKSİK-Z] | ●●● |
| 0.4 | `makeshift_fullback` | Bek pozisyonunda doğaçlama oyuncu (ör. stoper sağ bekte) — kanat savunma zaafı | [EKSİK-Z] | ●●○ |
| 0.5 | `striker_played_as_winger` | Forvetin kanatta oynatılması — derinlik/genişlik dengesi bozulur | [EKSİK-Z] | ●○○ |
| 0.6 | `position_familiarity_minutes` | Oyuncunun o pozisyonda sezon içi oynadığı toplam dakika | [EKSİK-Z] | ●●○ |
| 0.7 | `lineup_chemistry_score` | İlk 11'in birlikte oynadığı toplam dakika (uyum) | [EKSİK-Z] | ●●○ |

> Modelleme notu: bunlar lineup verisi + her oyuncu için "doğal pozisyon"
> referansı gerektirir (ör. API-Football `players` + `lineups` endpoint'leri).
> Ters-ayak etkisi: kanat × tercih edilen ayak × oynadığı taraf çapraz
> özelliğiyle kodlanır.

---

## 1. Form & momentum
| # | Parametre | Durum | Sinyal |
|--:|-----------|-------|:------:|
| 1.1 | `home/away_form_score` (son 5, ağırlıklı) | [VAR] | ●●○ |
| 1.2 | `form_score_last10` (daha uzun pencere) | [EKSİK-K] | ●●○ |
| 1.3 | `points_per_game_trend` (yükseliş/düşüş eğimi) | [EKSİK-K] | ●●○ |
| 1.4 | `xg_form` (son N maç xG ortalaması, sonuçtan bağımsız) | [EKSİK-O] | ●●● |
| 1.5 | `xg_against_form` (son N maç xGA) | [EKSİK-O] | ●●● |
| 1.6 | `recent_goal_difference` | [EKSİK-K] | ●●○ |
| 1.7 | `unbeaten_streak` / `losing_streak` | [EKSİK-K] | ●○○ |
| 1.8 | `momentum_vs_quality` (formu, rakip gücüne göre düzeltilmiş) | [EKSİK-O] | ●●○ |

## 2. Hücum / savunma gücü (mevcut ama sığ)
| # | Parametre | Durum | Sinyal |
|--:|-----------|-------|:------:|
| 2.1 | `attack/defense_strength` (gol bazlı) | [VAR] | ●●○ |
| 2.2 | `goals_per_game`, `conceded_per_game` | [VAR] | ●●○ |
| 2.3 | `clean_sheet_rate` | [VAR] | ●○○ |
| 2.4 | `xg_per_game`, `xga_per_game` (gerçek şut kalitesi) | [EKSİK-O] | ●●● |
| 2.5 | `shots_on_target_per_game`, `shot_conversion_rate` | [EKSİK-O] | ●●○ |
| 2.6 | `big_chances_created/conceded` | [EKSİK-O] | ●●○ |
| 2.7 | `set_piece_goals_share` (duran toptan gol payı) | [EKSİK-O] | ●●○ |
| 2.8 | `finishing_overperformance` (gol − xG; şans mı yetenek mi) | [EKSİK-O] | ●●○ |
| 2.9 | `defensive_actions_per_game` (top kapma, blok, müdahale) | [EKSİK-Z] | ●○○ |

## 3. Kadro / diziliş (LINEUP) — en büyük eksik blok
| # | Parametre | Durum | Sinyal |
|--:|-----------|-------|:------:|
| 3.1 | `key_players_missing` (sakat/cezalı kilit oyuncu sayısı) | [EKSİK-O] | ●●● |
| 3.2 | `missing_players_value_share` (eksiklerin toplam kadro değerine oranı) | [EKSİK-O] | ●●● |
| 3.3 | `top_scorer_available` (gol kralı oynuyor mu) | [EKSİK-O] | ●●● |
| 3.4 | `key_playmaker_available` (asist/yaratıcılık lideri) | [EKSİK-O] | ●●○ |
| 3.5 | `first_choice_gk_available` | [EKSİK-O] | ●●○ |
| 3.6 | `rotation_index` (önceki maça göre değişen oyuncu sayısı) | [EKSİK-Z] | ●●○ |
| 3.7 | `avg_lineup_minutes_load` (son 10 günkü dakika yükü/yorgunluk) | [EKSİK-Z] | ●●○ |
| 3.8 | `formation` (4-3-3, 3-5-2 …) ve `formation_change_vs_last` | [EKSİK-Z] | ●●○ |
| 3.9 | `formation_matchup` (ör. 3-at-back vs 2-forvet kanat eşleşmesi) | [EKSİK-Z] | ●●○ |
| 3.10 | `bench_strength` (yedek kulübesi kalitesi/değeri) | [EKSİK-O] | ●○○ |
| 3.11 | `avg_age`, `experience_caps` (kadro tecrübesi) | [EKSİK-O] | ●○○ |
| 3.12 | + Bölüm 0'daki tüm pozisyon-uyumu parametreleri | [EKSİK-Z] | ●●○ |

## 4. Bireysel oyuncu nitelikleri & eşleşmeler
| # | Parametre | Durum | Sinyal |
|--:|-----------|-------|:------:|
| 4.1 | `squad_market_value` / `xi_market_value` (kadro kalitesi proxy) | [EKSİK-O] | ●●● |
| 4.2 | `avg_player_rating_xi` (son maç reytingleri ort.) | [EKSİK-Z] | ●●○ |
| 4.3 | `pace_mismatch` (hızlı kanat × yavaş bek eşleşmesi) | [EKSİK-Z] | ●●○ |
| 4.4 | `aerial_mismatch` (uzun forvet × kısa stoper — duran top) | [EKSİK-Z] | ●●○ |
| 4.5 | `key_duel_advantage` (yıldız oyuncu × markaj zaafı) | [EKSİK-Z] | ●●○ |
| 4.6 | `preferred_foot_distribution` (sağ/sol ayak dengesi) | [EKSİK-Z] | ●○○ |
| 4.7 | `striker_in_form` (forvetin son N maç gol/xG'si) | [EKSİK-O] | ●●○ |

## 5. Taktik stil & sistem
| # | Parametre | Durum | Sinyal |
|--:|-----------|-------|:------:|
| 5.1 | `possession_avg`, `possession_style` | [EKSİK-O] | ●○○ |
| 5.2 | `pressing_intensity` (PPDA — pas başına savunma aksiyonu) | [EKSİK-Z] | ●●○ |
| 5.3 | `defensive_line_height` (yüksek/alçak hat) | [EKSİK-Z] | ●●○ |
| 5.4 | `tempo` (dakika başına atak/pas hızı) | [EKSİK-Z] | ●○○ |
| 5.5 | `width_vs_central` (kanat mı orta mı bindirme) | [EKSİK-Z] | ●○○ |
| 5.6 | `style_clash` (yüksek pressing × topa sahip olma çatışması) | [EKSİK-Z] | ●●○ |
| 5.7 | `counter_attack_reliance` (kontra eğilimi) | [EKSİK-Z] | ●●○ |
| 5.8 | `manager_h2h` / `manager_tenure` (teknik direktör etkisi) | [EKSİK-O] | ●○○ |

## 6. Bağlamsal & durumsal
| # | Parametre | Durum | Sinyal |
|--:|-----------|-------|:------:|
| 6.1 | `home_advantage` (ev/deplasman) | [VAR] | ●●● |
| 6.2 | `home/away_win_rate` (saha bazlı) | [VAR] | ●●○ |
| 6.3 | `league_position_diff`, `points` | [VAR] | ●●○ |
| 6.4 | `rest_days` (son maçtan bu yana dinlenme) | [EKSİK-K] | ●●○ |
| 6.5 | `rest_days_diff` (iki takım arası dinlenme farkı) | [EKSİK-K] | ●●○ |
| 6.6 | `fixture_congestion` (son 14 günde maç sayısı) | [EKSİK-K] | ●●○ |
| 6.7 | `travel_distance_km` (deplasman seyahat yükü) | [EKSİK-O] | ●○○ |
| 6.8 | `midweek_european_game` (Avrupa kupası ardından lig maçı) | [EKSİK-K] | ●●○ |
| 6.9 | `derby_flag` (derbi/rekabet — form bozucu) | [EKSİK-O] | ●●○ |
| 6.10 | `competition_motivation` | [VAR] | ●●○ |
| 6.11 | `stakes_index` (kümeden düşme/şampiyonluk/Avrupa yarışı baskısı) | [EKSİK-O] | ●●○ |
| 6.12 | `season_stage` (sezon başı/orta/sonu) | [EKSİK-K] | ●○○ |
| 6.13 | `must_win_flag` (matematiksel zorunluluk) | [EKSİK-O] | ●●○ |
| 6.14 | `dead_rubber` (sonucun önemsizliği — motivasyon düşüşü) | [EKSİK-O] | ●●○ |
| 6.15 | `new_manager_bounce` (yeni teknik direktör etkisi, ilk maçlar) | [EKSİK-O] | ●○○ |

## 7. Head-to-head (mevcut ama genişletilebilir)
| # | Parametre | Durum | Sinyal |
|--:|-----------|-------|:------:|
| 7.1 | `h2h_home_win_rate`, `h2h_draw_rate` | [VAR] | ●●○ |
| 7.2 | `h2h_avg_goals` (gol eğilimi — over/under) | [EKSİK-K] | ●●○ |
| 7.3 | `h2h_venue_specific` (aynı sahadaki geçmiş) | [EKSİK-K] | ●○○ |
| 7.4 | `h2h_recency_weighted` (son karşılaşmalara ağırlık) | [EKSİK-K] | ●○○ |
| 7.5 | `h2h_style_dominance` (tarihsel üstünlük paterni) | [EKSİK-O] | ●○○ |

## 8. Çevresel koşullar
| # | Parametre | Durum | Sinyal |
|--:|-----------|-------|:------:|
| 8.1 | `weather_condition` (yağmur/kar — gol düşürür, sürpriz artırır) | [EKSİK-O] | ●○○ |
| 8.2 | `temperature`, `wind_speed` | [EKSİK-O] | ●○○ |
| 8.3 | `pitch_condition` (zemin kalitesi) | [EKSİK-Z] | ●○○ |
| 8.4 | `altitude` (irtifa — deplasman dezavantajı) | [EKSİK-O] | ●○○ |
| 8.5 | `kickoff_time` (gündüz/akşam, takvim etkisi) | [EKSİK-K] | ○○○ |

## 9. Hakem
| # | Parametre | Durum | Sinyal |
|--:|-----------|-------|:------:|
| 9.1 | `referee_cards_per_game` (kart eğilimi) | [EKSİK-O] | ●○○ |
| 9.2 | `referee_penalty_rate` | [EKSİK-O] | ●○○ |
| 9.3 | `referee_home_bias` (ev sahibi yanlılığı) | [EKSİK-O] | ●○○ |
| 9.4 | `var_present` (VAR var/yok) | [EKSİK-O] | ○○○ |

## 10. Disiplin & kart riski
| # | Parametre | Durum | Sinyal |
|--:|-----------|-------|:------:|
| 10.1 | `suspension_risk_players` (sarı kart sınırındaki oyuncular) | [EKSİK-O] | ●○○ |
| 10.2 | `red_card_proneness` (kırmızı kart geçmişi) | [EKSİK-O] | ●○○ |
| 10.3 | `fouls_per_game`, `cards_per_game` | [EKSİK-O] | ●○○ |

## 11. Piyasa / oran sinyalleri (en güçlü tek sinyal grubu)
| # | Parametre | Durum | Sinyal |
|--:|-----------|-------|:------:|
| 11.1 | `opening_odds` (açılış oranları → implied olasılık) | [EKSİK-O] | ●●● |
| 11.2 | `closing_odds` (kapanış — kalabalığın bilgeliği) | [EKSİK-O] | ●●● |
| 11.3 | `line_movement` (oran hareketi — para nereye akıyor) | [EKSİK-O] | ●●● |
| 11.4 | `market_overround_removed_prob` (vig'siz olasılık) | [EKSİK-O] | ●●● |

> Not: Piyasa oranları kalibrasyon ve **value/EV** hesabı için kritik; modelin
> oranlardan sapması bahis kararının çekirdeğidir.

## 12. Veri kalitesi & güven
| # | Parametre | Durum | Sinyal |
|--:|-----------|-------|:------:|
| 12.1 | `lineup_confirmed` (resmi 11 açıklandı mı, tahmin mi) | [EKSİK-K] | ●●○ |
| 12.2 | `data_completeness_score` (kaç özellik gerçek vs imputed) | [EKSİK-K] | ●○○ |
| 12.3 | `sample_size_matches` (az maç = düşük güven) | [EKSİK-K] | ●●○ |
| 12.4 | `prediction_confidence` (modelin kendi belirsizliği) | [EKSİK-K] | ●●○ |

---

## Önceliklendirme (isabet/maliyet)

**Dalga 1 — düşük maliyet, yüksek getiri (mevcut DB/API'den türetilebilir):**
xG/xGA form (1.4, 1.5, 2.4), rest_days & congestion (6.4–6.8), h2h_avg_goals
(7.2), key_players_missing & squad value (3.1–3.3, 4.1), sample_size/confidence
(12.x).

**Dalga 2 — orta maliyet, çok yüksek getiri:** piyasa oranları bloğu (11.x) →
kalibrasyon + value engine'i besler.

**Dalga 3 — yüksek maliyet, taktiksel derinlik:** lineup/pozisyon uyumu (Bölüm 0,
3.6–3.9), eşleşme özellikleri (4.2–4.5), stil çatışması (5.x). Lineup/event API
(ör. API-Football lineups+events, ya da StatsBomb/Opta) gerektirir.

> Makine-okunur tam liste: `features_catalog.json` (her parametre için id,
> kategori, kaynak, erişilebilirlik, beklenen etki). Pipeline'ı genişletirken bu
> dosya doğrudan tüketilebilir.
