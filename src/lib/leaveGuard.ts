// 작성 중 이탈 확인 (2026.11.14) — 기록하기 화면처럼 입력이 있는 화면이 메시지를 걸어두면,
// 하단 탭 바 등 화면 밖 이동 버튼이 이동 전에 확인한다. 걸린 게 없으면 그냥 이동.
// 브라우저 새로고침·닫기는 각 화면에서 beforeunload로 따로 막는다.

let message: string | null = null

export function setLeaveGuard(next: string | null) {
  message = next
}

// true = 이동해도 됨
export function confirmLeave(): boolean {
  return !message || window.confirm(message)
}
