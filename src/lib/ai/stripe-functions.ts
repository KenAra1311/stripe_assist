import { Tool } from 'ollama';

export const stripeTools: Tool[] = [
  // Customer Operations
  {
    type: 'function',
    function: {
      name: 'createCustomer',
      description: '新しいStripe顧客を作成します。テストクロックに紐付ける場合はtestClockIdを指定します',
      parameters: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            description: '顧客のメールアドレス',
          },
          name: {
            type: 'string',
            description: '顧客の名前',
          },
          description: {
            type: 'string',
            description: '顧客の説明（任意）',
          },
          testClockId: {
            type: 'string',
            description: 'テストクロックID（clock_で始まる）- テストクロックに顧客を紐付ける場合に指定',
          },
        },
        required: ['email'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'listCustomers',
      description: '顧客一覧を取得します。メールアドレスでフィルタリングできます',
      parameters: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            description: 'メールアドレスでフィルタリング（任意）',
          },
          limit: {
            type: 'integer',
            description: '取得件数（1-100、デフォルト10）',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getCustomer',
      description: '顧客IDで特定の顧客情報を取得します',
      parameters: {
        type: 'object',
        properties: {
          customerId: {
            type: 'string',
            description: 'Stripe顧客ID（cus_で始まる）',
          },
        },
        required: ['customerId'],
      },
    },
  },

  // Product Operations
  {
    type: 'function',
    function: {
      name: 'createProduct',
      description: '新しい商品を作成します',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: '商品名',
          },
          description: {
            type: 'string',
            description: '商品の説明（任意）',
          },
          active: {
            type: 'boolean',
            description: '有効/無効（デフォルト: true）',
          },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'listProducts',
      description: '商品一覧を取得します',
      parameters: {
        type: 'object',
        properties: {
          active: {
            type: 'boolean',
            description: '有効な商品のみ取得（任意）',
          },
          limit: {
            type: 'integer',
            description: '取得件数（1-100、デフォルト10）',
          },
        },
      },
    },
  },

  // Price Operations
  {
    type: 'function',
    function: {
      name: 'createPrice',
      description: '商品の価格を作成します（一括払いまたはサブスクリプション）',
      parameters: {
        type: 'object',
        properties: {
          productId: {
            type: 'string',
            description: '商品ID（prod_で始まる）',
          },
          unitAmount: {
            type: 'integer',
            description: '金額（最小通貨単位、例: 円なら円単位）',
          },
          currency: {
            type: 'string',
            description: '通貨コード（例: jpy, usd）デフォルト: jpy',
          },
          recurringInterval: {
            type: 'string',
            description: 'サブスクリプションの請求間隔: day, week, month, year（任意、指定なしで一括払い）',
          },
          recurringIntervalCount: {
            type: 'integer',
            description: 'サブスクリプションの請求間隔の回数（デフォルト: 1）',
          },
          nickname: {
            type: 'string',
            description: '価格のニックネーム（任意）',
          },
        },
        required: ['productId', 'unitAmount'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'listPrices',
      description: '価格一覧を取得します',
      parameters: {
        type: 'object',
        properties: {
          productId: {
            type: 'string',
            description: '商品IDでフィルタリング（任意）',
          },
          active: {
            type: 'boolean',
            description: '有効な価格のみ取得（任意）',
          },
          limit: {
            type: 'integer',
            description: '取得件数（1-100、デフォルト10）',
          },
        },
      },
    },
  },

  // Subscription Operations
  {
    type: 'function',
    function: {
      name: 'createSubscription',
      description: '顧客のサブスクリプションを作成します',
      parameters: {
        type: 'object',
        properties: {
          customerId: {
            type: 'string',
            description: '顧客ID',
          },
          priceId: {
            type: 'string',
            description: '価格ID',
          },
          trialPeriodDays: {
            type: 'integer',
            description: 'トライアル期間（日数、任意）',
          },
          couponId: {
            type: 'string',
            description: '適用するクーポンID（任意）',
          },
        },
        required: ['customerId', 'priceId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'listSubscriptions',
      description: 'サブスクリプション一覧を取得します',
      parameters: {
        type: 'object',
        properties: {
          customerId: {
            type: 'string',
            description: '顧客IDでフィルタリング（任意）',
          },
          status: {
            type: 'string',
            description: 'ステータスでフィルタリング: active, canceled, past_due等（任意）',
          },
          limit: {
            type: 'integer',
            description: '取得件数（1-100、デフォルト10）',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancelSubscription',
      description: 'サブスクリプションをキャンセルします',
      parameters: {
        type: 'object',
        properties: {
          subscriptionId: {
            type: 'string',
            description: 'サブスクリプションID',
          },
          cancelAtPeriodEnd: {
            type: 'boolean',
            description: '期間終了時にキャンセル（true）か即時キャンセル（false）',
          },
        },
        required: ['subscriptionId'],
      },
    },
  },

  // Coupon Operations
  {
    type: 'function',
    function: {
      name: 'createCoupon',
      description: '割引クーポンを作成します',
      parameters: {
        type: 'object',
        properties: {
          percentOff: {
            type: 'number',
            description: '割引率（1-100%）。amountOffと排他',
          },
          amountOff: {
            type: 'integer',
            description: '固定割引額。percentOffと排他',
          },
          currency: {
            type: 'string',
            description: 'amountOff使用時の通貨（デフォルト: jpy）',
          },
          duration: {
            type: 'string',
            description: '適用期間: once（一回）, repeating（複数回）, forever（永続）',
          },
          durationInMonths: {
            type: 'integer',
            description: 'duration=repeating時の月数',
          },
          name: {
            type: 'string',
            description: 'クーポン名（任意）',
          },
          maxRedemptions: {
            type: 'integer',
            description: '最大使用回数（任意）',
          },
        },
        required: ['duration'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'listCoupons',
      description: 'クーポン一覧を取得します',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'integer',
            description: '取得件数（1-100、デフォルト10）',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'deleteCoupon',
      description: 'クーポンを削除します',
      parameters: {
        type: 'object',
        properties: {
          couponId: {
            type: 'string',
            description: 'クーポンID',
          },
        },
        required: ['couponId'],
      },
    },
  },

  // Invoice Preview (Simulation)
  {
    type: 'function',
    function: {
      name: 'previewInvoice',
      description: '【シミュレーション】請求書のプレビューを取得します。クーポン適用後の金額を確認できます',
      parameters: {
        type: 'object',
        properties: {
          customerId: {
            type: 'string',
            description: '顧客ID',
          },
          subscriptionId: {
            type: 'string',
            description: '既存のサブスクリプションID（任意）',
          },
          priceId: {
            type: 'string',
            description: '新規サブスクリプション用の価格ID（任意）',
          },
          couponId: {
            type: 'string',
            description: 'シミュレートするクーポンID（任意）',
          },
        },
        required: ['customerId'],
      },
    },
  },

  // Subscription Preview (Simulation)
  {
    type: 'function',
    function: {
      name: 'previewSubscription',
      description: '【シミュレーション】サブスクリプションの費用をプレビューします。実際にデータは作成されません',
      parameters: {
        type: 'object',
        properties: {
          customerId: {
            type: 'string',
            description: '顧客ID',
          },
          priceId: {
            type: 'string',
            description: '価格ID',
          },
          couponId: {
            type: 'string',
            description: 'シミュレートするクーポンID（任意）',
          },
        },
        required: ['customerId', 'priceId'],
      },
    },
  },

  // Test Clock Operations
  {
    type: 'function',
    function: {
      name: 'createTestClock',
      description: 'テストクロックを作成します。時間を固定して、サブスクリプションのライフサイクルをテストできます',
      parameters: {
        type: 'object',
        properties: {
          frozenTime: {
            type: 'string',
            description: '固定する時刻（ISO 8601形式、例: 2024-01-15T00:00:00Z）または Unix タイムスタンプ',
          },
          name: {
            type: 'string',
            description: 'テストクロックの名前（任意）',
          },
        },
        required: ['frozenTime'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getTestClock',
      description: 'テストクロックの詳細を取得します',
      parameters: {
        type: 'object',
        properties: {
          testClockId: {
            type: 'string',
            description: 'テストクロックID（clock_で始まる）',
          },
        },
        required: ['testClockId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'listTestClocks',
      description: 'テストクロック一覧を取得します',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'integer',
            description: '取得件数（1-100、デフォルト10）',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'advanceTestClock',
      description: 'テストクロックの時刻を進めます。関連するサブスクリプションも自動的に更新されます',
      parameters: {
        type: 'object',
        properties: {
          testClockId: {
            type: 'string',
            description: 'テストクロックID',
          },
          frozenTime: {
            type: 'string',
            description: '進める先の時刻（ISO 8601形式、例: 2024-02-15T00:00:00Z）または Unix タイムスタンプ。現在の時刻より未来である必要があります',
          },
        },
        required: ['testClockId', 'frozenTime'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'deleteTestClock',
      description: 'テストクロックを削除します。関連する顧客・サブスクリプションも削除されます',
      parameters: {
        type: 'object',
        properties: {
          testClockId: {
            type: 'string',
            description: 'テストクロックID',
          },
        },
        required: ['testClockId'],
      },
    },
  },

  // Payment Method Operations
  {
    type: 'function',
    function: {
      name: 'createPaymentMethod',
      description: 'テスト用のカード支払い方法を作成します。テストモードでのみ使用可能です',
      parameters: {
        type: 'object',
        properties: {
          cardNumber: {
            type: 'string',
            description: 'テストカード番号（例: 4242424242424242）',
          },
          expMonth: {
            type: 'integer',
            description: 'カードの有効期限（月）1-12',
          },
          expYear: {
            type: 'integer',
            description: 'カードの有効期限（年）例: 2025',
          },
          cvc: {
            type: 'string',
            description: 'CVC（例: 123）',
          },
        },
        required: ['cardNumber', 'expMonth', 'expYear', 'cvc'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'attachPaymentMethod',
      description: '支払い方法を顧客に紐付けます',
      parameters: {
        type: 'object',
        properties: {
          paymentMethodId: {
            type: 'string',
            description: '支払い方法ID（pm_で始まる）',
          },
          customerId: {
            type: 'string',
            description: '顧客ID（cus_で始まる）',
          },
        },
        required: ['paymentMethodId', 'customerId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'listPaymentMethods',
      description: '顧客の支払い方法一覧を取得します',
      parameters: {
        type: 'object',
        properties: {
          customerId: {
            type: 'string',
            description: '顧客ID',
          },
          type: {
            type: 'string',
            description: '支払い方法のタイプ（card, bank_transfer等）デフォルト: card',
          },
          limit: {
            type: 'integer',
            description: '取得件数（1-100、デフォルト10）',
          },
        },
        required: ['customerId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'detachPaymentMethod',
      description: '支払い方法を顧客から切り離します',
      parameters: {
        type: 'object',
        properties: {
          paymentMethodId: {
            type: 'string',
            description: '支払い方法ID',
          },
        },
        required: ['paymentMethodId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'setDefaultPaymentMethod',
      description: '顧客のデフォルト支払い方法を設定します',
      parameters: {
        type: 'object',
        properties: {
          customerId: {
            type: 'string',
            description: '顧客ID',
          },
          paymentMethodId: {
            type: 'string',
            description: 'デフォルトに設定する支払い方法ID',
          },
        },
        required: ['customerId', 'paymentMethodId'],
      },
    },
  },
];
