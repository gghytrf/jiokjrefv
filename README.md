# 東洋医学 学習スイート

国試学習・経穴検索・弁証支援・暗記などのアプリを、1つのホーム画面から起動できるようにまとめた統合 PWA です。ホームにカードを表示し、タップすると各アプリが全画面で開きます（iframe 方式）。

## 特長

- **複数アプリを1か所に** — ホームのカードから各アプリへ分岐。「‹ ホーム」で戻れます。
- **オフライン対応** — 一度開けば、通信のない場所でも起動・利用できます（アプリの殻を Service Worker がキャッシュ）。
- **通信は「更新確認」時のみ** — ホーム下部の「🔄 更新確認」ボタンを押したときだけ `version.json` を確認し、新しい版があれば最新化します。自動のオンライン確認は行いません。
- **既存データはそのまま** — 各アプリの学習履歴・カルテは従来どおり端末内（localStorage / IndexedDB）に保存され、これまでのデータを引き継いで使えます。
- **問題・経穴データは取り込み式（国試・〇×・弁証/選穴支援）** — これら3アプリは、配布された JSON を各アプリで「取り込み」して使います。取り込んだデータは端末内に保存され、オフラインでも利用できます。
- **バージョンは1つに統一** — `version.json` で一元管理。ホームの「🔄 更新確認」だけで全アプリまとめて最新化されます。
- **日付バージョン＋自動化** — push すると GitHub Actions が日付でバージョンを自動生成します（例 `2026.6.4`。同じ日に複数回更新したときだけ末尾に短いハッシュが付きます）。

## データの取り込み（国試学習・〇×問題集・弁証/選穴支援）

これら3アプリは、問題・経穴データをアプリ本体に内包せず、配布された JSON ファイルを取り込んで使います。

| アプリ | 取り込むファイル | 取り込み場所 | 保存先 |
|---|---|---|---|
| 国試学習 | `questions.json` | 初回案内 ／ 設定画面の「問題データ → 📥 取り込み」 | IndexedDB（StudyAppDB） |
| 国試〇×問題集 | `marubatsu_questions.json` | 初回案内 ／ 設定画面の「問題データ → 📥 取り込み」 | IndexedDB（MarubatsuDB） |
| 弁証・選穴支援 | `acupoints.json` | 初回案内 ／「主治症→経穴」タブ右上の「📥 経穴データ取り込み」 | IndexedDB（AcupointSearchDB） |

- 初回起動時に「取り込んでください」と案内が出ます。配布された JSON を選択すると取り込み完了です。
- 取り込み後はオフラインでも使えます。データが新しくなったら、同じ取り込みボタンから選び直すだけで更新できます。
- その他のアプリ（暗記・経穴カルタ用音声・トレーニング検索）は、これまで通りデータを内包しています。

配布用の JSON は、本リポジトリの `data/` フォルダに置いています（`data/questions.json` / `data/marubatsu_questions.json` / `data/acupoints.json`）。利用者にはこのファイルを配布し、各アプリで取り込んでもらいます。

## ファイル構成

```
.
├── index.html              統合ホーム（カード＋iframe＋更新確認）
├── manifest.json           PWA 設定（スイート全体）
├── sw.js                   統合 Service Worker（オフライン対応・更新は明示時のみ）
├── version.json            バージョン（GitHub Actions が日付で自動更新）
├── manual.html             スイート使用説明書
├── .nojekyll               GitHub Pages 用（必須・中身は空）
├── icons/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── icon-512-maskable.png
├── data/                   配布用データ（各アプリで取り込む）
│   ├── questions.json
│   ├── marubatsu_questions.json
│   └── acupoints.json
├── apps/
│   ├── kokushi/            国試学習アプリ（questions.json を取り込み）
│   │   ├── index.html
│   │   └── manual.html
│   ├── marubatsu/          国試〇×問題集（marubatsu_questions.json を取り込み）
│   │   ├── index.html
│   │   └── manual.html
│   ├── search/             （統合により弁証・選穴支援へリダイレクト）
│   │   ├── index.html
│   │   └── manual.html
│   ├── anki/               暗記アプリ（データ内包・変更なし）
│   │   ├── index.html
│   │   └── manual.html
│   ├── bensho/             弁証・選穴支援アプリ（弁証＋経穴検索を統合／acupoints.json を取り込み）
│   │   ├── index.html
│   │   └── manual.html
│   ├── karuta/             経穴カルタ用音声（データ内包・変更なし）
│   │   └── index.html
│   └── muscle/             トレーニング検索（データ内包・変更なし）
│       ├── index.html
│       └── manual.html
└── .github/workflows/
    └── version.yml         日付バージョン自動生成＋GitHub Pages デプロイ
```

## 公開手順（GitHub Pages）

1. 上記ファイル一式をリポジトリのルートに配置して push。
2. **Settings → Actions → General → Workflow permissions** で「**Read and write permissions**」を有効化（version.json の自動コミットに必要）。
3. **Settings → Pages → Build and deployment → Source** で「**GitHub Actions**」を選択。
4. main（または master）に push すると、ワークフローが
   1. `version.json` を日付で更新（例 `2026.6.4`）
   2. GitHub Pages へデプロイ
   を自動実行します。
5. 数十秒〜数分後、`https://<ユーザー名>.github.io/<リポジトリ名>/` で公開されます。

## 更新のしくみ

- アプリ本体（HTML）を変更して push すると、`version.json` が日付で自動更新されます。
- 利用者がホームの「🔄 更新確認」を押すと、新しいバージョンがあれば Service Worker が殻のキャッシュを入れ替え、最新版に切り替わります。**通信するのはこのボタンを押したときだけ**です。
- 問題・経穴データ（`data/*.json`）はキャッシュされません。データを新しくしたいときは、新しい JSON を配布し、各アプリの取り込みボタンから取り込み直してもらいます。

### 個別アプリだけ直したいとき

- 問題データを増やす → `data/questions.json` などを更新して配布（利用者は取り込み直し）。
- アプリの見た目・動作を直す → 該当する `apps/＜アプリ＞/index.html` を編集して push。

## オフラインについて

- 一度開けば、電車内・電波の弱い場所でもアプリの起動・利用ができます。
- 国試学習・〇×問題集・弁証/選穴支援は、初回のみデータの取り込みが必要です（取り込み後はオフライン可）。
- 利用者の学習履歴・カルテは端末内に保存されます。

## ローカル確認

`file://` で直接開くと Service Worker は無効ですが、ホームと各アプリの基本動作は確認できます。PWA・オフライン動作まで確認するには簡易サーバーを使ってください。

```
python3 -m http.server 8000
# → http://localhost:8000/ を開く
```

## 注意

- 公開リポジトリの場合、`data/` の問題データ・経穴データは第三者からも閲覧可能です。配布先・公開範囲にご注意ください。
- iOS Safari は一定期間アプリを開かないと端末内データが削除される場合があります。各アプリ／ホームのバックアップ機能（JSON 出力）を定期的にご利用ください。

### 制作者情報・バージョン

制作者情報とバージョンは、統合ホームに表示されます。
