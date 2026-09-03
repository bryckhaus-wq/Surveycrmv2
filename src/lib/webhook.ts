export async function triggerN8nWebhook(
  eventName: string,
  payload: any
): Promise<void> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event: eventName,
        data: payload,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error(`Failed to trigger n8n webhook for event "${eventName}":`, error);
  }
}
