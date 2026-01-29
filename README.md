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

### 3. 環境変数の設定

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

# Gemini API
GEMINI_API_KEY="your-gemini-api-key"

# Optional: 開発/テスト用のデフォルトStripeキー
# STRIPE_SECRET_KEY="sk_test_..."
```

#### 環境変数の生成コマンド

```bash
# AUTH_SECRETの生成
openssl rand -base64 32

# ENCRYPTION_KEYの生成
openssl rand -hex 32
```

### 4. データベースのセットアップ

Prismaのマイグレーションを実行してデータベースを作成します。

```bash
npx prisma migrate dev
```

### 5. 初期データの投入（オプション）

```bash
npm run db:seed
```

### 6. 開発サーバーの起動

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
- **AI**: Gemini API
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
