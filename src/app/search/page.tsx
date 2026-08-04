import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import ComingSoon from '@/components/ComingSoon'

export default async function SearchPage() {
  // 첫 기록 게이트(11.4): 콘텐츠 소비 입구(홈·검색)는 기록 1건 이후에 열린다
  const supabase = await createServerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    const { count } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
    if ((count ?? 0) === 0) {
      redirect('/recommend/create?first=1')
    }
  }

  return <ComingSoon title="검색" emoji="🔍" />
}
