import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB() {
  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('Could not connect to MongoDB:', err.message);
    console.error('Is MongoDB running? Check MONGODB_URI in server/.env (see README, "Common problems").');
    process.exit(1);
  }
}
