import Stripe from 'stripe';

// Stripe Dashboard base URL (test mode)
const DASHBOARD_BASE = 'https://dashboard.stripe.com/test';

export type FunctionHandler = (
  stripe: Stripe,
  args: Record<string, unknown>
) => Promise<unknown>;

export const functionHandlers: Record<string, FunctionHandler> = {
  // Customer Operations
  createCustomer: async (stripe, args) => {
    const customerParams: Stripe.CustomerCreateParams = {
      email: args.email as string,
      name: args.name as string | undefined,
      description: args.description as string | undefined,
      metadata: args.metadata as Record<string, string> | undefined,
    };

    if (args.testClockId) {
      customerParams.test_clock = args.testClockId as string;
    }

    const customer = await stripe.customers.create(customerParams);

    return {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      created: new Date(customer.created * 1000).toISOString(),
      testClock: customer.test_clock || null,
      dashboardUrl: `${DASHBOARD_BASE}/customers/${customer.id}`,
    };
  },

  listCustomers: async (stripe, args) => {
    const customers = await stripe.customers.list({
      email: args.email as string | undefined,
      limit: (args.limit as number) || 10,
    });
    return customers.data.map((c) => ({
      id: c.id,
      email: c.email,
      name: c.name,
      created: new Date(c.created * 1000).toISOString(),
      dashboardUrl: `${DASHBOARD_BASE}/customers/${c.id}`,
    }));
  },

  getCustomer: async (stripe, args) => {
    const customer = await stripe.customers.retrieve(args.customerId as string);
    if (customer.deleted) {
      return { error: '顧客は削除されています' };
    }
    return {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      description: customer.description,
      created: new Date(customer.created * 1000).toISOString(),
      testClock: customer.test_clock || null,
      dashboardUrl: `${DASHBOARD_BASE}/customers/${customer.id}`,
    };
  },

  // Product Operations
  createProduct: async (stripe, args) => {
    const product = await stripe.products.create({
      name: args.name as string,
      description: args.description as string | undefined,
      active: args.active !== false,
    });
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      active: product.active,
      dashboardUrl: `${DASHBOARD_BASE}/products/${product.id}`,
    };
  },

  listProducts: async (stripe, args) => {
    const products = await stripe.products.list({
      active: args.active as boolean | undefined,
      limit: (args.limit as number) || 10,
    });
    return products.data.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      active: p.active,
      dashboardUrl: `${DASHBOARD_BASE}/products/${p.id}`,
    }));
  },

  // Price Operations
  createPrice: async (stripe, args) => {
    const recurringInterval = args.recurringInterval as string | undefined;
    const recurringIntervalCount = args.recurringIntervalCount as number | undefined;

    const price = await stripe.prices.create({
      product: args.productId as string,
      unit_amount: args.unitAmount as number,
      currency: (args.currency as string) || 'jpy',
      recurring: recurringInterval
        ? {
            interval: recurringInterval as Stripe.PriceCreateParams.Recurring.Interval,
            interval_count: recurringIntervalCount || 1,
          }
        : undefined,
      nickname: args.nickname as string | undefined,
    });

    return {
      id: price.id,
      unitAmount: price.unit_amount,
      currency: price.currency,
      recurring: price.recurring
        ? {
            interval: price.recurring.interval,
            intervalCount: price.recurring.interval_count,
          }
        : null,
      nickname: price.nickname,
      dashboardUrl: `${DASHBOARD_BASE}/prices/${price.id}`,
    };
  },

  listPrices: async (stripe, args) => {
    const prices = await stripe.prices.list({
      product: args.productId as string | undefined,
      active: args.active as boolean | undefined,
      limit: (args.limit as number) || 10,
      expand: ['data.product'],
    });

    return prices.data.map((p) => ({
      id: p.id,
      unitAmount: p.unit_amount,
      currency: p.currency,
      recurring: p.recurring
        ? {
            interval: p.recurring.interval,
            intervalCount: p.recurring.interval_count,
          }
        : null,
      nickname: p.nickname,
      productName:
        typeof p.product === 'object' && p.product !== null
          ? (p.product as Stripe.Product).name
          : null,
      dashboardUrl: `${DASHBOARD_BASE}/prices/${p.id}`,
    }));
  },

  // Subscription Operations
  createSubscription: async (stripe, args) => {
    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: args.customerId as string,
      items: [{ price: args.priceId as string }],
    };

    if (args.trialPeriodDays) {
      subscriptionParams.trial_period_days = args.trialPeriodDays as number;
    }

    if (args.couponId) {
      subscriptionParams.discounts = [{ coupon: args.couponId as string }];
    }

    const subscription = await stripe.subscriptions.create(subscriptionParams) as unknown as Record<string, unknown>;

    return {
      id: subscription.id,
      status: subscription.status,
      currentPeriodStart: subscription.current_period_start
        ? new Date((subscription.current_period_start as number) * 1000).toISOString()
        : null,
      currentPeriodEnd: subscription.current_period_end
        ? new Date((subscription.current_period_end as number) * 1000).toISOString()
        : null,
      trialEnd: subscription.trial_end
        ? new Date((subscription.trial_end as number) * 1000).toISOString()
        : null,
      dashboardUrl: `${DASHBOARD_BASE}/subscriptions/${subscription.id}`,
    };
  },

  listSubscriptions: async (stripe, args) => {
    const params: Stripe.SubscriptionListParams = {
      limit: (args.limit as number) || 10,
    };

    if (args.customerId) {
      params.customer = args.customerId as string;
    }

    if (args.status) {
      params.status = args.status as Stripe.SubscriptionListParams.Status;
    }

    const subscriptions = await stripe.subscriptions.list(params);

    return subscriptions.data.map((s) => {
      const sub = s as unknown as Record<string, unknown>;
      return {
        id: sub.id,
        status: sub.status,
        currentPeriodStart: sub.current_period_start
          ? new Date((sub.current_period_start as number) * 1000).toISOString()
          : null,
        currentPeriodEnd: sub.current_period_end
          ? new Date((sub.current_period_end as number) * 1000).toISOString()
          : null,
        dashboardUrl: `${DASHBOARD_BASE}/subscriptions/${sub.id}`,
      };
    });
  },

  cancelSubscription: async (stripe, args) => {
    const subscription = await stripe.subscriptions.update(
      args.subscriptionId as string,
      {
        cancel_at_period_end: args.cancelAtPeriodEnd !== false,
      }
    ) as unknown as Record<string, unknown>;

    if (args.cancelAtPeriodEnd === false) {
      const canceledSubscription = await stripe.subscriptions.cancel(
        args.subscriptionId as string
      ) as unknown as Record<string, unknown>;
      return {
        id: canceledSubscription.id,
        status: canceledSubscription.status,
        canceledAt: canceledSubscription.canceled_at
          ? new Date((canceledSubscription.canceled_at as number) * 1000).toISOString()
          : null,
        dashboardUrl: `${DASHBOARD_BASE}/subscriptions/${canceledSubscription.id}`,
      };
    }

    return {
      id: subscription.id,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      cancelAt: subscription.cancel_at
        ? new Date((subscription.cancel_at as number) * 1000).toISOString()
        : null,
      dashboardUrl: `${DASHBOARD_BASE}/subscriptions/${subscription.id}`,
    };
  },

  // Coupon Operations
  createCoupon: async (stripe, args) => {
    const couponParams: Stripe.CouponCreateParams = {
      duration: args.duration as Stripe.CouponCreateParams.Duration,
    };

    if (args.percentOff) {
      couponParams.percent_off = args.percentOff as number;
    } else if (args.amountOff) {
      couponParams.amount_off = args.amountOff as number;
      couponParams.currency = (args.currency as string) || 'jpy';
    }

    if (args.durationInMonths) {
      couponParams.duration_in_months = args.durationInMonths as number;
    }

    if (args.name) {
      couponParams.name = args.name as string;
    }

    if (args.maxRedemptions) {
      couponParams.max_redemptions = args.maxRedemptions as number;
    }

    const coupon = await stripe.coupons.create(couponParams);

    return {
      id: coupon.id,
      name: coupon.name,
      percentOff: coupon.percent_off,
      amountOff: coupon.amount_off,
      currency: coupon.currency,
      duration: coupon.duration,
      durationInMonths: coupon.duration_in_months,
      dashboardUrl: `${DASHBOARD_BASE}/coupons/${coupon.id}`,
    };
  },

  listCoupons: async (stripe, args) => {
    const coupons = await stripe.coupons.list({
      limit: (args.limit as number) || 10,
    });

    return coupons.data.map((c) => ({
      id: c.id,
      name: c.name,
      percentOff: c.percent_off,
      amountOff: c.amount_off,
      currency: c.currency,
      duration: c.duration,
      valid: c.valid,
      dashboardUrl: `${DASHBOARD_BASE}/coupons/${c.id}`,
    }));
  },

  deleteCoupon: async (stripe, args) => {
    const deleted = await stripe.coupons.del(args.couponId as string);
    return {
      id: deleted.id,
      deleted: deleted.deleted,
    };
  },

  // Invoice Preview (Simulation)
  previewInvoice: async (stripe, args) => {
    const params: Stripe.InvoiceCreatePreviewParams = {
      customer: args.customerId as string,
    };

    if (args.subscriptionId) {
      params.subscription = args.subscriptionId as string;
    }

    if (args.priceId) {
      params.subscription_details = {
        items: [{ price: args.priceId as string }],
      };
    }

    if (args.couponId) {
      params.discounts = [{ coupon: args.couponId as string }];
    }

    const invoiceData = await stripe.invoices.createPreview(params) as unknown as Record<string, unknown>;

    // Extract discount info if available
    const discounts = invoiceData.discounts as Array<Record<string, unknown>> | undefined;
    const firstDiscount = discounts && discounts.length > 0 ? discounts[0] : null;

    return {
      subtotal: invoiceData.subtotal,
      total: invoiceData.total,
      amountDue: invoiceData.amount_due,
      currency: invoiceData.currency,
      discount: firstDiscount
        ? {
            couponId: (firstDiscount.coupon as Record<string, unknown>)?.id || null,
            couponName: (firstDiscount.coupon as Record<string, unknown>)?.name || null,
            percentOff: (firstDiscount.coupon as Record<string, unknown>)?.percent_off || null,
            amountOff: (firstDiscount.coupon as Record<string, unknown>)?.amount_off || null,
          }
        : null,
      lines: ((invoiceData.lines as Record<string, unknown>)?.data as Array<Record<string, unknown>> || []).map((line) => ({
        description: line.description,
        amount: line.amount,
        quantity: line.quantity,
      })),
      customerDashboardUrl: `${DASHBOARD_BASE}/customers/${args.customerId}`,
    };
  },

  // Subscription Preview (Simulation)
  previewSubscription: async (stripe, args) => {
    const params: Stripe.InvoiceCreatePreviewParams = {
      customer: args.customerId as string,
      subscription_details: {
        items: [{ price: args.priceId as string }],
      },
    };

    if (args.couponId) {
      params.discounts = [{ coupon: args.couponId as string }];
    }

    const invoiceData = await stripe.invoices.createPreview(params) as unknown as Record<string, unknown>;

    // Extract discount info if available
    const discounts = invoiceData.discounts as Array<Record<string, unknown>> | undefined;
    const firstDiscount = discounts && discounts.length > 0 ? discounts[0] : null;

    return {
      message: 'シミュレーション結果（実際のサブスクリプションは作成されていません）',
      subtotal: invoiceData.subtotal,
      total: invoiceData.total,
      currency: invoiceData.currency,
      discount: firstDiscount
        ? {
            couponId: (firstDiscount.coupon as Record<string, unknown>)?.id || null,
            couponName: (firstDiscount.coupon as Record<string, unknown>)?.name || null,
            percentOff: (firstDiscount.coupon as Record<string, unknown>)?.percent_off || null,
            amountOff: (firstDiscount.coupon as Record<string, unknown>)?.amount_off || null,
          }
        : null,
      lines: ((invoiceData.lines as Record<string, unknown>)?.data as Array<Record<string, unknown>> || []).map((line) => ({
        description: line.description,
        amount: line.amount,
      })),
      customerDashboardUrl: `${DASHBOARD_BASE}/customers/${args.customerId}`,
    };
  },

  // Test Clock Operations
  createTestClock: async (stripe, args) => {
    const frozenTimeInput = args.frozenTime as string;
    // Parse ISO 8601 or Unix timestamp
    let frozenTime: number;
    if (/^\d+$/.test(frozenTimeInput)) {
      frozenTime = parseInt(frozenTimeInput, 10);
    } else {
      frozenTime = Math.floor(new Date(frozenTimeInput).getTime() / 1000);
    }

    const testClock = await stripe.testHelpers.testClocks.create({
      frozen_time: frozenTime,
      name: args.name as string | undefined,
    });

    return {
      id: testClock.id,
      name: testClock.name,
      frozenTime: new Date(testClock.frozen_time * 1000).toISOString(),
      status: testClock.status,
      created: new Date(testClock.created * 1000).toISOString(),
      dashboardUrl: `${DASHBOARD_BASE}/test-clocks/${testClock.id}`,
      hint: 'このテストクロックに顧客を紐付けるには、顧客作成時に testClockId を指定してください',
    };
  },

  getTestClock: async (stripe, args) => {
    const testClock = await stripe.testHelpers.testClocks.retrieve(
      args.testClockId as string
    );

    return {
      id: testClock.id,
      name: testClock.name,
      frozenTime: new Date(testClock.frozen_time * 1000).toISOString(),
      status: testClock.status,
      created: new Date(testClock.created * 1000).toISOString(),
      dashboardUrl: `${DASHBOARD_BASE}/test-clocks/${testClock.id}`,
    };
  },

  listTestClocks: async (stripe, args) => {
    const testClocks = await stripe.testHelpers.testClocks.list({
      limit: (args.limit as number) || 10,
    });

    return testClocks.data.map((tc) => ({
      id: tc.id,
      name: tc.name,
      frozenTime: new Date(tc.frozen_time * 1000).toISOString(),
      status: tc.status,
      created: new Date(tc.created * 1000).toISOString(),
      dashboardUrl: `${DASHBOARD_BASE}/test-clocks/${tc.id}`,
    }));
  },

  advanceTestClock: async (stripe, args) => {
    const frozenTimeInput = args.frozenTime as string;
    // Parse ISO 8601 or Unix timestamp
    let frozenTime: number;
    if (/^\d+$/.test(frozenTimeInput)) {
      frozenTime = parseInt(frozenTimeInput, 10);
    } else {
      frozenTime = Math.floor(new Date(frozenTimeInput).getTime() / 1000);
    }

    const testClock = await stripe.testHelpers.testClocks.advance(
      args.testClockId as string,
      { frozen_time: frozenTime }
    );

    return {
      id: testClock.id,
      name: testClock.name,
      frozenTime: new Date(testClock.frozen_time * 1000).toISOString(),
      status: testClock.status,
      message: `テストクロックを ${new Date(frozenTime * 1000).toISOString()} まで進めました`,
      dashboardUrl: `${DASHBOARD_BASE}/test-clocks/${testClock.id}`,
    };
  },

  deleteTestClock: async (stripe, args) => {
    const deleted = await stripe.testHelpers.testClocks.del(
      args.testClockId as string
    );

    return {
      id: deleted.id,
      deleted: deleted.deleted,
      message: 'テストクロックと関連する全てのデータが削除されました',
    };
  },

  // Payment Method Operations
  createPaymentMethod: async (stripe, args) => {
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: args.cardNumber as string,
        exp_month: args.expMonth as number,
        exp_year: args.expYear as number,
        cvc: args.cvc as string,
      },
    });

    const card = paymentMethod.card;
    return {
      id: paymentMethod.id,
      type: paymentMethod.type,
      card: card
        ? {
            brand: card.brand,
            last4: card.last4,
            expMonth: card.exp_month,
            expYear: card.exp_year,
          }
        : null,
      created: new Date(paymentMethod.created * 1000).toISOString(),
      hint: 'この支払い方法を顧客に紐付けるには attachPaymentMethod を使用してください',
    };
  },

  attachPaymentMethod: async (stripe, args) => {
    const paymentMethod = await stripe.paymentMethods.attach(
      args.paymentMethodId as string,
      { customer: args.customerId as string }
    );

    const card = paymentMethod.card;
    return {
      id: paymentMethod.id,
      type: paymentMethod.type,
      customerId: paymentMethod.customer,
      card: card
        ? {
            brand: card.brand,
            last4: card.last4,
            expMonth: card.exp_month,
            expYear: card.exp_year,
          }
        : null,
      message: '支払い方法を顧客に紐付けました',
      dashboardUrl: `${DASHBOARD_BASE}/customers/${args.customerId}`,
    };
  },

  listPaymentMethods: async (stripe, args) => {
    const paymentMethods = await stripe.customers.listPaymentMethods(
      args.customerId as string,
      {
        type: (args.type as Stripe.CustomerListPaymentMethodsParams.Type) || 'card',
        limit: (args.limit as number) || 10,
      }
    );

    return paymentMethods.data.map((pm) => {
      const card = pm.card;
      return {
        id: pm.id,
        type: pm.type,
        card: card
          ? {
              brand: card.brand,
              last4: card.last4,
              expMonth: card.exp_month,
              expYear: card.exp_year,
            }
          : null,
        created: new Date(pm.created * 1000).toISOString(),
      };
    });
  },

  detachPaymentMethod: async (stripe, args) => {
    const paymentMethod = await stripe.paymentMethods.detach(
      args.paymentMethodId as string
    );

    return {
      id: paymentMethod.id,
      type: paymentMethod.type,
      message: '支払い方法を顧客から切り離しました',
    };
  },

  setDefaultPaymentMethod: async (stripe, args) => {
    const customer = await stripe.customers.update(args.customerId as string, {
      invoice_settings: {
        default_payment_method: args.paymentMethodId as string,
      },
    });

    return {
      customerId: customer.id,
      defaultPaymentMethod: customer.invoice_settings?.default_payment_method,
      message: 'デフォルトの支払い方法を設定しました',
      dashboardUrl: `${DASHBOARD_BASE}/customers/${customer.id}`,
    };
  },
};
