import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';

initializeApp();

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const STALE_TOKEN_ERRORS = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token'
]);

const formatAmount = (amount) => `${new Intl.NumberFormat('zh-CN').format(amount)} XOF`;
const formatBoxes = (boxes) => `${Math.round(boxes * 10) / 10} 箱`;

// Togo runs on UTC, so the UTC calendar day is the Lomé business day.
const getTogoToday = () => new Date().toISOString().slice(0, 10);

export const notifyTodaySales = onDocumentCreated(
  { document: 'customerOrderSyncs/{orderDate}', region: 'europe-west1' },
  async (event) => {
    const orderDate = event.params.orderDate;
    if (orderDate !== getTogoToday()) return;

    const db = getFirestore();
    const dayStart = new Date(`${orderDate}T00:00:00.000Z`);
    const [transactionSnap, tokenSnap] = await Promise.all([
      db.collection('transactions')
        .where('occurredAt', '>=', Timestamp.fromDate(dayStart))
        .where('occurredAt', '<', Timestamp.fromMillis(dayStart.getTime() + MS_PER_DAY))
        .get(),
      db.collection('pushTokens').get()
    ]);
    if (tokenSnap.empty) return;

    const outTransactions = transactionSnap.docs.map((snapshot) => snapshot.data()).filter((data) => data.type === 'out');
    const productIds = [...new Set(outTransactions.map((data) => data.productId))];
    const productSnaps = productIds.length > 0 ? await db.getAll(...productIds.map((id) => db.collection('products').doc(id))) : [];
    const specByProduct = new Map(productSnaps.map((snapshot) => [snapshot.id, snapshot.get('spec')]));

    let amount = 0;
    let boxes = 0;
    for (const data of outTransactions) {
      const spec = specByProduct.get(data.productId);
      amount += data.quantity * data.unitPrice;
      boxes += data.quantity / (spec > 0 ? spec : 1);
    }

    const tokens = tokenSnap.docs.map((snapshot) => snapshot.id);
    const response = await getMessaging().sendEachForMulticast({
      tokens,
      data: {
        title: '多哥今日销售',
        body: `销售总金额：${formatAmount(amount)}\n销售总箱数：${formatBoxes(boxes)}`
      },
      webpush: { headers: { Urgency: 'high' } }
    });

    const staleTokens = tokens.filter((_, index) => STALE_TOKEN_ERRORS.has(response.responses[index].error?.code));
    await Promise.all(staleTokens.map((token) => db.collection('pushTokens').doc(token).delete()));
    logger.info('Sent today sales notification', {
      orderDate,
      successCount: response.successCount,
      failureCount: response.failureCount,
      removedTokens: staleTokens.length
    });
  }
);
