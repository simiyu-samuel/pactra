import Groq from 'groq-sdk';
import { db } from '@pactra/database';
import { RuleError } from '@pactra/domain';

export class QuotaWait extends Error { constructor(public retryMs: number) { super('Waiting for Groq free-tier capacity.'); } }
const limit = (key: string, fallback: number) => Math.max(1, Number(process.env[key]) || fallback);

async function reserve(estimatedTokens: number) {
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(71934021)`;
    const now = Date.now();
    const provider = await tx.providerState.findUnique({ where: { id: 'groq' } });
    if (provider?.cooldownUntil && +provider.cooldownUntil > now) throw new QuotaWait(+provider.cooldownUntil - now);
    const usage = await tx.aiUsage.findMany({ where: { createdAt: { gte: new Date(now - 86_400_000) } }, select: { createdAt: true, actualTokens: true, estimatedTokens: true, finished: true }, orderBy: { createdAt: 'asc' } });
    if (usage.some(x => !x.finished && +x.createdAt > now - 45_000)) throw new QuotaWait(1500);
    const minute = usage.filter(x => +x.createdAt > now - 60_000);
    const tokens = (rows: typeof usage) => rows.reduce((s, x) => s + (x.actualTokens ?? x.estimatedTokens), 0);
    const tpm = limit('GROQ_TOKENS_PER_MINUTE', 6800);
    if (estimatedTokens > tpm) throw new RuleError('CONTEXT_TOO_LARGE', 'This agent context exceeds the configured free-tier request budget.', 422);
    if (usage.length >= limit('GROQ_REQUESTS_PER_DAY', 850) || tokens(usage) + estimatedTokens > limit('GROQ_TOKENS_PER_DAY', 170000)) throw new QuotaWait(60_000);
    if (minute.length >= limit('GROQ_REQUESTS_PER_MINUTE', 25) || tokens(minute) + estimatedTokens > tpm) throw new QuotaWait(Math.max(1000, +minute[0].createdAt + 61_000 - now));
    return tx.aiUsage.create({ data: { estimatedTokens } });
  });
}

export async function decide<T>(system: string, context: unknown, schema: Record<string, unknown>): Promise<T> {
  if (!process.env.GROQ_API_KEY) throw new RuleError('GROQ_NOT_CONFIGURED', 'Configure the server’s Groq key to start live negotiation.', 503);
  const content = JSON.stringify(context);
  const estimatedTokens = Math.ceil((system.length + content.length + JSON.stringify(schema).length) / 3) + 1400;
  const reservation = await reserve(estimatedTokens);
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY, maxRetries: 0, timeout: 30_000 });
  try {
    const result = await client.chat.completions.create({
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
      messages: [{ role: 'system', content: system }, { role: 'user', content }],
      response_format: { type: 'json_schema', json_schema: { name: 'pactra_decision', strict: true, schema } },
      reasoning_effort: 'low', max_completion_tokens: 1400, stream: false,
    });
    await db.aiUsage.update({ where: { id: reservation.id }, data: { finished: true, actualTokens: result.usage?.total_tokens ?? estimatedTokens } });
    const choice = result.choices[0];
    if (choice?.finish_reason !== 'stop' || !choice.message.content) throw new RuleError('INCOMPLETE_AI_RESPONSE', 'The agent did not finish a complete decision.');
    return JSON.parse(choice.message.content) as T;
  } catch (error) {
    await db.aiUsage.update({ where: { id: reservation.id }, data: { finished: true } });
    const providerError = error as { status?: number; headers?: Headers };
    if (providerError.status === 429) {
      const seconds = Number(providerError.headers?.get?.('retry-after')) || 60;
      const retryMs = Math.min(Math.max(seconds * 1000, 1000), 86_400_000);
      await db.providerState.upsert({ where: { id: 'groq' }, create: { id: 'groq', cooldownUntil: new Date(Date.now() + retryMs) }, update: { cooldownUntil: new Date(Date.now() + retryMs) } });
      throw new QuotaWait(retryMs);
    }
    if (error instanceof RuleError) throw error;
    throw new RuleError('AI_UNAVAILABLE', 'The AI provider could not complete this decision. Existing valid offers are preserved.', 502);
  }
}
