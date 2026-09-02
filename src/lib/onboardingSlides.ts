// 온보딩 모달 + 이용 가이드(/guide) 공용 콘텐츠. 스크린샷·문구 교체는 이 한 곳만.
export interface OnboardingSlide {
  image: string
  imageAlt: string
  title: string
  body: string
}

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    image: '/onboarding/01-home.png',
    imageAlt: '책육아정원 홈 피드',
    title: '당신의 기록이\n다른 아이의 좋은 책이 돼요',
    body: "아이와 함께 읽은 그림책을 기록하면, 그 기록이 모여 다른 양육자에게 'N개월에 좋았던 책' 추천이 됩니다. 나를 위한 육아일기이자, 모두를 위한 추천이에요.",
  },
  {
    image: '/onboarding/02-groups.png',
    imageAlt: '시기별 섹션',
    title: '아이 시기에 꼭 맞는 그림책',
    body: '씨앗🫘·새싹🌱·꽃잎🌸·열매🍎·나무🌳·어른👩‍👦 — 아이가 자라는 6개 시기로 책을 나눠요. 우리 아이가 지금 어떤 시기인지, 그 시기 아이들이 어떤 책을 좋아했는지 한눈에 볼 수 있어요.',
  },
  {
    image: '/onboarding/03-form.png',
    imageAlt: '기록하기 폼',
    title: '기록은 이렇게 남겨요',
    body: '책 제목으로 검색해 고르고 → 읽어주면 좋은 시기를 선택하고 → 우리 아이 반응을 남기면 끝. 주제 태그도 달면 같은 주제 책을 찾는 사람들에게 더 잘 보여요.',
  },
  {
    image: '/onboarding/04-reaction.png',
    imageAlt: '반응 선택 UI',
    title: '솔직한 반응이 가장 큰 힘이에요',
    body: '자꾸 꺼내봐요 / 재밌어했어요 / 그냥 봤어요 — 있는 그대로 남겨주세요. 솔직한 반응이 쌓여야 다른 양육자에게 진짜 도움이 될거에요.',
  },
  {
    image: '/onboarding/05-cards.png',
    imageAlt: '홈 피드 카드들',
    title: '마음에 든 책은 추천하고 저장해요',
    body: "다른 기록에 '나도 추천해요'를 누르면 추천 시기가 쌓이고, 아직 안 읽은 책은 '저장'해 두었다가 나중에 아이와 읽어요. 검색으로 원하는 책의 기록도 찾아볼 수 있어요.",
  },
]
