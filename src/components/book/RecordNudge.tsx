import Link from 'next/link'
import RecordNudgeLoginButton from './RecordNudgeLoginButton'

// 책 페이지·기록 상세 공용 — 이 책을 기록하도록 권하는 안내 상자 (벽 아님)
// 로그인 전에도 보인다(2026.11.24 — 카카오톡 안 브라우저는 로그인이 따로라 안 보이던 문제). 누르면 그 자리에서 로그인 시트.
// - 아직 기록 안 함 → '이 책, 아이와 읽어보셨어요? [기록 남기기]' — 주 행동이라 올리브(14.7).
//   그 책을 바로 골라 둔 기록하기(?book=)로 — 다시 검색해 다른 판형으로 흩어지지 않게 (2026.11.24)
// - 이미 기록함 → '또 읽으셨나요? [또 읽었어요]' — 보조 안내라 회색 상자·흰 버튼. 가장 최근 기록 값으로 채운 재독 기록(?again=)
export default function RecordNudge({
  bookKey,
  myLatestPostId,
  isLoggedIn,
}: {
  bookKey: string
  myLatestPostId: string | null // 이 책의 내 가장 최근 기록(없으면 아직 기록 안 함)
  isLoggedIn: boolean
}) {
  const recordHref = `/recommend/create?book=${encodeURIComponent(bookKey)}`
  const buttonClass = 'mt-3 inline-block rounded-xl bg-main px-4 py-2 text-sm font-medium text-white'
  if (myLatestPostId) {
    return (
      <section className="mt-4 rounded-2xl bg-surface-muted p-5 text-center">
        <p className="text-sm font-semibold text-text/80">또 읽으셨나요?</p>
        <p className="mt-1 text-xs leading-relaxed text-text/60">오늘 아이와 다시 읽은 이야기를 남겨 보세요.</p>
        <Link
          href={`/recommend/create?again=${myLatestPostId}`}
          className="mt-3 inline-block rounded-xl bg-surface px-4 py-2 text-sm font-medium text-text/70"
        >
          또 읽었어요
        </Link>
      </section>
    )
  }
  return (
    <section className="mt-4 rounded-2xl bg-main/10 p-5 text-center">
      <p className="text-sm font-semibold text-main">이 책, 아이와 읽어보셨어요?</p>
      <p className="mt-1 text-xs leading-relaxed text-text/60">
        우리 아이 반응을 기록하면 같은 시기 양육자들에게 큰 도움이 돼요.
      </p>
      {isLoggedIn ? (
        <Link href={recordHref} className={buttonClass}>
          기록 남기기
        </Link>
      ) : (
        <RecordNudgeLoginButton next={recordHref} className={buttonClass}>
          기록 남기기
        </RecordNudgeLoginButton>
      )}
    </section>
  )
}
