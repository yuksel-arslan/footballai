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
      <b>Hukuki sorumluluk reddi:</b> Bu rapor yalnızca bilgilendirme ve eğlence
      amaçlıdır; yatırım, bahis veya finansal tavsiye niteliği taşımaz. Yapay
      zekâ tahminleri ve istatistiksel analizler kesinlik içermez ve hatalı
      olabilir. Bahis veya oyun içeren her türlü kararın ve sonucunun
      sorumluluğu tamamen kullanıcıya aittir; platform doğabilecek kayıplardan
      sorumlu tutulamaz. 18 yaş ve üzeri. Sorumlu oyna.
    </p>
  )
}
