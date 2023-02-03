import { hexStrArrToStr, toAddress } from './utils';
import type { CheckpointWriter } from '@snapshot-labs/checkpoint';

export async function handleDeploy() {
  // Run logic as at the time Contract was deployed.
}

// Function that will get called on every deposit event
export const handleDeposit: CheckpointWriter = async ({ block, tx, rawEvent, event, mysql }) => {
  if (!rawEvent || !event) return;

  // Compute the amount
  const bigAmount = BigInt(event.amount.high) * BigInt(2) ** BigInt(128) + BigInt(event.amount.low);
  const amount = Number(bigAmount * 100000n / (10n ** 18n)) / 100000;

  const timestamp = block.timestamp * 1000; // milliseconds instead of seconds
  const date = new Date(timestamp);
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const monthId = `${year}/${month}`;
  const day = date.getUTCDate();
  const dayId = `${monthId}/${day}`;

  // Create the monthly metric object
  const monthlyMetric = {
    id: monthId,
    deposit_count: 1,
    deposit_amount: amount,
    withdrawal_count: 0,
    withdrawal_amount: 0.0,
    month,
    year,
  };

  // Create the daily metric object
  const dailyMetric = {
    id: dayId,
    deposit_count: 0,
    deposit_amount: 0.0,
    withdrawal_count: 1,
    withdrawal_amount: amount,
    day,
    month,
    year,
  };

  // Try inserting the monthly metric object and the daily metric object. If they already exist, simple update them!
  // Table names are `lowercase(TypeName)s` and can be interacted with sql
  const query = `
  INSERT INTO monthlymetrics SET ? ON DUPLICATE KEY UPDATE deposit_count = deposit_count + 1, deposit_amount = deposit_amount + ?;
  INSERT INTO dailymetrics SET ? ON DUPLICATE KEY UPDATE deposit_count = deposit_count + 1, deposit_amount = deposit_amount + ?;
  `;

  await mysql.queryAsync(query, [monthlyMetric, amount, dailyMetric, amount]);
}

// Same logic as handleDeposit except we switch which rows we update
export const handleWithdrawal: CheckpointWriter = async ({ block, tx, rawEvent, event, mysql }) => {
  if (!rawEvent || !event) return;

  const bigAmount = BigInt(event.amount.high) * 2n ** 128n + BigInt(event.amount.low);
  const amount = Number(bigAmount * 100000n / (10n ** 18n)) / 100000;
  const timestamp = block.timestamp * 1000; // milliseconds vs seconds
  const date = new Date(timestamp);
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const monthId = `${year}/${month}`;
  const day = date.getUTCDate();
  const dayId = `${monthId}/${day}`;

  const monthlyMetric = {
    id: monthId,
    deposit_count: 0,
    deposit_amount: 0.0,
    withdrawal_count: 1,
    withdrawal_amount: amount,
    month,
    year,
  };
  
  const dailyMetric = {
    id: dayId,
    deposit_count: 0,
    deposit_amount: 0.0,
    withdrawal_count: 1,
    withdrawal_amount: amount,
    day,
    month,
    year,
  };

  const query = `
  INSERT INTO monthlymetrics SET ? ON DUPLICATE KEY UPDATE withdrawal_count = withdrawal_count + 1, withdrawal_amount = withdrawal_amount + ?;
  INSERT INTO dailymetrics SET ? ON DUPLICATE KEY UPDATE withdrawal_count = withdrawal_count + 1, withdrawal_amount = withdrawal_amount + ?;
  `;

  await mysql.queryAsync(query, [monthlyMetric, amount, dailyMetric, amount]);
}