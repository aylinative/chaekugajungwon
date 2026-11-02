'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // 등록 실패해도 앱 동작에는 영향 없음
      });
    }
  }, []);

  return null;
}
