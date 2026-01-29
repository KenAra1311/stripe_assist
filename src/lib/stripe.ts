import Stripe from 'stripe';
import { prisma } from './prisma';
import { decrypt } from './encryption';

export async function getStripeClient(organizationId: string): Promise<Stripe | null> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      stripeSecretKey: true,
      stripeKeyIv: true,
    },
  });

  if (!organization?.stripeSecretKey || !organization?.stripeKeyIv) {
    return null;
  }

  const secretKey = decrypt(organization.stripeSecretKey, organization.stripeKeyIv);

  return new Stripe(secretKey, {
    apiVersion: '2026-01-28.clover',
  });
}

export async function getStripeSecretKey(organizationId: string): Promise<string | null> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      stripeSecretKey: true,
      stripeKeyIv: true,
    },
  });

  if (!organization?.stripeSecretKey || !organization?.stripeKeyIv) {
    return null;
  }

  return decrypt(organization.stripeSecretKey, organization.stripeKeyIv);
}
