import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Gizlilik Politikası',
  description:
    'FootballAI gizlilik politikası: toplanan veriler, çerezler, üçüncü taraf reklamlar (Google AdSense) ve KVKK/GDPR kapsamındaki haklarınız.',
}

export default function GizlilikPage() {
  return (
    <div className="page legal">
      <h1>Gizlilik Politikası</h1>
      <p className="legal-updated">Son güncelleme: 2026</p>

      <p>
        Bu politika, FootballAI (“biz”) olarak hangi verileri topladığımızı,
        nasıl kullandığımızı ve haklarınızı açıklar. Hizmeti kullanarak bu
        politikayı kabul etmiş olursunuz.
      </p>

      <h2>Topladığımız veriler</h2>
      <ul>
        <li>
          <strong>Hesap bilgileri:</strong> kayıt olursanız e-posta ve adınız.
        </li>
        <li>
          <strong>Kullanım verileri:</strong> ziyaret edilen sayfalar, cihaz ve
          tarayıcı bilgisi gibi anonim/teknik veriler.
        </li>
        <li>
          <strong>Çerezler:</strong> tercihlerinizi hatırlamak ve reklam
          göstermek için kullanılır (bkz. Çerez Politikası).
        </li>
      </ul>

      <h2>Reklamlar ve üçüncü taraflar</h2>
      <p>
        Sitede Google AdSense üzerinden reklam gösterebiliriz. Google ve iş
        ortakları, ilgi alanına dayalı reklam sunmak için çerez kullanabilir.
        Reklam kişiselleştirmesini onay banner’ından reddedebilirsiniz; bu
        durumda yalnızca kişiselleştirilmemiş reklamlar gösterilir. Google’ın
        reklam ayarlarını{' '}
        <a
          href="https://www.google.com/settings/ads"
          target="_blank"
          rel="noopener noreferrer"
        >
          buradan
        </a>{' '}
        yönetebilirsiniz.
      </p>

      <h2>Verilerin kullanımı</h2>
      <p>
        Verileri hizmeti sunmak, geliştirmek, güvenliği sağlamak ve yasal
        yükümlülükleri yerine getirmek için kullanırız. Verilerinizi satmayız.
      </p>

      <h2>KVKK / GDPR haklarınız</h2>
      <p>
        Kişisel verilerinize erişme, düzeltme, silme ve işlemeye itiraz etme
        haklarına sahipsiniz. Talepleriniz için aşağıdaki iletişim adresinden
        bize ulaşabilirsiniz.
      </p>

      <h2>İletişim</h2>
      <p>
        Sorularınız için:{' '}
        <a href="mailto:contact@yukselarslan.com">contact@yukselarslan.com</a>
      </p>
    </div>
  )
}
