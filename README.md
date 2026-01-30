# Stripe Assist

AI-powered Stripe assistant chat application built with Next.js, Prisma, and NextAuth.js.

## セットアップ手順

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd stripe_assist
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. Gemini API の設定

このアプリケーションは Google Gemini API を使用して AI チャット機能を提供します。

#### Gemini API キーの取得

1. [Google AI Studio](https://aistudio.google.com/apikey) にアクセス
2. Googleアカウントでサインイン
3. 「Create API key」をクリック
4. 生成された API キーをコピー（後ほど環境変数に設定します）

**注意**:
- 無料ティアでは 1分あたり15リクエスト、1日あたり1,500リクエストまで利用可能です
- APIキーは秘密情報として扱い、公開リポジトリにコミットしないでください

### 4. 環境変数の設定

`.env.example`をコピーして`.env`ファイルを作成します。

```bash
cp .env.example .env
```

以下の環境変数を設定してください：

```env
# Database（デフォルトのまま）
DATABASE_URL="file:./dev.db"

# Auth.js - 以下のコマンドで生成
# openssl rand -base64 32
AUTH_SECRET="your-auth-secret-here"

# 暗号化キー（Stripeキーの暗号化用）- 以下のコマンドで生成
# openssl rand -hex 32
ENCRYPTION_KEY="your-64-character-hex-key-here"

# Google Gemini API 設定
# Google AI Studio で取得したAPIキー
GEMINI_API_KEY="your-gemini-api-key-here"

# 使用するモデル（function calling をサポートするモデル）
# 推奨: gemini-2.5-flash（高速で費用対効果が高い）
# その他: gemini-2.5-flash-lite, gemini-2.5-pro
GEMINI_MODEL="gemini-2.5-flash"
```

#### 環境変数の生成コマンド

```bash
# AUTH_SECRETの生成
openssl rand -base64 32

# ENCRYPTION_KEYの生成
openssl rand -hex 32
```

### 5. データベースのセットアップ

Prismaのマイグレーションを実行してデータベースを作成します。

```bash
npx prisma migrate dev
```

### 6. 初期データの投入（オプション）

```bash
npm run db:seed
```

### 7. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてアプリケーションを確認できます。

## 利用可能なスクリプト

- `npm run dev` - 開発サーバーの起動
- `npm run build` - 本番用ビルド
- `npm start` - 本番サーバーの起動
- `npm run lint` - ESLintによるコードチェック
- `npm run db:seed` - データベースに初期データを投入
- `npm run db:reset` - データベースをリセットして初期データを投入

## 技術スタック

- **フレームワーク**: [Next.js 16](https://nextjs.org)
- **認証**: [NextAuth.js v5](https://next-auth.js.org)
- **データベース**: [Prisma](https://prisma.io) + SQLite
- **UI**: React Bootstrap, Tailwind CSS
- **AI**: Google Gemini API (gemini-2.5-flash)
- **決済**: Stripe API

## プロジェクト構成

```
stripe_assist/
├── src/
│   ├── app/              # Next.js App Router
│   ├── components/       # Reactコンポーネント
│   └── lib/              # ユーティリティとライブラリ
├── prisma/
│   ├── schema.prisma     # データベーススキーマ
│   ├── migrations/       # マイグレーションファイル
│   └── seed.ts          # シードデータ
└── public/              # 静的ファイル
```

## Learn More

Next.jsについて詳しく学ぶには以下のリソースをご覧ください：

- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)
- [Next.js GitHub repository](https://github.com/vercel/next.js)

## Deploy on Vercel

Vercel Platformを使用したデプロイが最も簡単です。

詳細は[Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying)をご覧ください。
