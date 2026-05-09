import { logger } from "../lib/logger";

export interface OrderJob {
  orderId: number;
  userId: number;
  total: number;
}

export async function processOrderJob(job: OrderJob): Promise<void> {
  logger.info({ orderId: job.orderId }, "Processing order job");
  await new Promise((resolve) => setTimeout(resolve, 100));
  logger.info({ orderId: job.orderId }, "Order job processed");
}

export async function processEmailNotification(job: { userId: number; email: string; subject: string; body: string }): Promise<void> {
  logger.info({ userId: job.userId, subject: job.subject }, "Sending email notification (mock)");
}

export async function processLowStockAlert(job: { productId: number; productName: string; stock: number }): Promise<void> {
  logger.info({ productId: job.productId, stock: job.stock }, "Low stock alert processed");
}
