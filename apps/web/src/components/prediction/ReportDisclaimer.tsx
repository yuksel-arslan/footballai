/**
 * Legal disclaimer shown on every report surface (pre-match, in-play,
 * post-match). Reports are informational/entertainment only — not investment,
 * betting or financial advice.
 */
export function ReportDisclaimer() {
  return (
    <p
      className="muted"
      style={{
        margin: '14px 0 0',
        paddingTop: 12,
        borderTop: '1px solid var(--line2)',
        fontSize: 11,
        lineHeight: 1.55,
        opacity: 0.75,
      }}
    >
      <b>Sorumluluk reddi:</b> Bu içerik yalnızca bilgilendirme ve eğlence
      amaçlıdır; herhangi bir tavsiye niteliği taşımaz. Yapay zekâ tahminleri ve
      istatistiksel analizler kesinlik içermez ve hatalı olabilir. Verilen her
      türlü kararın ve sonucunun sorumluluğu tamamen kullanıcıya aittir;
      platform doğabilecek sonuçlardan sorumlu tutulamaz.
    </p>
  )
}
