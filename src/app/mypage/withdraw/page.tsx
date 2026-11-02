import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabase, getIsOperator } from '@/lib/supabase-server'
import WithdrawForm from '@/components/mypage/WithdrawForm'

export const metadata: Metadata = { title: '회원 탈퇴 | 책육아정원', robots: { index: false } }

// 회원 탈퇴 — A안(전부 삭제). 개인정보처리방침 '보유 기간과 파기'와 같은 내용을 보여주고 확인 단어를 입력받는다.
export default async function WithdrawPage() {
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [isOperator, { count }] = await Promise.all([
    getIsOperator(supabase, user.id),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
  ])

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-black/5 bg-bg/90 px-4 py-3 backdrop-blur">
        <Link href="/mypage" className="text-sm text-main">
          ‹ 마이
        </Link>
        <span className="flex-1 text-base font-semibold text-text">회원 탈퇴</span>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-16 pt-5 text-sm leading-relaxed text-text/80">
        <h1 className="text-lg font-bold text-text">탈퇴하기 전에 확인해 주세요</h1>

        <section className="mt-4 rounded-2xl bg-surface p-4 shadow-sm">
          <p className="font-semibold text-text">탈퇴하면 아래 정보가 모두 삭제되고 되돌릴 수 없어요.</p>
          <ul className="mt-2 space-y-1 [&_li]:ml-4 [&_li]:list-disc">
            <li>
              책육아 기록 <b>{count ?? 0}건</b>과 참고사진 (홈·책 페이지에서도 사라져요)
            </li>
            <li>아이 정보, 닉네임</li>
            <li>나도 추천해요, 저장한 책, 주제 제안</li>
            <li>카카오 로그인 연결</li>
          </ul>
          <p className="mt-3 text-xs text-text/50">
            같은 카카오 계정으로 다시 가입할 수 있지만, 지운 기록은 복구되지 않아요. 자세한 내용은{' '}
            <Link href="/privacy" className="underline">
              개인정보처리방침
            </Link>
            을 확인해 주세요.
          </p>
        </section>

        {isOperator ? (
          <p className="mt-6 rounded-xl bg-yellow-50 px-3 py-3 text-xs text-yellow-800">
            운영자 계정은 탈퇴할 수 없어요. 운영자 권한을 먼저 해제해 주세요.
          </p>
        ) : (
          <WithdrawForm />
        )}
      </main>
    </div>
  )
}
