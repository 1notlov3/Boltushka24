import webPush, { WebPushError } from "web-push";

import { db } from "@/lib/db";

type PushPayload = {
  title: string;
  body: string;
  url: string;
};

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

let configured = false;

export function isWebPushEnabled() {
  return !!publicKey && !!privateKey && !!subject;
}

export function getVapidPublicKey() {
  return publicKey ?? null;
}

function configureWebPush() {
  if (configured || !isWebPushEnabled()) return;

  webPush.setVapidDetails(subject, publicKey!, privateKey!);
  configured = true;
}

function isGone(error: unknown) {
  return error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410);
}

export async function sendPushNotification(profileId: string, payload: PushPayload) {
  if (!isWebPushEnabled()) return;

  configureWebPush();

  const subscriptions = await db.pushSubscription.findMany({
    where: { profileId },
    select: {
      id: true,
      endpoint: true,
      keysAuth: true,
      keysP256dh: true,
    },
  });

  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webPush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            auth: subscription.keysAuth,
            p256dh: subscription.keysP256dh,
          },
        },
        JSON.stringify(payload),
      );
    } catch (error) {
      if (isGone(error)) {
        await db.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => undefined);
      } else {
        console.error("[WEB_PUSH_SEND]", error);
      }
    }
  }));
}

export function notificationPushPayload(input: {
  title: string;
  preview?: string | null;
  url: string;
}) {
  return {
    title: input.title,
    body: input.preview?.slice(0, 160) || "Новое уведомление",
    url: input.url,
  };
}
