/* ============================================================
   東洋医学 学習スイート  Service Worker（オフライン対応版）
   ・アプリ本体（HTML・ホーム・マニュアル等）をキャッシュし、
     一度開けば通信なしでも起動・利用できる（cache-first）。
   ・通信するのはホームの「更新確認」ボタンを押したときだけ。
     version.json をネットで確認し、変化があれば全キャッシュを破棄して
     最新を取り直す（UPDATE_NOW メッセージで実行）。
   ・問題・経穴データ（data/*.json）はキャッシュ対象外。
     各アプリで「データ取り込み」したものを端末内（IndexedDB/localStorage）
     に保存して使う。SW はデータJSONには関与しない。
   ・利用者の学習履歴・カルテは各アプリの localStorage / IndexedDB に
     保存されており、ここでは扱わない（従来通り保持される）。
   ============================================================ */

const CACHE_NAME = 'suite-shell-v1';

// 事前キャッシュする「アプリの殻」。データJSONは含めない。
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './manual.html',
  './apps/kokushi/index.html',
  './apps/kokushi/manual.html',
  './apps/marubatsu/index.html',
  './apps/marubatsu/manual.html',
  './apps/search/index.html',
  './apps/search/manual.html',
  './apps/anki/index.html',
  './apps/anki/manual.html',
  './apps/bensho/index.html',
  './apps/bensho/manual.html',
  './apps/karuta/index.html',
  './apps/muscle/index.html',
  './apps/muscle/manual.html',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png',
];

self.addEventListener('install', event => {
  // 殻をまとめて取得。取得できない項目があっても全体は失敗させない。
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(SHELL.map(async url => {
      try { await cache.add(new Request(url, { cache: 'reload' })); } catch (e) {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // 旧バージョンのキャッシュを掃除（現行 CACHE_NAME 以外を削除）
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // version.json は常にネットから確認（キャッシュしない・参照もしない）。
  // 通信できなければ 503 を返す（更新確認時のみ使われる）。
  if (url.pathname.endsWith('version.json')) {
    event.respondWith(fetch(req, { cache: 'no-store' }).catch(() =>
      new Response('{}', { status: 503, headers: { 'Content-Type': 'application/json' } })
    ));
    return;
  }

  // data/*.json（問題・経穴データ）は SW を素通り。
  // ＝各アプリの「データ取り込み」時だけネットへ。キャッシュには載せない。
  if (url.pathname.includes('/data/') && url.pathname.endsWith('.json')) {
    return; // 既定のネットワーク処理に任せる
  }

  // それ以外（アプリの殻）は cache-first：
  //  キャッシュにあればそれを返す（オフライン可）。
  //  無ければネットから取得し、取れたらキャッシュへ追加。
  event.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res && res.ok && res.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, res.clone());
      }
      return res;
    } catch (e) {
      // オフラインでキャッシュも無い場合：トップにフォールバック
      const fallback = await caches.match('./index.html');
      if (fallback) return fallback;
      return new Response('オフラインです。', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })());
});

// アプリ（ホーム）からの指示：全キャッシュを消して取り直す＝最新版へ更新
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'UPDATE_NOW') {
    event.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(SHELL.map(async url => {
        try { await cache.add(new Request(url, { cache: 'reload' })); } catch (e) {}
      }));
      const clients = await self.clients.matchAll();
      clients.forEach(c => c.postMessage({ type: 'UPDATED' }));
    })());
  }
});
