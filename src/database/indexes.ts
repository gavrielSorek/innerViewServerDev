// src/database/indexes.ts
// Database index definitions for performance optimization

import { Connection } from 'mongoose';

/**
 * Create database indexes for all collections
 * This should be called after database connection is established
 */
export async function createIndexes(connection: Connection) {
  console.log('Creating database indexes...');

  try {
    // Users collection indexes
    await connection.collection('users').createIndexes([
      { key: { email: 1 }, unique: true },
      { key: { firebaseUid: 1 }, unique: true },
      { key: { role: 1, isActive: 1 } },
      { key: { subscription: 1 } },
      { key: { createdAt: -1 } },
    ]);

    // Clients collection indexes
    await connection.collection('clients').createIndexes([
      { key: { userId: 1, createdAt: -1 } },
      { key: { userId: 1, status: 1 } },
      { key: { userId: 1, name: 'text' } }, // Text index for search
    ]);

    // Meetings collection indexes
    await connection.collection('meetings').createIndexes([
      { key: { userId: 1, clientId: 1, date: -1 } },
      { key: { userId: 1, date: -1 } },
      { key: { clientId: 1, date: -1 } },
    ]);

    // Notes collection indexes
    await connection.collection('notes').createIndexes([
      { key: { userId: 1, clientId: 1, updatedAt: -1 } },
      { key: { userId: 1, updatedAt: -1 } },
      { key: { clientId: 1, updatedAt: -1 } },
      { key: { content: 'text' } }, // Text index for search
    ]);

    // FutureGraph sessions indexes
    await connection.collection('futuregraphsessions').createIndexes([
      { key: { sessionId: 1 }, unique: true },
      { key: { userId: 1, startTime: -1 } },
      { key: { clientId: 1, startTime: -1 } },
      { key: { userId: 1, clientId: 1, startTime: -1 } },
      { key: { status: 1 } },
      { key: { language: 1 } },
    ]);

    // FutureGraph images indexes
    await connection.collection('futuregraphimages').createIndexes([
      { key: { sessionId: 1 }, unique: true },
    ]);

    // FutureGraph focus reports indexes
    await connection.collection('futuregraphfocusreports').createIndexes([
      { key: { focusReportId: 1 }, unique: true },
      { key: { sessionId: 1, focus: 1, language: 1 } },
      { key: { userId: 1, createdAt: -1 } },
      { key: { clientId: 1, createdAt: -1 } },
    ]);

    // Treatment plans indexes
    await connection.collection('treatmentplans').createIndexes([
      { key: { planId: 1 }, unique: true },
      { key: { userId: 1, createdAt: -1 } },
      { key: { clientId: 1, createdAt: -1 } },
      { key: { futuregraphSessionId: 1 } },
      { key: { status: 1 } },
    ]);

    // Usage tracking indexes
    await connection.collection('usagetrackings').createIndexes([
      { key: { userId: 1, usageType: 1, timestamp: -1 } },
      { key: { timestamp: 1 }, expireAfterSeconds: 2592000 }, // 30 days TTL
    ]);

    // User preferences indexes
    await connection.collection('userpreferences').createIndexes([
      { key: { userId: 1 }, unique: true },
    ]);

    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
    throw error;
  }
}