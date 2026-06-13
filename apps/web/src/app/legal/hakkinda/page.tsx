import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Hakkında & İletişim',
  description:
    'FootballAI hakkında: yapay zekâ destekli futbol maç analizleri ve tahminleri. İletişim bilgileri.',
}

export default function HakkindaPage() {
  return (
    <div className="page legal">
      <h1>Hakkında</h1>

      <p>
        FootballAI; yapay zekâ ve istatistiksel modeller kullanarak futbol
        maçları için otomatik analiz, olasılık ve raporlar üreten ücretsiz bir
        platformdur. Maç öncesi, maç arası ve maç sonu değerlendirmeleri
        otomatik olarak hazırlanır.
      </p>

      <p>
        Ürettiğimiz tüm tahmin, olasılık ve analizler yalnızca bilgilendirme ve
        eğlence amaçlıdır. Kesinlik veya kazanç garantisi vermez, herhangi bir
        tavsiye niteliği taşımaz. Kararlarınızı kendi değerlendirmenizle
        veriniz.
      </p>

      <h2 id="iletisim">İletişim</h2>
      <p>
        Soru, öneri ve geri bildirimleriniz için:{' '}
        <a href="mailto:contact@yukselarslan.com">contact@yukselarslan.com</a>
      </p>
    </div>
  )
}
