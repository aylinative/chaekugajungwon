import PeriodDistribution from '@/components/book/PeriodDistribution'

// ⚠️ 개발용 샘플 페이지 — 추천 시기 분포 컴포넌트 미리보기.
// 실데이터가 5표 미만인 동안 막대 형태를 확인하기 위한 것. 배포 전 삭제할 것.
export default function DistributionSamplePage() {
  return (
    <main className="mx-auto max-w-md space-y-6 bg-bg px-4 py-8">
      <p className="text-sm font-semibold text-text">
        분포 샘플 (개발용 — 배포 전 삭제)
      </p>

      <section className="rounded-2xl bg-surface p-4 shadow-sm">
        <p className="mb-3 text-xs font-medium text-text/60">
          ① 한 시기에 뾰족한 분포 (꽃잎 40% 이상 → &quot;꽃잎 시기에 가장 많아요&quot;)
        </p>
        <PeriodDistribution
          votes={{ 씨앗: 3, 새싹: 12, 꽃잎: 40, 열매: 8, 나무: 2, 어른: 1 }}
          totalVoters={60}
          myGroups={['꽃잎']}
        />
      </section>

      <section className="rounded-2xl bg-surface p-4 shadow-sm">
        <p className="mb-3 text-xs font-medium text-text/60">
          ② 여러 시기에 퍼진 분포 (최빈 40% 미만 → &quot;여러 시기에 걸쳐 추천돼요&quot;)
        </p>
        <PeriodDistribution
          votes={{ 씨앗: 9, 새싹: 11, 꽃잎: 13, 열매: 10, 나무: 6, 어른: 2 }}
          totalVoters={38}
          myGroups={['새싹', '열매']}
        />
      </section>

      <section className="rounded-2xl bg-surface p-4 shadow-sm">
        <p className="mb-3 text-xs font-medium text-text/60">
          ③ 5표 미만 (막대 대신 텍스트)
        </p>
        <PeriodDistribution votes={{ 꽃잎: 3 }} totalVoters={3} myGroups={['꽃잎']} />
      </section>
    </main>
  )
}
