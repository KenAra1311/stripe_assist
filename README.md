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

### 3. Ollama のセットアップ（ローカル AI）

このアプリケーションは Ollama を使用してローカルで AI チャット機能を提供します。

#### Ollama のインストール

**macOS / Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:**
[Ollama 公式サイト](https://ollama.com/download)からインストーラーをダウンロードしてください。

#### モデルのダウンロード

Ollama でツール呼び出しをサポートするモデルをダウンロードします。推奨モデル：

```bash
# 推奨: Llama 3.1 (ツール呼び出しサポート)
ollama pull llama3.1

# または他の対応モデル
ollama pull llama3.2
ollama pull mistral
ollama pull qwen2.5
```

#### Ollama サーバーの起動

Ollama は通常バックグラウンドで自動起動しますが、手動で起動する場合：

```bash
ollama serve
```

サーバーが起動したら、`http://localhost:11434` でアクセス可能になります。

#### 起動確認

```bash
# Ollama が起動しているか確認
curl http://localhost:11434

# インストール済みモデルの確認
ollama list
```

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

# Ollama設定（ローカルAI）
# Ollamaサーバーのホスト（デフォルトのまま使用可能）
OLLAMA_HOST="http://localhost:11434"

# 使用するモデル（ツール呼び出しをサポートするモデル）
# 推奨: llama3.1, llama3.2, mistral, qwen2.5
OLLAMA_MODEL="llama3.1"
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
- **AI**: Ollama（ローカルLLM）
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
