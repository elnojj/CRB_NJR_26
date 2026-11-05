import type { Request, Response } from 'express';
import { readVoiceReadiness } from './readiness';

export default function handler(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Use GET to check voice configuration.' });
  }
  return res.status(200).json(readVoiceReadiness());
}
