import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import argon2 from 'argon2';
import 'dotenv/config';
import Fastify from 'fastify';
import jwt from 'jsonwebtoken';
import mongoose, { Schema } from 'mongoose';
import crypto from 'node:crypto';
import fs, { createWriteStream } from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { z } from 'zod';

import { parseWishStyle, suggestWish, WISH_STYLES } from './ai-wishes.js';
import { notifyAdmin, registerAdminRoutes, seedAdminUser } from './admin-routes.js';
import { contributePage, contributeUnavailablePage } from './contribute-page.js';
import { openRevealPage, pinRevealPage, revealCsp, unavailablePage } from './reveal-page.js';

const env = z
  .object({
    PORT: z.coerce.number().default(3001),
    MONGODB_URI: z.string().min(1),
    JWT_SECRET: z.string().min(32),
    PUBLIC_REVEAL_BASE_URL: z.string().url(),
    PUBLIC_API_BASE_URL: z.string().url().default('http://localhost:3001'),
    CORS_ORIGINS: z.string().default('http://localhost:8081,http://localhost:5173'),
    ADMIN_EMAIL: z.string().email().optional(),
    ADMIN_PASSWORD: z.string().min(8).optional(),
    ADMIN_NAME: z.string().optional(),
  })
  .parse(process.env);

