import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI is required');
await mongoose.connect(uri);
const jobs = mongoose.connection.collection('jobs');
const surprises = mongoose.connection.collection('surprises');
const media = mongoose.connection.collection('mediametas');
const wishes = mongoose.connection.collection('wishes');
const people = mongoose.connection.collection('people');
const uploadsDir = path.join(process.cwd(), 'uploads');

async function purgeExpiredMedia() {
  const due = await media.find({ expiresAt: { $lte: new Date() } }).limit(50).toArray();
  for (const item of due) {
    const filename = String(item.filename ?? '');
    if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9]+$/.test(filename)) {
      await fs.promises.unlink(path.join(uploadsDir, filename)).catch(() => undefined);
    }
    if (item.uri) {
      await surprises.updateMany({}, { $pull: { media: { uri: item.uri } } } as never);
      await wishes.updateMany({}, { $pull: { media: { uri: item.uri } } } as never);
      await people.updateMany({ photoUri: item.uri }, { $unset: { photoUri: '' } });
    }
    await media.deleteOne({ _id: item._id });
  }
}

async function processDueJobs() {
  const now = new Date();
  const due = await jobs.find({ status: 'pending', runAt: { $lte: now } }).limit(50).toArray();
  for (const job of due) {
    const locked = await jobs.findOneAndUpdate(
      { _id: job._id, status: 'pending' },
      { $set: { status: 'processing' }, $inc: { attempts: 1 } },
    );
    if (!locked) continue;
    try {
      if (job.type === 'activate') await surprises.updateOne({ _id: job.surpriseId, status: 'scheduled' }, { $set: { status: 'live' } });
      if (job.type === 'expire') await surprises.updateOne({ _id: job.surpriseId, status: { $in: ['scheduled', 'live'] } }, { $set: { status: 'expired' } });
      await jobs.updateOne({ _id: job._id }, { $set: { status: 'complete', completedAt: new Date() } });
    } catch (error) {
      await jobs.updateOne({ _id: job._id }, { $set: { status: 'pending', lastError: error instanceof Error ? error.message : 'Unknown error' } });
    }
  }
  await purgeExpiredMedia();
}

setInterval(() => void processDueJobs(), 15_000);
void processDueJobs();
