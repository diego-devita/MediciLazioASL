#!/usr/bin/env node

/**
 * Script per popolare database locale con dati di test
 * Usage: node scripts/seed-local-db.js
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/medici-lazio-dev';

async function seedDatabase() {
  console.log('🌱 Seeding database locale...\n');

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connesso a MongoDB\n');

    const db = client.db();

    // ===== CREA COLLECTIONS =====
    console.log('📦 Creazione collections...');

    const collections = [
      'users',
      'sessions',
      'login_attempts',
      'cron_logs',
      'variations_history',
      'system_settings'
    ];

    for (const collName of collections) {
      const existing = await db.listCollections({ name: collName }).toArray();
      if (existing.length === 0) {
        await db.createCollection(collName);
        console.log(`  ✅ ${collName}`);
      } else {
        console.log(`  ⏭️  ${collName} (già esiste)`);
      }
    }

    // ===== UTENTE ADMIN TEST =====
    console.log('\n👤 Creazione utente admin test...');

    const usersCollection = db.collection('users');

    // Verifica se esiste già
    const existingUser = await usersCollection.findOne({ chatId: '999999999' });

    if (!existingUser) {
      await usersCollection.insertOne({
        chatId: '999999999',
        username: 'admin_test',
        query: {
          cognomi: [
            { cognome: 'ROSSI', asl: '', cap: '', nome: '' },
            { cognome: 'BIANCHI', asl: '', cap: '', nome: '' }
          ]
        },
        createdAt: new Date().toISOString(),
        lastCheck: null,
        lastResults: [],
        cronEnabled: true,
        notifications: {
          searchCompleted: true,
          newDoctors: true,
          removedDoctors: true,
          statusChanged: true,
          totalAvailable: true,
          onlyToAssignable: false
        }
      });
      console.log('  ✅ Utente admin_test creato (chatId: 999999999)');
    } else {
      console.log('  ⏭️  Utente admin_test già esiste');
    }

    // ===== SYSTEM SETTINGS =====
    console.log('\n⚙️  Creazione system settings...');

    const settingsCollection = db.collection('system_settings');
    const existingSettings = await settingsCollection.findOne({ _id: 'global' });

    if (!existingSettings) {
      await settingsCollection.insertOne({
        _id: 'global',
        cronEnabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      console.log('  ✅ System settings creati');
    } else {
      console.log('  ⏭️  System settings già esistono');
    }

    // ===== CRON LOGS FAKE =====
    console.log('\n📊 Creazione log cron di esempio...');

    const cronLogsCollection = db.collection('cron_logs');
    const existingLogs = await cronLogsCollection.countDocuments();

    if (existingLogs === 0) {
      const fakeLogs = [];
      for (let i = 0; i < 5; i++) {
        const timestamp = new Date();
        timestamp.setHours(timestamp.getHours() - i * 6); // Ogni 6 ore

        fakeLogs.push({
          timestamp: timestamp,
          success: true,
          usersChecked: 1,
          usersSuccessful: 1,
          usersErrors: 0,
          duration: Math.floor(Math.random() * 5000) + 1000
        });
      }

      await cronLogsCollection.insertMany(fakeLogs);
      console.log(`  ✅ ${fakeLogs.length} log cron di esempio creati`);
    } else {
      console.log(`  ⏭️  Cron logs già presenti (${existingLogs})`);
    }

    // ===== RIEPILOGO =====
    console.log('\n' + '='.repeat(50));
    console.log('✅ Database seeded con successo!\n');
    console.log('📝 Credenziali per login web:');
    console.log('   Chat ID: 999999999');
    console.log('   Username: admin_test\n');
    console.log('💡 Per ottenere OTP:');
    console.log('   1. Aggiungi questo Chat ID agli ADMIN_CHAT_IDS nel .env');
    console.log('   2. Invia /otp al bot Telegram');
    console.log('   3. Usa il codice ricevuto per login\n');
    console.log('⚠️  OPPURE usa API_KEYS nel .env per login diretto\n');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Errore durante il seeding:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run
seedDatabase();