const uploadsDir = path.join(process.cwd(), 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const app = Fastify({ logger: { redact: ['req.headers.authorization', 'body.password', 'body.pin', 'body.refreshToken'] } });

const userSchema = new Schema({ name: { type: String, required: true }, email: { type: String, required: true, unique: true, lowercase: true }, passwordHash: { type: String, required: true }, birthday: String, analyticsConsent: { type: Boolean, default: false }, lifecycle: { type: String, enum: ['active', 'suspended'], default: 'active' }, role: { type: String, enum: ['user', 'admin'], default: 'user', index: true } }, { timestamps: true });
const sessionSchema = new Schema({ userId: { type: Schema.Types.ObjectId, required: true, index: true }, refreshTokenHash: { type: String, required: true }, revokedAt: Date, expiresAt: { type: Date, required: true, index: { expires: 0 } } }, { timestamps: true });
const surpriseSchema = new Schema(
  {
    creatorId: { type: Schema.Types.ObjectId, required: true, index: true },
    title: { type: String, required: true },
    occasion: { type: String, required: true },
    recipientName: { type: String, required: true },
    message: { type: String, required: true },
    media: [{ id: String, kind: String, uri: String, name: String }],
    theme: { type: String, default: 'blush' },
    visibility: { type: String, enum: ['private', 'link', 'public'], default: 'link' },
    anonymous: { type: Boolean, default: false },
    allowWishes: { type: Boolean, default: true },
    keepSurprise: { type: Boolean, default: true },
    animation: { type: String, default: 'hearts' },
    status: { type: String, enum: ['draft', 'scheduled', 'live', 'expired'], default: 'draft', index: true },
    opensAt: Date,
    expiresAt: Date,
    shareTokenHash: { type: String, index: true },
    contributeTokenHash: { type: String, index: true },
    contributeTokenSalt: { type: String, default: 'v1' },
    contributeEnabled: { type: Boolean, default: true },
    contributeExpiresAt: Date,
    contributeMaxWishes: { type: Number, min: 1, max: 500 },
    contributePasswordHash: String,
    pinHash: String,
    reactionCount: { type: Number, default: 0 },
    openedAt: Date,
    personId: { type: Schema.Types.ObjectId, index: true },
    videoReel: {
      style: { type: String, default: 'classic' },
      includeMusic: { type: Boolean, default: true },
      includeNames: { type: Boolean, default: true },
      durationSec: { type: Number, default: 60 },
      status: { type: String, enum: ['idle', 'ready'], default: 'idle' },
      generatedAt: Date,
    },
  },
  { timestamps: true },
);
const personSchema = new Schema({ ownerId: { type: Schema.Types.ObjectId, required: true, index: true }, name: { type: String, required: true }, relationship: { type: String, required: true }, group: { type: String, enum: ['family', 'friend'], required: true }, birthday: { type: String, required: true }, photoUri: String, notes: { type: String, maxlength: 200 }, reminderEnabled: { type: Boolean, default: true } }, { timestamps: true });
const wishSchema = new Schema({ surpriseId: { type: Schema.Types.ObjectId, required: true, index: true }, authorName: { type: String, required: true }, message: { type: String, required: true, maxlength: 500 }, media: [{ id: String, kind: String, uri: String, name: String }], fingerprint: String, moderation: { type: String, enum: ['visible', 'hidden', 'reported'], default: 'visible' } }, { timestamps: true });
const reportSchema = new Schema({ surpriseId: { type: Schema.Types.ObjectId, required: true, index: true }, wishId: { type: Schema.Types.ObjectId, required: true, index: true }, reason: { type: String, required: true }, details: { type: String, maxlength: 500 }, reporterId: Schema.Types.ObjectId, fingerprint: String, status: { type: String, enum: ['pending', 'resolved', 'dismissed'], default: 'pending', index: true }, resolvedAt: Date }, { timestamps: true });
const mediaMetaSchema = new Schema({ ownerId: { type: Schema.Types.ObjectId, required: true, index: true }, personId: { type: Schema.Types.ObjectId, index: true }, surpriseId: { type: Schema.Types.ObjectId, index: true }, kind: { type: String, enum: ['image', 'audio', 'music', 'video'], required: true }, uri: { type: String, required: true }, name: { type: String, required: true }, filename: { type: String, required: true }, expiresAt: { type: Date, required: true, index: true } }, { timestamps: true });
const deviceSchema = new Schema({ userId: { type: Schema.Types.ObjectId, required: true, index: true }, token: { type: String, required: true }, platform: { type: String, enum: ['ios', 'android', 'web'], default: 'ios' } }, { timestamps: true });
const reactionSchema = new Schema({ surpriseId: { type: Schema.Types.ObjectId, required: true, index: true }, fingerprint: { type: String, required: true }, emoji: { type: String, required: true }, message: { type: String, maxlength: 280 }, moderation: { type: String, default: 'visible' } }, { timestamps: true });
const jobSchema = new Schema({ type: String, surpriseId: Schema.Types.ObjectId, runAt: { type: Date, index: true }, status: { type: String, default: 'pending', index: true }, attempts: { type: Number, default: 0 }, payload: Schema.Types.Mixed }, { timestamps: true });
const appSettingsSchema = new Schema({ appName: { type: String, default: 'WishDrop' }, supportEmail: { type: String, default: 'support@wishdrop.app' }, allowRegistration: { type: Boolean, default: true }, enableAnonymousWishes: { type: Boolean, default: true }, maintenanceMode: { type: Boolean, default: false }, defaultLinkExpiryDays: { type: Number, default: 7 }, maxMediaUploadMb: { type: Number, default: 80 } }, { timestamps: true });
const adminNotificationSchema = new Schema({ type: { type: String, required: true }, title: { type: String, required: true }, body: { type: String, required: true }, refId: String, readAt: Date }, { timestamps: true });
const User = mongoose.model('User', userSchema); const Session = mongoose.model('Session', sessionSchema); const Surprise = mongoose.model('Surprise', surpriseSchema); const Reaction = mongoose.model('Reaction', reactionSchema); const Job = mongoose.model('Job', jobSchema); const Device = mongoose.model('Device', deviceSchema); const Person = mongoose.model('Person', personSchema); const Wish = mongoose.model('Wish', wishSchema); const MediaMeta = mongoose.model('MediaMeta', mediaMetaSchema); const Report = mongoose.model('Report', reportSchema); const AppSettings = mongoose.model('AppSettings', appSettingsSchema); const AdminNotification = mongoose.model('AdminNotification', adminNotificationSchema);

type TokenPayload = { sub: string; sid: string };
const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const randomToken = () => crypto.randomBytes(32).toString('base64url');
const issueTokens = async (userId: string) => { const sessionToken = randomToken(); const session = await Session.create({ userId, refreshTokenHash: hashToken(sessionToken), expiresAt: new Date(Date.now() + 30 * 86400000) }); const accessToken = jwt.sign({ sub: userId, sid: String(session._id) }, env.JWT_SECRET, { expiresIn: '15m' }); return { accessToken, refreshToken: `${session._id}.${sessionToken}` }; };
const publicUser = (user: any) => ({ id: String(user._id), name: user.name, email: user.email, birthday: user.birthday, analyticsConsent: user.analyticsConsent, role: user.role ?? 'user', lifecycle: user.lifecycle ?? 'active' });
const unlinkSafe = (filename: string) => {
  try {
    fs.unlinkSync(path.join(uploadsDir, filename));
  } catch {
    /* ignore missing files */
  }
};
const body = <T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> => { const result = schema.safeParse(input); if (!result.success) throw Object.assign(new Error(result.error.issues[0]?.message ?? 'Invalid request'), { statusCode: 400 }); return result.data; };
const auth = async (request: any) => { const raw = request.headers.authorization?.replace(/^Bearer\s+/i, ''); if (!raw) throw Object.assign(new Error('Authentication required'), { statusCode: 401 }); try { return jwt.verify(raw, env.JWT_SECRET) as TokenPayload; } catch { throw Object.assign(new Error('Session expired. Sign in again.'), { statusCode: 401 }); } };
const serializeInviteSettings = (item: any) => ({
  enabled: item.contributeEnabled !== false,
  status: item.contributeEnabled === false ? 'disabled' : item.contributeExpiresAt && item.contributeExpiresAt <= new Date() ? 'expired' : 'active',
  expiresAt: item.contributeExpiresAt?.toISOString() ?? null,
  maxWishes: item.contributeMaxWishes ?? null,
  passwordProtected: Boolean(item.contributePasswordHash),
});
const serializeSurprise = (item: any, token?: string) => ({
  id: String(item._id),
  title: item.title,
  occasion: item.occasion,
  recipientName: item.recipientName,
  message: item.message,
  status: item.status,
  opensAt: item.opensAt?.toISOString(),
  expiresAt: item.expiresAt?.toISOString(),
  theme: item.theme,
  visibility: item.visibility ?? 'link',
  anonymous: Boolean(item.anonymous),
  allowWishes: item.allowWishes !== false,
  keepSurprise: item.keepSurprise !== false,
  animation: item.animation ?? 'hearts',
  media: item.media ?? [],
  reactionCount: item.reactionCount,
  openedAt: item.openedAt?.toISOString(),
  personId: item.personId ? String(item.personId) : undefined,
  invite: serializeInviteSettings(item),
  videoReel: item.videoReel
    ? {
        style: item.videoReel.style ?? 'classic',
        includeMusic: item.videoReel.includeMusic !== false,
        includeNames: item.videoReel.includeNames !== false,
        durationSec: item.videoReel.durationSec ?? 60,
        status: item.videoReel.status ?? 'idle',
        generatedAt: item.videoReel.generatedAt?.toISOString(),
      }
    : undefined,
  ...(token ? { shareUrl: `${env.PUBLIC_REVEAL_BASE_URL}/${token}` } : {}),
});
const serializePerson = (item: any) => ({ id: String(item._id), name: item.name, relationship: item.relationship, group: item.group, birthday: item.birthday, photoUri: item.photoUri, notes: item.notes, reminderEnabled: item.reminderEnabled !== false });
const serializeWish = (item: any) => ({ id: String(item._id), authorName: item.authorName, message: item.message, media: item.media ?? [], moderation: item.moderation ?? 'visible', createdAt: item.createdAt?.toISOString() });
const mediaInput = z.object({ id: z.string(), kind: z.enum(['image', 'audio', 'music', 'video']), uri: z.string().max(2048), name: z.string().max(255) });
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
    item.id && item.uri && item.name && (item.kind === 'image' || item.kind === 'audio' || item.kind === 'music' || item.kind === 'video')
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
const contributeToken = (surpriseId: string, salt = 'v1') => crypto.createHmac('sha256', env.JWT_SECRET).update(`contribute:${surpriseId}:${salt}`).digest('base64url');
const shareToken = (surpriseId: string) => crypto.createHmac('sha256', env.JWT_SECRET).update(`share:${surpriseId}`).digest('base64url');
const contributeUrl = (token: string) => `${env.PUBLIC_REVEAL_BASE_URL.replace(/\/surprise\/?$/, '')}/contribute/${token}`;
const notFound = (message: string) => Object.assign(new Error(message), { statusCode: 404 });
const ownedPersonId = async (ownerId: string, personId?: string) => { if (!personId) return undefined; if (!mongoose.isValidObjectId(personId) || !(await Person.exists({ _id: personId, ownerId }))) throw notFound('Person not found.'); return personId; };
const visibleWishes = async (surpriseId: unknown) => (await Wish.find({ surpriseId, moderation: 'visible' }).sort({ createdAt: 1 }).limit(200)).map(serializeWish);
const ensureContributeToken = async (surprise: any, regenerate = false) => {
  const salt = regenerate || !surprise.contributeTokenSalt ? randomToken().slice(0, 16) : surprise.contributeTokenSalt;
  const token = contributeToken(String(surprise._id), salt);
  surprise.contributeTokenSalt = salt;
  surprise.contributeTokenHash = hashToken(token);
  if (regenerate) surprise.contributeEnabled = true;
  await surprise.save();
  return token;
};
const openForWishes = async (token: string) => {
  const surprise = await Surprise.findOne({ contributeTokenHash: hashToken(token) });
  if (!surprise || surprise.allowWishes === false || surprise.contributeEnabled === false) {
    throw notFound('This invite is no longer accepting wishes.');
  }
  if (surprise.status === 'expired' || (surprise.expiresAt && surprise.expiresAt <= new Date())) {
    throw notFound('This invite is no longer accepting wishes.');
  }
  if (surprise.contributeExpiresAt && surprise.contributeExpiresAt <= new Date()) {
    throw notFound('This contribution link has expired.');
  }
  if (surprise.contributeMaxWishes) {
    const count = await Wish.countDocuments({ surpriseId: surprise._id, moderation: { $ne: 'hidden' } });
    if (count >= surprise.contributeMaxWishes) throw Object.assign(new Error('This surprise has reached its contribution limit.'), { statusCode: 403 });
  }
  return surprise;
};
const mediaCounts = (wishes: { media?: { kind?: string | null }[] | null }[]) => {
  let photos = 0;
  let videos = 0;
  let voice = 0;
  let music = 0;
  for (const wish of wishes) {
    for (const item of wish.media ?? []) {
      if (item.kind === 'image') photos += 1;
      else if (item.kind === 'video') videos += 1;
      else if (item.kind === 'audio') voice += 1;
      else if (item.kind === 'music') music += 1;
    }
  }
  return { photos, videos, voice, music };
};
const isRevealOpen = (surprise: { status?: string; opensAt?: Date | null; expiresAt?: Date | null }, now = new Date()) => {
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
    return reply.send(
      contributePage({
        recipientName: surprise.recipientName,
        occasion: surprise.occasion,
        pageUrl: contributeUrl(token),
        passwordRequired: Boolean(surprise.contributePasswordHash),
      }),
    );
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
app.post('/v1/surprises', async request => { const payload = await auth(request); const input = body(z.object({ title: z.string().trim().min(1).max(100), occasion: z.string().trim().min(1).max(40), recipientName: z.string().trim().min(1).max(80), message: z.string().trim().min(1).max(2000), media: z.array(mediaInput).max(12).default([]), theme: z.enum(['blush', 'midnight', 'lavender']).default('blush'), visibility: z.enum(['private', 'link', 'public']).default('link'), anonymous: z.boolean().default(false), allowWishes: z.boolean().default(true), keepSurprise: z.boolean().default(true), animation: z.string().max(40).default('hearts'), personId: z.string().optional() }), request.body); const personId = await ownedPersonId(payload.sub, input.personId); const person = personId ? await Person.findById(personId) : null; const media = await rememberMedia(input.media, { ownerId: payload.sub, personId, surpriseId: undefined, expiresAt: person?.birthday ? dayAfterNextBirthday(person.birthday) : new Date(Date.now() + 7 * 86400000) }); const surprise = await Surprise.create({ ...input, media, personId, creatorId: payload.sub }); if (media.length) await MediaMeta.updateMany({ uri: { $in: media.map(item => item.uri) } }, { surpriseId: surprise._id }); return { surprise: serializeSurprise(surprise) }; });
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
  let token = contributeToken(String(surprise._id), surprise.contributeTokenSalt || 'v1');
  if (!surprise.contributeTokenHash || surprise.contributeTokenHash !== hashToken(token)) {
    token = await ensureContributeToken(surprise);
  }
  return { url: contributeUrl(token), invite: serializeInviteSettings(surprise) };
});
app.patch('/v1/surprises/:id/invite-settings', async request => {
  const payload = await auth(request);
  const { id } = request.params as { id: string };
  const input = body(
    z.object({
      expiresAt: z.coerce.date().nullable().optional(),
      maxWishes: z.number().int().min(1).max(500).nullable().optional(),
      password: z.string().min(4).max(64).nullable().optional(),
      enabled: z.boolean().optional(),
    }),
    request.body,
  );
  const surprise = await Surprise.findOne({ _id: id, creatorId: payload.sub });
  if (!surprise) throw notFound('Surprise not found.');
  if (input.expiresAt !== undefined) surprise.contributeExpiresAt = input.expiresAt ?? undefined;
  if (input.maxWishes !== undefined) surprise.contributeMaxWishes = input.maxWishes ?? undefined;
  if (input.enabled !== undefined) surprise.contributeEnabled = input.enabled;
  if (input.password !== undefined) {
    surprise.contributePasswordHash = input.password ? await argon2.hash(input.password, { type: argon2.argon2id }) : undefined;
  }
  await surprise.save();
  return { invite: serializeInviteSettings(surprise) };
});
app.post('/v1/surprises/:id/invite/regenerate', async request => {
  const payload = await auth(request);
  const { id } = request.params as { id: string };
  const surprise = await Surprise.findOne({ _id: id, creatorId: payload.sub });
  if (!surprise) throw notFound('Surprise not found.');
  if (surprise.allowWishes === false) throw Object.assign(new Error('Wishes are turned off for this surprise.'), { statusCode: 400 });
  const token = await ensureContributeToken(surprise, true);
  return { url: contributeUrl(token), invite: serializeInviteSettings(surprise) };
});
app.post('/v1/surprises/:id/invite/disable', async request => {
  const payload = await auth(request);
  const { id } = request.params as { id: string };
  const surprise = await Surprise.findOne({ _id: id, creatorId: payload.sub });
  if (!surprise) throw notFound('Surprise not found.');
  surprise.contributeEnabled = false;
  await surprise.save();
  return { invite: serializeInviteSettings(surprise) };
});
app.get('/v1/surprises/:id/wishes', async request => {
  const payload = await auth(request);
  const { id } = request.params as { id: string };
  if (!mongoose.isValidObjectId(id) || !(await Surprise.exists({ _id: id, creatorId: payload.sub }))) throw notFound('Surprise not found.');
  const wishes = await Wish.find({ surpriseId: id }).sort({ createdAt: -1 }).limit(200);
  return { wishes: wishes.map(serializeWish) };
});
app.delete('/v1/surprises/:id/wishes/:wishId', async request => {
  const payload = await auth(request);
  const { id, wishId } = request.params as { id: string; wishId: string };
  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(wishId)) throw notFound('Wish not found.');
  if (!(await Surprise.exists({ _id: id, creatorId: payload.sub }))) throw notFound('Surprise not found.');
  const wish = await Wish.findOneAndUpdate({ _id: wishId, surpriseId: id }, { moderation: 'hidden' }, { new: true });
  if (!wish) throw notFound('Wish not found.');
  return { ok: true, wish: serializeWish(wish) };
});
app.post('/v1/surprises/:id/wishes/:wishId/report', async request => {
  const payload = await auth(request);
  const { id, wishId } = request.params as { id: string; wishId: string };
  const input = body(
    z.object({
      reason: z.enum(['inappropriate', 'spam', 'harassment', 'offensive', 'other']),
      details: z.string().trim().max(500).optional(),
    }),
    request.body,
  );
  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(wishId)) throw notFound('Wish not found.');
  if (!(await Surprise.exists({ _id: id, creatorId: payload.sub }))) throw notFound('Surprise not found.');
  const wish = await Wish.findOne({ _id: wishId, surpriseId: id });
  if (!wish) throw notFound('Wish not found.');
  await Report.create({ surpriseId: id, wishId, reason: input.reason, details: input.details, reporterId: payload.sub, status: 'pending' });
  wish.moderation = 'reported';
  await wish.save();
  await notifyAdmin(AdminNotification, {
    type: 'report',
    title: 'Wish reported',
    body: `${wish.authorName}: ${input.reason}`,
    refId: wishId,
  });
  return { ok: true, wish: serializeWish(wish) };
});
app.get('/v1/surprises/:id/analytics', async request => {
  const payload = await auth(request);
  const { id } = request.params as { id: string };
  const surprise = await Surprise.findOne({ _id: id, creatorId: payload.sub });
  if (!surprise) throw notFound('Surprise not found.');
  const wishes = await Wish.find({ surpriseId: id, moderation: { $ne: 'hidden' } }).sort({ createdAt: -1 }).limit(200);
  const counts = mediaCounts(wishes);
  const activity = [
    ...wishes.map(wish => ({
      id: `wish-${wish._id}`,
      type: 'wish' as const,
      at: wish.createdAt?.toISOString() ?? new Date().toISOString(),
      label: `${wish.authorName} added a wish`,
    })),
    ...(surprise.openedAt
      ? [{ id: 'opened', type: 'opened' as const, at: surprise.openedAt.toISOString(), label: `${surprise.recipientName} opened the surprise` }]
      : []),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));
  return {
    stats: {
      wishes: wishes.length,
      photos: counts.photos,
      videos: counts.videos,
      voice: counts.voice,
      music: counts.music,
      reactions: surprise.reactionCount ?? 0,
      opened: Boolean(surprise.openedAt),
    },
    activity,
    invite: serializeInviteSettings(surprise),
  };
});
app.post('/v1/surprises/:id/video', async request => {
  const payload = await auth(request);
  const { id } = request.params as { id: string };
  const input = body(
    z.object({
      style: z.enum(['classic', 'emotional', 'fun', 'minimal']).default('classic'),
      includeMusic: z.boolean().default(true),
      includeNames: z.boolean().default(true),
      durationSec: z.number().int().min(15).max(180).default(60),
    }),
    request.body,
  );
  const surprise = await Surprise.findOne({ _id: id, creatorId: payload.sub });
  if (!surprise) throw notFound('Surprise not found.');
  surprise.videoReel = { ...input, status: 'ready', generatedAt: new Date() };
  await surprise.save();
  return { videoReel: serializeSurprise(surprise).videoReel, surprise: serializeSurprise(surprise) };
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

const saveUploadedFile = async (file: { mimetype: string; filename?: string; file: NodeJS.ReadableStream & { truncated?: boolean } } | undefined, ownerId: string) => {
  if (!file) throw Object.assign(new Error('No file uploaded.'), { statusCode: 400 });
  if (!/^(image|audio|video)\//.test(file.mimetype)) {
    throw Object.assign(new Error('Only image, audio, or video files are allowed.'), { statusCode: 400 });
  }
  const ext =
    path.extname(file.filename || '') ||
    (file.mimetype.startsWith('video/') ? '.mp4' : file.mimetype.startsWith('audio/') ? '.m4a' : '.jpg');
  const id = randomToken();
  const filename = `${id}${ext}`;
  await pipeline(file.file, createWriteStream(path.join(uploadsDir, filename)));
  if (file.file.truncated) throw Object.assign(new Error('File is too large (max 80MB).'), { statusCode: 413 });
  const kind = file.mimetype.startsWith('video/') ? 'video' : file.mimetype.startsWith('audio/') ? 'audio' : 'image';
  const publicUrl = `${env.PUBLIC_API_BASE_URL.replace(/\/$/, '')}/media/${filename}`;
  const media = { id, kind, uri: publicUrl, name: file.filename || filename };
  await rememberMedia([media], { ownerId, expiresAt: new Date(Date.now() + 7 * 86400000) });
  return media;
};

app.post('/v1/uploads/file', async (request, reply) => {
  const payload = await auth(request);
  const file = await request.file();
  const media = await saveUploadedFile(file, payload.sub);
  return reply.send({ media });
});
app.post('/v1/uploads/presign', async request => { await auth(request); const input = body(z.object({ contentType: z.string().regex(/^(image|audio|video)\//), byteLength: z.number().positive().max(200 * 1024 * 1024), checksum: z.string().min(20).max(128) }), request.body); return { upload: { enabled: false, reason: 'Configure R2 credentials and replace this adapter with a presigned URL implementation. Use POST /v1/uploads/file for local media.', ...input } }; });

app.post('/v1/public/surprises/:token', { config: { rateLimit: { max: 12, timeWindow: '10 minutes' } } }, async request => {
  const { token } = request.params as { token: string };
  const { pin } = body(z.object({ pin: z.string().max(12).optional() }), request.body);
  const surprise = await openForReveal(token);
  if (surprise.pinHash && (!pin || !(await argon2.verify(surprise.pinHash, pin)))) throw Object.assign(new Error('A valid PIN is required.'), { statusCode: 401 });
  if (!surprise.openedAt) {
    surprise.openedAt = new Date();
    await surprise.save();
  }
  const wishes = await visibleWishes(surprise._id);
  const counts = mediaCounts(wishes);
  return {
    surprise: {
      ...serializeSurprise(surprise),
      wishes,
      stats: { wishes: wishes.length, photos: counts.photos, videos: counts.videos, voice: counts.voice, music: counts.music },
    },
  };
});
app.get('/v1/public/contribute/:token', async request => {
  const { token } = request.params as { token: string };
  const surprise = await openForWishes(token);
  return {
    recipientName: surprise.recipientName,
    occasion: surprise.occasion,
    title: surprise.title,
    passwordRequired: Boolean(surprise.contributePasswordHash),
    styles: WISH_STYLES,
  };
});
app.post('/v1/public/contribute/:token/upload', { config: { rateLimit: { max: 10, timeWindow: '10 minutes' } } }, async (request, reply) => {
  const { token } = request.params as { token: string };
  const surprise = await openForWishes(token);
  const file = await request.file();
  const media = await saveUploadedFile(file, String(surprise.creatorId));
  return reply.send({ media });
});
app.post('/v1/public/contribute/:token/ai', { config: { rateLimit: { max: 20, timeWindow: '10 minutes' } } }, async request => {
  const { token } = request.params as { token: string };
  const surprise = await openForWishes(token);
  const input = body(z.object({ style: z.enum(['emotional', 'funny', 'sweet', 'respectful', 'casual']).default('sweet') }), request.body);
  const style = parseWishStyle(input.style);
  return { suggestion: suggestWish(style, surprise.recipientName, surprise.occasion), style, styles: WISH_STYLES };
});
app.post('/v1/public/contribute/:token', { config: { rateLimit: { max: 6, timeWindow: '10 minutes' } } }, async request => {
  const { token } = request.params as { token: string };
  const input = body(
    z.object({
      authorName: z.string().trim().min(1).max(60),
      message: z.string().trim().min(1).max(500),
      media: z.array(mediaInput).max(3).default([]),
      password: z.string().max(64).optional(),
    }),
    request.body,
  );
  const surprise = await openForWishes(token);
  if (surprise.contributePasswordHash) {
    if (!input.password || !(await argon2.verify(surprise.contributePasswordHash, input.password))) {
      throw Object.assign(new Error('Incorrect contribution password.'), { statusCode: 401 });
    }
  }
  const fingerprint = hashToken(`${request.ip}:${request.headers['user-agent'] ?? ''}:${token}`);
  const media = await rememberMedia(input.media, {
    ownerId: String(surprise.creatorId),
    surpriseId: surprise._id,
    expiresAt: surprise.expiresAt ?? new Date(Date.now() + 7 * 86400000),
  });
  const wish = await Wish.create({ authorName: input.authorName, message: input.message, media, surpriseId: surprise._id, fingerprint });
  await notifyAdmin(AdminNotification, {
    type: 'wish',
    title: `New wish from ${input.authorName}`,
    body: `For ${surprise.recipientName}: ${input.message.slice(0, 120)}`,
    refId: String(wish._id),
  });
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

registerAdminRoutes(
  app,
  { User, Surprise, Wish, Report, MediaMeta, AppSettings, AdminNotification },
  {
    auth,
    body,
    serializeSurprise,
    serializeWish,
    contributeUrl,
    contributeToken,
    ensureContributeToken,
    shareToken,
    hashToken,
    notFound,
    uploadsDir,
    unlinkSafe,
  },
);

await mongoose.connect(env.MONGODB_URI);
await seedAdminUser(User, { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD, name: env.ADMIN_NAME });
await app.listen({ port: env.PORT, host: '0.0.0.0' });
app.log.info('WishDrop API listening');
