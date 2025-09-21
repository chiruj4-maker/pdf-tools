'use server';
/**
 * @fileOverview A Genkit flow for creating and managing PDF compression jobs.
 * This file defines the backend logic that interfaces with Firebase services
 * to handle PDF compression requests.
 *
 * - createPdfCompressJob - A callable function for clients to submit a compression job.
 * - CreatePdfCompressJobInput - The input type for the job creation function.
 * - CreatePdfCompressJobOutput - The return type for the job creation function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { onCall } from '@genkit-ai/next/https';
import * as admin from 'firebase-admin';
import axios from 'axios';

// Initialize Firebase Admin SDK if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

export const CreatePdfCompressJobInputSchema = z.object({
  fileId: z.string().describe('The unique identifier for the uploaded file.'),
  originalPath: z.string().describe('The path to the original PDF in Firebase Storage.'),
  compressionMode: z.enum(['high', 'balanced', 'low']).default('balanced').describe('The desired compression level.'),
  targetSizeKB: z.number().optional().nullable().describe('An optional target size in kilobytes.'),
  keepTextQuality: z.boolean().default(true).describe('Whether to prioritize text quality.'),
});
export type CreatePdfCompressJobInput = z.infer<typeof CreatePdfCompressJobInputSchema>;

export const CreatePdfCompressJobOutputSchema = z.object({
  jobId: z.string().describe('The ID of the created compression job.'),
});
export type CreatePdfCompressJobOutput = z.infer<typeof CreatePdfCompressJobOutputSchema>;

export const createPdfCompressJob = ai.defineFlow(
  {
    name: 'createPdfCompressJob',
    inputSchema: CreatePdfCompressJobInputSchema,
    outputSchema: CreatePdfCompressJobOutputSchema,
    auth: onCall((auth, input) => {
      if (!auth) {
        throw new Error('Authentication required.');
      }
    }),
  },
  async (input, { auth }) => {
    if (!auth) {
      throw new Error('Authentication failed.');
    }
    const uid = auth.uid;
    const { fileId, originalPath, compressionMode, targetSizeKB, keepTextQuality } = input;

    // Premium feature check (example)
    if (targetSizeKB && !auth.token.premium) {
        throw new Error('Compressing to a target size is a premium feature.');
    }

    // Basic quota check (simple)
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    const user = userSnap.exists ? userSnap.data() : { plan: 'free', monthlyUsageBytes: 0, concurrentJobs: 0 };
  
    // Enforce simple concurrent job limit for free users
    if (user?.plan !== 'pro' && user?.concurrentJobs >= 2) {
      throw new Error('Upgrade to pro for more concurrent jobs.');
    }
  
    const jobData = {
      userId: uid,
      fileId,
      originalPath,
      resultPath: null,
      status: 'queued',
      compressionMode,
      targetSizeKB: targetSizeKB ?? null,
      keepTextQuality,
      progress: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      originalSizeBytes: null,
      compressedSizeBytes: null,
      error: null
    };

    const jobRef = await db.collection('jobs').add(jobData);
  
    // Increment concurrentJobs count
    await userRef.set({ concurrentJobs: admin.firestore.FieldValue.increment(1) }, { merge: true });
  
    // Trigger worker: call Cloud Run compress endpoint with jobId
    const cloudRunUrl = process.env.COMPRESSOR_URL;
    const apiKey = process.env.COMPRESSOR_API_KEY;

    if (!cloudRunUrl || !apiKey) {
      console.error('Compressor URL or API Key is not configured.');
      throw new Error('Backend compressor is not configured.');
    }

    await axios.post(`${cloudRunUrl}/compress`, 
        { jobId: jobRef.id },
        { headers: { 'x-api-key': apiKey } }
    );
  
    return { jobId: jobRef.id };
  }
);
