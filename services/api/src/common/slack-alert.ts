export async function alertarSlack(message: string): Promise<void> {
  const webhookUrl = process.env["SLACK_WEBHOOK_URL"];
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });
  } catch {
    // Slack alerting is best-effort — never throw
  }
}
