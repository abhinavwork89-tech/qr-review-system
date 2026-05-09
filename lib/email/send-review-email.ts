import { Resend } from "resend";

export type SendReviewEmailInput = {
  rating: number;
  review_text: string;
  name: string;
  email: string;
  mobile: string;
};

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }
  return new Resend(apiKey);
}

export async function sendReviewEmail(data: SendReviewEmailInput) {
  try {
    const resend = getResendClient();

    const { data: response, error } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: ["abhinavwork89@gmail.com"],
      subject: "New Review Received",
      text: [
        "New Review Received",
        "",
        `Rating: ${data.rating}`,
        `Review text: ${data.review_text}`,
        `Customer name: ${data.name}`,
        `Customer email: ${data.email}`,
        `Customer mobile: ${data.mobile}`,
      ].join("\n"),
    });
    console.log("RESEND RESPONSE:", response, error);

    if (error) {
      throw new Error(error.message || "Failed to send review email");
    }

    return response;
  } catch (error) {
    console.log("SEND REVIEW EMAIL ERROR:", error);
    throw error instanceof Error
      ? error
      : new Error("Unknown error while sending review email");
  }
}
