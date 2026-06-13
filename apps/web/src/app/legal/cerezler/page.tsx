import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Çerez Politikası',
  description:
    'FootballAI çerez politikası: hangi çerezleri neden kullandığımız, reklam çerezleri ve tercihlerinizi nasıl yönetebileceğiniz.',
}

export default function CerezlerPage() {
  return (
    <div className="page legal">
      <h1>Çerez Politikası</h1>
      <p className="legal-updated">Son güncelleme: 2026</p>

      <p>
        Çerezler, ziyaret ettiğiniz sitelerin cihazınıza kaydettiği küçük metin
        dosyalarıdır. FootballAI’da çerezleri aşağıdaki amaçlarla kullanırız.
      </p>

      <h2>Kullandığımız çerez türleri</h2>
      <ul>
        <li>
          <strong>Zorunlu çerezler:</strong> oturum açma, güvenlik ve temel
          işlevler için gereklidir.
        </li>
        <li>
          <strong>Tercih çerezleri:</strong> tema, dil ve çerez onayı gibi
          seçimlerinizi hatırlar.
        </li>
        <li>
          <strong>Reklam çerezleri:</strong> Google AdSense ve iş ortakları
          tarafından, alakalı reklam göstermek için kullanılır. Onayınız olmadan
          kişiselleştirme yapılmaz.
        </li>
      </ul>

      <h2>Tercihlerinizi yönetme</h2>
      <p>
        Site ilk açıldığında gösterilen onay banner’ından reklam çerezlerini
        kabul edebilir veya reddedebilirsiniz. Tarayıcı ayarlarınızdan da
        çerezleri silebilir veya engelleyebilirsiniz; ancak bazı özellikler
        düzgün çalışmayabilir.
      </p>

      <h2>Üçüncü taraf çerezleri</h2>
      <p>
        Google’ın reklam çerezleri hakkında daha fazla bilgi ve kişisel reklam
        ayarları için{' '}
        <a
          href="https://policies.google.com/technologies/ads"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google reklam politikaları
        </a>{' '}
        sayfasını inceleyebilirsiniz.
      </p>
    </div>
  )
}
