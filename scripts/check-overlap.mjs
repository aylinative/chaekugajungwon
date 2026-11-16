// 워크트리 브랜치끼리 같은 파일을 고쳤는지 점검 (읽기 전용 — git 상태를 바꾸지 않는다)
// 사용: node scripts/check-overlap.mjs   (지침: docs/WORKTREE_RULES.md 6번)
import { execFileSync } from 'node:child_process';

const git = (...args) =>
  execFileSync('git', ['-c', 'core.quotepath=false', ...args], { encoding: 'utf8' }).trim();
const lines = (s) => (s ? s.split('\n').filter(Boolean) : []);

// 공용 파일 (docs/WORKTREE_RULES.md 3번)
const SHARED = new Set([
  'CLAUDE.md', 'package.json', 'package-lock.json', 'next.config.ts', 'src/app/layout.tsx',
  'src/middleware.ts', 'src/app/globals.css', 'src/lib/constants.ts', 'src/lib/supabase.ts',
  'src/lib/supabase-server.ts', 'src/lib/cacheTags.ts', '.gitignore', 'vercel.json',
]);

// 담당 파일 (docs/WORKTREE_RULES.md 2번) — 앞에서부터 처음 맞는 규칙
const OWNERS = [
  ['store', /^(ios|android|capacitor-shell|docs\/app-store|public\/\.well-known|src\/app\/api\/apple-app-site-association|앱스토어)\/|^(capacitor\.config\.ts|codemagic\.yaml)$/],
  ['data', /^(supabase|scripts\/taxonomy|DB 아카이빙 추가)\/|^docs\/taxonomy\/.*\.(csv|xlsx)$|^[^/]+\.xlsx$/],
  ['service-taxonomy', /^src\/lib\/(topic|tag)[^/]*\.ts$|^src\/components\/record\/Topic[^/]*\.tsx$|^src\/components\/feed\/TopicFilter[^/]*\.tsx$|^src\/components\/admin\/TagManager\.tsx$|^docs\/taxonomy\/.*\.md$/],
  ['service-record', /^src\//],
];
const ownerOf = (f) => (SHARED.has(f) ? null : OWNERS.find(([, re]) => re.test(f))?.[0] ?? null);
const roleOf = (branch) => branch.replace(/^wt\//, '');

const branches = lines(git('for-each-ref', '--format=%(refname:short)', 'refs/heads/wt/'));
if (!branches.length) {
  console.log('wt/ 브랜치가 없습니다.');
  process.exit(0);
}

const changed = new Map(); // file -> [branch]
const report = [];
for (const b of branches) {
  const base = git('merge-base', 'master', b);
  const files = lines(git('diff', '--name-only', base, b));
  const behind = Number(git('rev-list', '--count', `${b}..master`));
  const ahead = Number(git('rev-list', '--count', `master..${b}`));
  for (const f of files) changed.set(f, [...(changed.get(f) ?? []), b]);
  report.push({ b, files, ahead, behind });
}

let red = 0, yellow = 0;
console.log('=== 브랜치 상태');
for (const { b, files, ahead, behind } of report) {
  const lag = behind > 0 ? `  🟡 master보다 ${behind}커밋 뒤처짐 → 그 워크트리에서 git merge master` : '';
  if (behind > 0) yellow++;
  console.log(`${b}: 커밋 ${ahead}개, 파일 ${files.length}개${lag}`);
}

console.log('\n=== 두 브랜치 이상이 같은 파일을 고침');
const overlaps = [...changed].filter(([, bs]) => bs.length > 1);
if (!overlaps.length) console.log('✅ 없음');
for (const [f, bs] of overlaps) {
  red++;
  console.log(`🔴 ${f}  ← ${bs.join(', ')}`);
}

console.log('\n=== 공용 파일·담당 밖 파일 수정');
let flagged = 0;
for (const { b, files } of report) {
  for (const f of files) {
    if (f === 'CLAUDE.md') { red++; flagged++; console.log(`🔴 ${b}: CLAUDE.md 수정 (워크트리에선 docs/worklog/에 기록)`); continue; }
    if (SHARED.has(f)) { yellow++; flagged++; console.log(`🟡 ${b}: 공용 파일 ${f}`); continue; }
    if (f.startsWith('docs/worklog/')) {
      if (f !== `docs/worklog/${roleOf(b)}.md`) { yellow++; flagged++; console.log(`🟡 ${b}: 남의 작업 기록 ${f}`); }
      continue;
    }
    const owner = ownerOf(f);
    if (owner && owner !== roleOf(b)) { yellow++; flagged++; console.log(`🟡 ${b}: ${owner} 담당 파일 ${f}`); }
  }
}
if (!flagged) console.log('✅ 없음');

console.log(`\n결과: 🔴 ${red}  🟡 ${yellow}` + (red ? '  → 합치기 전에 사용자에게 알릴 것' : ''));
