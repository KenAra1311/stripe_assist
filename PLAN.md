# Implementation Plan: Migrate from Ollama to Gemini API

## Background

This plan outlines the migration from the local Ollama LLM server to Google's cloud-based Gemini API for the Stripe assistant application.

## User Configuration

- **API Key**: ✓ User already has Gemini API key
- **Model**: `gemini-2.5-flash` (recommended)
- **Tier**: Free tier (15 RPM, 1,500 RPD)

## Implementation Steps

### Step 1: Update Dependencies

```bash
npm uninstall ollama
npm install @google/genai
```

### Step 2: Update Environment Variables

**File**: `.env.example`

```env
# Replace OLLAMA_* with:
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-2.5-flash"
```

**Action**: Add `GEMINI_API_KEY` to your `.env` file.

### Step 3: Update AI Client

**File**: [src/lib/ai/client.ts](src/lib/ai/client.ts)

Replace Ollama client with Gemini client:

```typescript
import { GoogleGenAI } from '@google/genai';

let geminiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

export function getModelName(): string {
  return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
}
```

### Step 4: Update Tool Definitions

**File**: [src/lib/ai/stripe-functions.ts](src/lib/ai/stripe-functions.ts)

Convert from Ollama format to Gemini format:

**Before**:
```typescript
export const stripeTools: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'createCustomer',
      description: '...',
      parameters: {...}
    }
  }
]
```

**After**:
```typescript
export const stripeTools = {
  functionDeclarations: [
    {
      name: 'createCustomer',
      description: '...',
      parameters: {...}  // Same JSON Schema
    }
    // ... all other functions
  ]
};
```

### Step 5: Update Chat Processing

**File**: [src/lib/ai/chat.ts](src/lib/ai/chat.ts)

Key changes:
1. Import `getGeminiClient` instead of `getOllamaClient`
2. Convert message format to Gemini structure
3. Update API call to `gemini.models.generateContent()`
4. Handle function calls via `parts` array
5. Change role `assistant` → `model`

**Message Format**:
```typescript
// Prepend system prompt to first user message
const geminiContents = [
  {
    role: 'user' as const,
    parts: [{ text: `${getSystemPrompt(mode)}\n\n${messages[0]?.content || ''}` }]
  },
  ...messages.slice(1).map((m) => ({
    role: m.role === 'user' ? ('user' as const) : ('model' as const),
    parts: [{ text: m.content }]
  }))
];
```

**API Call**:
```typescript
const response = await gemini.models.generateContent({
  model: modelName,
  contents: geminiContents,
  tools: [stripeTools]
});
```

**Function Call Handling**:
```typescript
const parts = response.candidates?.[0]?.content?.parts;
const functionCalls = parts.filter((part) => part.functionCall);

if (functionCalls.length > 0) {
  // Add model response
  geminiContents.push({ role: 'model' as const, parts });

  // Execute functions
  const functionResponseParts = [];
  for (const part of functionCalls) {
    const result = await handler(stripe, part.functionCall.args || {});
    functionResponseParts.push({
      functionResponse: {
        name: part.functionCall.name,
        response: result
      }
    });
  }

  // Add responses as 'user' role (required by Gemini)
  geminiContents.push({
    role: 'user' as const,
    parts: functionResponseParts
  });

  continue; // Loop for next response
}
```

### Step 6: Update Error Handling

**File**: [src/app/api/chat/route.ts](src/app/api/chat/route.ts)

Replace Ollama errors with Gemini errors:

```typescript
// API key issues
if (errorMessage.includes('API key') || errorMessage.includes('GEMINI_API_KEY')) {
  return NextResponse.json({
    error: 'Gemini APIキーが設定されていないか無効です。',
    hint: '環境変数 GEMINI_API_KEY を設定してください。'
  }, { status: 401 });
}

// Rate limiting (15 RPM for free tier)
if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
  return NextResponse.json({
    error: 'APIのレート制限に達しました。',
    hint: 'Gemini APIの無料枠は1分あたり15リクエストです。'
  }, { status: 429 });
}

// Safety filters
if (errorMessage.includes('SAFETY') || errorMessage.includes('blocked')) {
  return NextResponse.json({
    error: 'コンテンツが安全性フィルターによってブロックされました。',
    hint: '別の表現で試してください。'
  }, { status: 400 });
}
```

### Step 7: Update Documentation

**File**: [README.md](README.md)

Replace Ollama setup instructions with Gemini API setup:
- Remove `ollama serve` and `ollama pull` instructions
- Add Gemini API key acquisition steps (https://aistudio.google.com/apikey)
- Update environment variable documentation

## Testing Checklist

- [ ] Basic chat works with Japanese responses
- [ ] Single function call: "顧客一覧を取得してください"
- [ ] Multi-step: "顧客を作成し、その顧客情報を取得"
- [ ] Error handling works for invalid requests
- [ ] Conversation history maintained across turns
- [ ] Rate limiting handled gracefully

## Files to Modify

1. [package.json](package.json) - Dependencies
2. [.env.example](.env.example) - Environment variables
3. [src/lib/ai/client.ts](src/lib/ai/client.ts) - Client initialization
4. [src/lib/ai/stripe-functions.ts](src/lib/ai/stripe-functions.ts) - Tool format
5. [src/lib/ai/chat.ts](src/lib/ai/chat.ts) - Chat processing (most complex)
6. [src/app/api/chat/route.ts](src/app/api/chat/route.ts) - Error handling
7. [README.md](README.md) - Documentation

## Important Notes

- **API Key Security**: Never commit `.env` with actual key
- **Rate Limits**: 15 RPM, 1,500 RPD on free tier
- **System Prompt**: Gemini has no `system` role - prepend to first user message
- **Function Responses**: Must use `role: 'user'` not `tool`
- **Model**: Using `gemini-2.5-flash` (Gemini 2.0 deprecated)

## Estimated Time

- Steps 1-4: 2 hours (setup and simple conversions)
- Step 5: 2-3 hours (complex chat logic)
- Steps 6-7: 1 hour (error handling and docs)
- Testing: 1-2 hours

**Total**: 6-8 hours
