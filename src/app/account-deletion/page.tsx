import type { Metadata } from 'next'
import Link from 'next/link'
import LegalDoc from '@/components/legal/LegalDoc'

export const metadata: Metadata = {
  title: '계정 삭제 안내 | 책육아정원',
  alternates: { canonical: '/account-deletion' },
}

// 계정 삭제 안내 — Google Play '계정 삭제' 요구사항용 공개 페이지(앱 설치·로그인 없이 볼 수 있어야 함, 2026.11.03).
// Play Console 데이터 보안 > 계정 삭제 URL에 이 주소(https://bookgardening.co.kr/account-deletion)를 등록한다.
// ⚠️ 삭제 범위·절차가 바뀌면 /privacy '보유 기간과 파기'와 함께 고칠 것 (CLAUDE.md 11.5)
const CONTACT = 'aylinative@gmail.com'

export default function AccountDeletionPage() {
  return (
    <LegalDoc
      title="계정 삭제 안내"
      effectiveDate="2026년 11월 3일"
      intro={<p>책육아정원(개발자: 서점 다니는 워킹맘) 계정과 데이터를 삭제하는 방법을 안내합니다.</p>}
      sections={[
        {
          title: '앱·사이트에서 직접 삭제하기',
          body: (
            <ul>
              <li>로그인 → 아래 탭 &lsquo;마이&rsquo; → 맨 아래 &lsquo;회원 탈퇴&rsquo;</li>
              <li>삭제되는 항목을 확인하고 &lsquo;탈퇴&rsquo;를 입력한 뒤 &lsquo;탈퇴하기&rsquo;를 누르면 바로 삭제됩니다.</li>
            </ul>
          ),
        },
        {
          title: '이메일로 삭제 요청하기',
          body: (
            <p>
              앱이나 사이트에 접속할 수 없으면 <b>{CONTACT}</b>로 &lsquo;계정 삭제 요청&rsquo;과 서비스 닉네임을 보내 주세요.
              본인 확인 후 영업일 기준 7일 안에 삭제하고 결과를 알려 드립니다.
            </p>
          ),
        },
        {
          title: '삭제되는 데이터',
          body: (
            <>
              <p>탈퇴하면 아래 정보가 <b>모두 즉시 삭제</b>되며 되돌릴 수 없습니다. 따로 보관하는 정보는 없습니다.</p>
              <ul>
                <li>계정 정보: 카카오 회원번호, 닉네임 (카카오 로그인 연결도 끊습니다)</li>
                <li>아이 정보: 띠·생년월일</li>
                <li>책육아 기록과 참고사진</li>
                <li>나도 추천해요, 저장한 책, 주제 제안, 신고·차단 내역</li>
              </ul>
              <p>시스템 장애 대비 백업에 남은 정보는 백업 보관 주기가 지나면 자동으로 삭제됩니다.</p>
            </>
          ),
        },
        {
          title: '더 알아보기',
          body: (
            <p>
              개인정보 처리에 대한 자세한 내용은{' '}
              <Link href="/privacy" className="text-main underline">
                개인정보처리방침
              </Link>
              을 확인해 주세요.
            </p>
          ),
        },
      ]}
    />
  )
}
