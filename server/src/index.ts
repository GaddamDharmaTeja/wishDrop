import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';
import argon2 from 'argon2';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import jwt from 'jsonwebtoken';
import mongoose, { Schema } from 'mongoose';
import { z } from 'zod';

import { contributePage, contributeUnavailablePage } from './contribute-page.js';
import { openRevealPage, pinRevealPage, revealCsp, unavailablePage } from './reveal-page.js';

const env = z
  .object({
    PORT: z.coerce.number().default(3001),
    MONGODB_URI: z.string().min(1),
    JWT_SECRET: z.string().min(32),
    PUBLIC_REVEAL_BASE_URL: z.string().url(),
    PUBLIC_API_BASE_URL: z.string().url().default('http://localhost:3001'),
    CORS_ORIGINS: z.string().default('http://localhost:8081'),
  })
  .parse(process.env);

const uploadsDir = path.join(process.cwd(), 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const app = Fastify({ logger: { redact: ['req.headers.authorization', 'body.password', 'body.pin', 'body.refreshToken'] } });

const userSchema = new Schema({ name: { type: String, required: true }, email: { type: String, required: true, unique: true, lowercase: true }, passwordHash: { type: String, required: true }, birthday: String, analyticsConsent: { type: Boolean, default: false }, lifecycle: { type: String, default: 'active' } }, { timestamps: true });
const sessionSchema = new Schema({ userId: { type: Schema.Types.ObjectId, required: true, index: true }, refreshTokenHash: { type: String, required: true }, revokedAt: Date, expiresAt: { type: Date, required: true, index: { expires: 0 } } }, { timestamps: true });
const surpriseSchema = new Schema({ creatorId: { type: Schema.Types.ObjectId, required: true, index: true }, title: { type: String, required: true }, occasion: { type: String, required: true }, recipientName: { type: String, required: true }, message: { type: String, required: true }, media: [{ id: String, kind: String, uri: String, name: String }], theme: { type: String, default: 'blush' }, visibility: { type: String, enum: ['private', 'link', 'public'], default: 'link' }, anonymous: { type: Boolean, default: false }, allowWishes: { type: Boolean, default: true }, animation: { type: String, default: 'hearts' }, status: { type: String, enum: ['draft', 'scheduled', 'live', 'expired'], default: 'draft', index: true }, opensAt: Date, expiresAt: Date, shareTokenHash: { type: String, index: true }, contributeTokenHash: { type: String, index: true }, pinHash: String, reactionCount: { type: Number, default: 0 }, personId: { type: Schema.Types.ObjectId, index: true } }, { timestamps: true });
const personSchema = new Schema({ ownerId: { type: Schema.Types.ObjectId, required: true, index: true }, name: { type: String, required: true }, relationship: { type: String, required: true }, group: { type: String, enum: ['family', 'friend'], required: true }, birthday: { type: String, required: true }, photoUri: String, notes: { type: String, maxlength: 200 }, reminderEnabled: { type: Boolean, default: true } }, { timestamps: true });
const wishSchema = new Schema({ surpriseId: { type: Schema.Types.ObjectId, required: true, index: true }, authorName: { type: String, required: true }, message: { type: String, required: true, maxlength: 500 }, media: [{ id: String, kind: String, uri: String, name: String }], fingerprint: String, moderation: { type: String, default: 'visible' } }, { timestamps: true });
const mediaMetaSchema = new Schema({ ownerId: { type: Schema.Types.ObjectId, required: true, index: true }, personId: { type: Schema.Types.ObjectId, index: true }, surpriseId: { type: Schema.Types.ObjectId, index: true }, kind: { type: String, enum: ['image', 'audio', 'music'], required: true }, uri: { type: String, required: true }, name: { type: String, required: true }, filename: { type: String, required: true }, expiresAt: { type: Date, required: true, index: true } }, { timestamps: true });
const deviceSchema = new Schema({ userId: { type: Schema.Types.ObjectId, required: true, index: true }, token: { type: String, required: true }, platform: { type: String, enum: ['ios', 'android', 'web'], default: 'ios' } }, { timestamps: true });
const reactionSchema = new Schema({ surpriseId: { type: Schema.Types.ObjectId, required: true, index: true }, fingerprint: { type: String, required: true }, emoji: { type: String, required: true }, message: { type: String, maxlength: 280 }, moderation: { type: String, default: 'visible' } }, { timestamps: true });
const jobSchema = new Schema({ type: String, surpriseId: Schema.Types.ObjectId, runAt: { type: Date, index: true }, status: { type: String, default: 'pending', index: true }, attempts: { type: Number, default: 0 }, payload: Schema.Types.Mixed }, { timestamps: true });
const User = mongoose.model('User', userSchema); const Session = mongoose.model('Session', sessionSchema); const Surprise = mongoose.model('Surprise', surpriseSchema); const Reaction = mongoose.model('Reaction', reactionSchema); const Job = mongoose.model('Job', jobSchema); const Device = mongoose.model('Device', deviceSchema); const Person = mongoose.model('Person', personSchema); const Wish = mongoose.model('Wish', wishSchema); const MediaMeta = mongoose.model('MediaMeta', mediaMetaSchema);

type TokenPayload = { sub: string; sid: string };
const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const randomToken = () => crypto.randomBytes(32).toString('base64url');
const issueTokens = async (userId: string) => { const sessionToken = randomToken(); const session = await Session.create({ userId, refreshTokenHash: hashToken(sessionToken), expiresAt: new Date(Date.now() + 30 * 86400000) }); const accessToken = jwt.sign({ sub: userId, sid: String(session._id) }, env.JWT_SECRET, { expiresIn: '15m' }); return { accessToken, refreshToken: `${session._id}.${sessionToken}` }; };
const publicUser = (user: any) => ({ id: String(user._id), name: user.name, email: user.email, birthday: user.birthday, analyticsConsent: user.analyticsConsent });
const body = <T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> => { const result = schema.safeParse(input); if (!result.success) throw Object.assign(new Error(result.error.issues[0]?.message ?? 'Invalid request'), { statusCode: 400 }); return result.data; };
const auth = async (request: any) => { const raw = request.headers.authorization?.replace(/^Bearer\s+/i, ''); if (!raw) throw Object.assign(new Error('Authentication required'), { statusCode: 401 }); try { return jwt.verify(raw, env.JWT_SECRET) as TokenPayload; } catch { throw Object.assign(new Error('Session expired. Sign in again.'), { statusCode: 401 }); } };
const serializeSurprise = (item: any, token?: string) => ({ id: String(item._id), title: item.title, occasion: item.occasion, recipientName: item.recipientName, message: item.message, status: item.status, opensAt: item.opensAt?.toISOString(), expiresAt: item.expiresAt?.toISOString(), theme: item.theme, visibility: item.visibility ?? 'link', anonymous: Boolean(item.anonymous), allowWishes: item.allowWishes !== false, animation: item.animation ?? 'hearts', media: item.media ?? [], reactionCount: item.reactionCount, personId: item.personId ? String(item.personId) : undefined, ...(token ? { shareUrl: `${env.PUBLIC_REVEAL_BASE_URL}/${token}` } : {}) });
const serializePerson = (item: any) => ({ id: String(item._id), name: item.name, relationship: item.relationship, group: item.group, birthday: item.birthday, photoUri: item.photoUri, notes: item.notes, reminderEnabled: item.reminderEnabled !== false });
const serializeWish = (item: any) => ({ id: String(item._id), authorName: item.authorName, message: item.message, media: item.media ?? [], createdAt: item.createdAt?.toISOString() });
const mediaInput = z.object({ id: z.string(), kind: z.enum(['image', 'audio', 'music']), uri: z.string().max(2048), name: z.string().max(255) });
const dayAfterNextBirthday = (birthday: string, from = new Date()) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthday);
  if (!match) return new Date(from.getTime() + 7 * 86400000);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const next = new Date(today.getFullYear(), month - 1, day);
  const birthdayThisYear = next < today ? new Date(today.getFullYear() + 1, month - 1, day) : next;
  return new Date(birthdayThisYear.getFullYear(), birthdayThisYear.getMonth(), birthdayThisYear.getDate() + 1);
};
const filenameFromUri = (uri: string) => {
  try {
    const name = path.basename(new URL(uri).pathname);
    return /^[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/.test(name) ? name : '';
  } catch {
    return '';
  }
};
const rememberMedia = async (
  items: { id?: string | null; kind?: string | null; uri?: string | null; name?: string | null }[],
  meta: { ownerId: string; personId?: string; surpriseId?: unknown; expiresAt: Date },
) => {
  const kept = items.flatMap(item =>
    item.id && item.uri && item.name && (item.kind === 'image' || item.kind === 'audio' || item.kind === 'music')
      ? [{ id: item.id, kind: item.kind, uri: item.uri, name: item.name }]
      : [],
  );
  await Promise.all(
    kept.map(item => {
      const filename = filenameFromUri(item.uri);
      if (!filename) return Promise.resolve();
      return MediaMeta.findOneAndUpdate(
        { uri: item.uri },
        { ...meta, kind: item.kind, uri: item.uri, name: item.name, filename },
        { upsert: true },
      );
    }),
  );
  return kept;
};
const personInput = z.object({ name: z.string().trim().min(1).max(80), relationship: z.string().trim().min(1).max(40), group: z.enum(['family', 'friend']), birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Birthday must be YYYY-MM-DD.'), photoUri: z.string().max(2048).optional(), notes: z.string().trim().max(200).optional(), reminderEnabled: z.boolean().default(true) });
const contributeToken = (surpriseId: string) => crypto.createHmac('sha256', env.JWT_SECRET).update(`contribute:${surpriseId}`).digest('base64url');
const shareToken = (surpriseId: string) => crypto.createHmac('sha256', env.JWT_SECRET).update(`share:${surpriseId}`).digest('base64url');
const contributeUrl = (token: string) => `${env.PUBLIC_REVEAL_BASE_URL.replace(/\/surprise\/?$/, '')}/contribute/${token}`;
const notFound = (message: string) => Object.assign(new Error(message), { statusCode: 404 });
const ownedPersonId = async (ownerId: string, personId?: string) => { if (!personId) return undefined; if (!mongoose.isValidObjectId(personId) || !(await Person.exists({ _id: personId, ownerId }))) throw notFound('Person not found.'); return personId; };
const visibleWishes = async (surpriseId: unknown) => (await Wish.find({ surpriseId, moderation: 'visible' }).sort({ createdAt: 1 }).limit(200)).map(serializeWish);
const openForWishes = async (token: string) => { const surprise = await Surprise.findOne({ contributeTokenHash: hashToken(token) }); if (!surprise || surprise.allowWishes === false || surprise.status === 'expired' || (surprise.expiresAt && surprise.expiresAt <= new Date())) throw notFound('This invite is no longer accepting wishes.'); return surprise; };
const isRevealOpen = (surprise: { status?: string; opensAt?: Date; expiresAt?: Date }, now = new Date()) => {
  if (!surprise || surprise.status === 'draft' || surprise.status === 'expired') return false;
  if (!surprise.opensAt || !surprise.expiresAt) return false;
  if (surprise.opensAt > now || surprise.expiresAt <= now) return false;
  return true;
};
const openForReveal = async (token: string) => {
  const surprise = await Surprise.findOne({ shareTokenHash: hashToken(token) });
  const now = new Date();
  if (!surprise || surprise.status === 'draft') throw notFound('This surprise is not available right now.');
  if (surprise.status === 'scheduled' && surprise.opensAt && surprise.opensAt <= now) {
    surprise.status = 'live';
    await surprise.save();
  }
  if (surprise.expiresAt && surprise.expiresAt <= now && surprise.status !== 'expired') {
    surprise.status = 'expired';
    await surprise.save();
  }
  if (!isRevealOpen(surprise, now)) throw notFound('This surprise is not available right now.');
  return surprise;
};

await app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:', 'http:'],
      mediaSrc: ["'self'", 'https:', 'http:'],
      connectSrc: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
});
await app.register(cors, { origin: env.CORS_ORIGINS.split(',').map(value => value.trim()), credentials: false });
await app.register(rateLimit, { global: true, max: 150, timeWindow: '1 minute' });
await app.register(multipart, { limits: { fileSize: 80 * 1024 * 1024, files: 1 } });
await app.register(fastifyStatic, { root: uploadsDir, prefix: '/media/', decorateReply: false });
app.setErrorHandler((error: any, _request, reply) => reply.code(error.statusCode ?? 500).send({ message: error.statusCode ? error.message : 'Unexpected server error' }));
app.get('/health', async () => ({ status: 'ok', mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));
app.get('/surprise/:token', async (request, reply) => {
  const { token } = request.params as { token: string };
  reply.header('Content-Type', 'text/html; charset=utf-8');
  reply.header('Content-Security-Policy', revealCsp);
  let surprise;
  try {
    surprise = await openForReveal(token);
  } catch {
    return reply.code(404).send(unavailablePage());
  }
  if (surprise.pinHash) {
    const page = pinRevealPage(token);
    return reply.send(page.html);
  }
  const page = openRevealPage({
    title: surprise.title,
    occasion: surprise.occasion,
    recipientName: surprise.recipientName,
    message: surprise.message,
    allowWishes: surprise.allowWishes !== false,
    media: (surprise.media ?? []).map((item: any) => ({
      id: item.id,
      kind: item.kind,
      uri: item.uri,
      name: item.name,
    })),
    wishes: await visibleWishes(surprise._id),
  });
  return reply.send(page.html);
});
app.get('/contribute/:token', async (request, reply) => {
  const { token } = request.params as { token: string };
  reply.header('Content-Type', 'text/html; charset=utf-8');
  reply.header('Content-Security-Policy', revealCsp);
  try {
    const surprise = await openForWishes(token);
    return reply.send(contributePage({ recipientName: surprise.recipientName, occasion: surprise.occasion, pageUrl: contributeUrl(token) }));
  } catch {
    return reply.code(404).send(contributeUnavailablePage());
  }
});

app.post('/v1/auth/register', { config: { rateLimit: { max: 8, timeWindow: '10 minutes' } } }, async request => { const input = body(z.object({ name: z.string().trim().min(2).max(80), email: z.string().email().transform(value => value.toLowerCase()), password: z.string().min(8).max(128), birthday: z.string().max(32).optional(), analyticsConsent: z.boolean().default(false) }), request.body); if (await User.exists({ email: input.email })) throw Object.assign(new Error('An account already exists for this email.'), { statusCode: 409 }); const user = await User.create({ ...input, passwordHash: await argon2.hash(input.password, { type: argon2.argon2id }), password: undefined }); const tokens = await issueTokens(String(user._id)); return { user: publicUser(user), ...tokens }; });
app.post('/v1/auth/login', { config: { rateLimit: { max: 10, timeWindow: '10 minutes' } } }, async request => { const input = body(z.object({ email: z.string().email().transform(value => value.toLowerCase()), password: z.string().min(1).max(128) }), request.body); const user = await User.findOne({ email: input.email }); if (!user || !(await argon2.verify(user.passwordHash, input.password))) throw Object.assign(new Error('Incorrect email or password.'), { statusCode: 401 }); return { user: publicUser(user), ...(await issueTokens(String(user._id))) }; });
app.post('/v1/auth/refresh', async request => { const { refreshToken } = body(z.object({ refreshToken: z.string().min(30) }), request.body); const [sessionId, secret] = refreshToken.split('.'); if (!sessionId || !secret) throw Object.assign(new Error('Invalid session.'), { statusCode: 401 }); const session = await Session.findById(sessionId); if (!session || session.revokedAt || session.expiresAt < new Date() || !crypto.timingSafeEqual(Buffer.from(session.refreshTokenHash), Buffer.from(hashToken(secret)))) throw Object.assign(new Error('Session expired. Sign in again.'), { statusCode: 401 }); session.revokedAt = new Date(); await session.save(); const user = await User.findById(session.userId); if (!user) throw Object.assign(new Error('Account unavailable.'), { statusCode: 401 }); return { user: publicUser(user), ...(await issueTokens(String(user._id))) }; });
app.post('/v1/auth/logout', async request => { const payload = await auth(request); await Session.findByIdAndUpdate(payload.sid, { revokedAt: new Date() }); return { ok: true }; });
app.post('/v1/auth/forgot-password', async _request => ({ ok: true }));
app.post('/v1/auth/reset-password', async _request => ({ ok: true }));
app.post('/v1/auth/oauth/:provider', async request => {
  const { provider } = request.params as { provider: string };
  if (!['google', 'apple', 'phone'].includes(provider)) throw Object.assign(new Error('Unsupported provider.'), { statusCode: 400 });
  return {
    enabled: false,
    message: `Add ${provider.toUpperCase()} credentials to server/.env, then replace this stub with a real OAuth/token exchange.`,
  };
});

app.post('/v1/devices/push', async request => {
  const payload = await auth(request);
  const input = body(z.object({ token: z.string().min(10).max(512), platform: z.enum(['ios', 'android', 'web']).default('ios') }), request.body);
  await Device.findOneAndUpdate({ userId: payload.sub, token: input.token }, { userId: payload.sub, ...input }, { upsert: true });
  return { ok: true, enabled: false };
});

app.get('/v1/surprises', async request => { const payload = await auth(request); const surprises = await Surprise.find({ creatorId: payload.sub }).sort({ updatedAt: -1 }).limit(100); return { surprises: surprises.map(item => serializeSurprise(item, item.shareTokenHash ? shareToken(String(item._id)) : undefined)) }; });
app.post('/v1/surprises', async request => { const payload = await auth(request); const input = body(z.object({ title: z.string().trim().min(1).max(100), occasion: z.string().trim().min(1).max(40), recipientName: z.string().trim().min(1).max(80), message: z.string().trim().min(1).max(2000), media: z.array(z.object({ id: z.string(), kind: z.enum(['image', 'audio', 'music']), uri: z.string().max(2048), name: z.string().max(255) })).max(12).default([]), theme: z.enum(['blush', 'midnight', 'lavender']).default('blush'), visibility: z.enum(['private', 'link', 'public']).default('link'), anonymous: z.boolean().default(false), allowWishes: z.boolean().default(true), animation: z.string().max(40).default('hearts'), personId: z.string().optional() }), request.body); const personId = await ownedPersonId(payload.sub, input.personId); const person = personId ? await Person.findById(personId) : null; const media = await rememberMedia(input.media, { ownerId: payload.sub, personId, surpriseId: undefined, expiresAt: person?.birthday ? dayAfterNextBirthday(person.birthday) : new Date(Date.now() + 7 * 86400000) }); const surprise = await Surprise.create({ ...input, media, personId, creatorId: payload.sub }); if (media.length) await MediaMeta.updateMany({ uri: { $in: media.map(item => item.uri) } }, { surpriseId: surprise._id }); return { surprise: serializeSurprise(surprise) }; });
app.post('/v1/surprises/:id/publish', async request => { const payload = await auth(request); const { id } = request.params as { id: string }; const input = body(z.object({ opensAt: z.coerce.date(), expiresAt: z.coerce.date(), pin: z.string().min(4).max(12).optional() }).refine(value => value.expiresAt > value.opensAt, 'Expiry must be after opening.'), request.body); const surprise = await Surprise.findOne({ _id: id, creatorId: payload.sub }); if (!surprise) throw Object.assign(new Error('Surprise not found.'), { statusCode: 404 }); const person = surprise.personId ? await Person.findById(surprise.personId) : null; const birthdayEnd = person?.birthday ? dayAfterNextBirthday(person.birthday) : null; surprise.opensAt = input.opensAt; surprise.expiresAt = birthdayEnd && birthdayEnd > input.opensAt ? birthdayEnd : input.expiresAt; surprise.status = input.opensAt.getTime() <= Date.now() + 60_000 ? 'live' : 'scheduled'; if (surprise.media?.length) await rememberMedia(surprise.media, { ownerId: payload.sub, personId: surprise.personId ? String(surprise.personId) : undefined, surpriseId: surprise._id, expiresAt: surprise.expiresAt }); const revealToken = shareToken(String(surprise._id)); surprise.shareTokenHash = hashToken(revealToken); surprise.pinHash = input.pin ? await argon2.hash(input.pin, { type: argon2.argon2id }) : undefined; await surprise.save(); await Job.create([{ type: 'activate', surpriseId: surprise._id, runAt: input.opensAt }, { type: 'expire', surpriseId: surprise._id, runAt: surprise.expiresAt }]); return { surprise: serializeSurprise(surprise, revealToken) }; });
app.post('/v1/surprises/:id/share', async request => {
  const payload = await auth(request);
  const { id } = request.params as { id: string };
  const surprise = await Surprise.findOne({ _id: id, creatorId: payload.sub });
  if (!surprise?.shareTokenHash) throw Object.assign(new Error('Publish the surprise before sharing.'), { statusCode: 400 });
  const token = shareToken(String(surprise._id));
  const hashed = hashToken(token);
  if (surprise.shareTokenHash !== hashed) {
    surprise.shareTokenHash = hashed;
    await surprise.save();
  }
  return { url: `${env.PUBLIC_REVEAL_BASE_URL}/${token}` };
});
app.post('/v1/surprises/:id/invite', async request => {
  const payload = await auth(request);
  const { id } = request.params as { id: string };
  const surprise = await Surprise.findOne({ _id: id, creatorId: payload.sub });
  if (!surprise) throw notFound('Surprise not found.');
  if (surprise.allowWishes === false) throw Object.assign(new Error('Turn on "Allow friends to add wishes" to invite contributors.'), { statusCode: 400 });
  const token = contributeToken(String(surprise._id));
  if (surprise.contributeTokenHash !== hashToken(token)) {
    surprise.contributeTokenHash = hashToken(token);
    await surprise.save();
  }
  return { url: contributeUrl(token) };
});
app.get('/v1/surprises/:id/wishes', async request => {
  const payload = await auth(request);
  const { id } = request.params as { id: string };
  if (!mongoose.isValidObjectId(id) || !(await Surprise.exists({ _id: id, creatorId: payload.sub }))) throw notFound('Surprise not found.');
  const wishes = await Wish.find({ surpriseId: id }).sort({ createdAt: -1 }).limit(200);
  return { wishes: wishes.map(serializeWish) };
});

app.get('/v1/people', async request => {
  const payload = await auth(request);
  const people = await Person.find({ ownerId: payload.sub }).sort({ name: 1 }).limit(500);
  return { people: people.map(serializePerson) };
});
app.post('/v1/people', async request => {
  const payload = await auth(request);
  const input = body(personInput, request.body);
  const person = await Person.create({ ...input, ownerId: payload.sub });
  if (person.photoUri) await rememberMedia([{ id: String(person._id), kind: 'image', uri: person.photoUri, name: `${person.name} photo` }], { ownerId: payload.sub, personId: String(person._id), expiresAt: dayAfterNextBirthday(person.birthday) });
  return { person: serializePerson(person) };
});
app.patch('/v1/people/:id', async request => {
  const payload = await auth(request);
  const { id } = request.params as { id: string };
  const input = body(personInput.partial(), request.body);
  if (!mongoose.isValidObjectId(id)) throw notFound('Person not found.');
  const person = await Person.findOneAndUpdate({ _id: id, ownerId: payload.sub }, input, { new: true });
  if (!person) throw notFound('Person not found.');
  if (person.photoUri) await rememberMedia([{ id: String(person._id), kind: 'image', uri: person.photoUri, name: `${person.name} photo` }], { ownerId: payload.sub, personId: String(person._id), expiresAt: dayAfterNextBirthday(person.birthday) });
  return { person: serializePerson(person) };
});
app.delete('/v1/people/:id', async request => {
  const payload = await auth(request);
  const { id } = request.params as { id: string };
  if (!mongoose.isValidObjectId(id)) throw notFound('Person not found.');
  const result = await Person.deleteOne({ _id: id, ownerId: payload.sub });
  if (!result.deletedCount) throw notFound('Person not found.');
  return { ok: true };
});

app.post('/v1/uploads/file', async (request, reply) => {
  const payload = await auth(request);
  const file = await request.file();
  if (!file) throw Object.assign(new Error('No file uploaded.'), { statusCode: 400 });
  if (file.mimetype.startsWith('video/')) {
    throw Object.assign(new Error('Videos are not stored. Add a photo or audio instead.'), { statusCode: 400 });
  }
  if (!/^(image|audio)\//.test(file.mimetype)) {
    throw Object.assign(new Error('Only image or audio files are allowed.'), { statusCode: 400 });
  }
  const ext = path.extname(file.filename || '') || (file.mimetype.startsWith('audio/') ? '.m4a' : '.jpg');
  const id = randomToken();
  const filename = `${id}${ext}`;
  await pipeline(file.file, createWriteStream(path.join(uploadsDir, filename)));
  if (file.file.truncated) throw Object.assign(new Error('File is too large (max 80MB).'), { statusCode: 413 });
  const kind = file.mimetype.startsWith('audio/') ? 'audio' : 'image';
  const publicUrl = `${env.PUBLIC_API_BASE_URL.replace(/\/$/, '')}/media/${filename}`;
  const media = { id, kind, uri: publicUrl, name: file.filename || filename };
  await rememberMedia([media], { ownerId: payload.sub, expiresAt: new Date(Date.now() + 7 * 86400000) });
  return reply.send({ media });
});
app.post('/v1/uploads/presign', async request => { await auth(request); const input = body(z.object({ contentType: z.string().regex(/^(image|audio)\//), byteLength: z.number().positive().max(200 * 1024 * 1024), checksum: z.string().min(20).max(128) }), request.body); return { upload: { enabled: false, reason: 'Configure R2 credentials and replace this adapter with a presigned URL implementation. Use POST /v1/uploads/file for local media.', ...input } }; });

app.post('/v1/public/surprises/:token', { config: { rateLimit: { max: 12, timeWindow: '10 minutes' } } }, async request => {
  const { token } = request.params as { token: string };
  const { pin } = body(z.object({ pin: z.string().max(12).optional() }), request.body);
  const surprise = await openForReveal(token);
  if (surprise.pinHash && (!pin || !(await argon2.verify(surprise.pinHash, pin)))) throw Object.assign(new Error('A valid PIN is required.'), { statusCode: 401 });
  return { surprise: { ...serializeSurprise(surprise), wishes: await visibleWishes(surprise._id) } };
});
app.get('/v1/public/contribute/:token', async request => {
  const { token } = request.params as { token: string };
  const surprise = await openForWishes(token);
  return { recipientName: surprise.recipientName, occasion: surprise.occasion, title: surprise.title };
});
app.post('/v1/public/contribute/:token', { config: { rateLimit: { max: 6, timeWindow: '10 minutes' } } }, async request => {
  const { token } = request.params as { token: string };
  const input = body(z.object({ authorName: z.string().trim().min(1).max(60), message: z.string().trim().min(1).max(500), media: z.array(mediaInput).max(3).default([]) }), request.body);
  const surprise = await openForWishes(token);
  const fingerprint = hashToken(`${request.ip}:${request.headers['user-agent'] ?? ''}:${token}`);
  const wish = await Wish.create({ ...input, surpriseId: surprise._id, fingerprint });
  return { wish: serializeWish(wish) };
});
app.post('/v1/public/surprises/:token/reactions', { config: { rateLimit: { max: 8, timeWindow: '10 minutes' } } }, async request => {
  const { token } = request.params as { token: string };
  const input = body(z.object({ emoji: z.string().min(1).max(8), message: z.string().trim().max(280).optional() }), request.body);
  const surprise = await openForReveal(token);
  const fingerprint = hashToken(`${request.ip}:${request.headers['user-agent'] ?? ''}:${token}`);
  await Reaction.create({ surpriseId: surprise._id, fingerprint, ...input });
  await Surprise.updateOne({ _id: surprise._id }, { $inc: { reactionCount: 1 } });
  return { ok: true };
});

await mongoose.connect(env.MONGODB_URI); await app.listen({ port: env.PORT, host: '0.0.0.0' });
