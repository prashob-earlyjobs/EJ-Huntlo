export type GupshupWebhookSetupPayload = {
  incomingCallbackUrl: string;
  deliveryReportCallbackUrl: string;
  statusCallbackUrl: string;
  callbackUrl: string;
  instructions: string;
};

export function fallbackGupshupWebhookSetupFromApiBase(): GupshupWebhookSetupPayload {
  const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001").replace(
    /\/$/,
    ""
  );
  return {
    incomingCallbackUrl: `${base}/api/integrations/whatsapp/gupshup/webhook/incoming`,
    deliveryReportCallbackUrl: `${base}/api/integrations/whatsapp/gupshup/webhook/delivery-report`,
    statusCallbackUrl: `${base}/api/integrations/whatsapp/gupshup/webhook/status`,
    callbackUrl: `${base}/api/integrations/whatsapp/gupshup/webhook`,
    instructions:
      "In Gupshup Console: set Incoming webhook to the incoming URL; Realtime Delivery to the delivery-report URL (GET or POST).",
  };
}
