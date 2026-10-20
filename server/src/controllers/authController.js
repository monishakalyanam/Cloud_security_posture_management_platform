import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/respond.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const signToken = (userId) =>
  jwt.sign({ sub: String(userId) }, env.jwtSecret, { algorithm: 'HS256', expiresIn: env.jwtExpiresIn });

const text = (value) => (typeof value === 'string' ? value.trim() : '');

export async function register(req, res) {
  const name = text(req.body?.name);
  const email = text(req.body?.email).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  const problems = [];
  if (name.length < 2 || name.length > 60) problems.push({ path: 'name', message: 'must be 2 to 60 characters' });
  if (!EMAIL_PATTERN.test(email) || email.length > 120) problems.push({ path: 'email', message: 'must be a valid email address' });
  if (password.length < 8 || password.length > 72 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    problems.push({ path: 'password', message: 'must be 8 to 72 characters and contain at least one letter and one number' });
  }
  if (problems.length) throw new ApiError(400, 'Please fix the highlighted fields.', problems);

  if (await User.exists({ email })) throw new ApiError(409, 'An account with this email already exists. Try logging in.');

  const passwordHash = await bcrypt.hash(password, 10); // 10 = how many times the hashing work is repeated (2^10)
  const user = await User.create({ name, email, passwordHash });
  ok(res, { token: signToken(user._id), user }, 201);
}

export async function login(req, res) {
  const email = text(req.body?.email).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  const user = await User.findOne({ email }).select('+passwordHash');
  const matches = user ? await bcrypt.compare(password, user.passwordHash) : false;
  // The same message for "no such email" and "wrong password" so attackers cannot discover which emails exist.
  if (!matches) throw new ApiError(401, 'Incorrect email or password.');

  ok(res, { token: signToken(user._id), user });
}

export async function me(req, res) {
  const user = await User.findById(req.user.id);
  ok(res, { user });
}
