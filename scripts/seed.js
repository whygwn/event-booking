/* eslint-disable no-console */
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function getClient() {
  const config = {
    user: process.env.PGUSER || 'whygwn',
    database: process.env.PGDATABASE || 'whygwn_db',
  };
  if (process.env.PGHOST) {
    config.host = process.env.PGHOST;
  } else {
    config.host = '/var/run/postgresql';
  }
  if (process.env.PGPORT) config.port = parseInt(process.env.PGPORT, 10);
  if (process.env.PGPASSWORD) config.password = process.env.PGPASSWORD;
  const client = new Client(config);
  await client.connect();
  return client;
}

const eventCategories = [
  'Snorkeling',
  'Diving',
  'Island Hopping',
  'Mangrove',
  'Sailing',
  'Surfing',
  'Conservation',
  'Coral Education',
];
const locations = [
  'Bali',
  'Lombok',
  'Labuan Bajo',
  'Raja Ampat',
  'Wakatobi',
  'Derawan',
  'Bunaken',
  'Karimunjawa',
];
const curatedCategory = 'Wisata Laut';

function randomPreferences() {
  const shuffled = [...eventCategories].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 2);
}

async function seed() {
  const client = await getClient();
  try {
    console.log('Starting seed...');

    // Ensure DB has required columns (backwards-compatible)
    console.log('Ensuring schema compatibility...');
    // bookings.cancelled_at was added in implementation; add if missing
    await client.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP");
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '[]'::jsonb");
    await client.query("ALTER TABLE events ADD COLUMN IF NOT EXISTS category VARCHAR(50)");

    // Clear existing data
    console.log('Clearing existing data...');
    await client.query('DELETE FROM bookings');
    await client.query('DELETE FROM slots');
    await client.query('DELETE FROM events');
    await client.query('DELETE FROM users');

    const defaultPass = bcrypt.hashSync('password123', 10);

    // Create admin user
    console.log('Creating admin user...');
    const adminRes = await client.query(
      `INSERT INTO users (name, email, password_hash, role, timezone, preferences)
       VALUES ($1, $2, $3, 'admin', 'Asia/Jakarta', $4) RETURNING id`,
      ['Admin User', 'admin@example.com', bcrypt.hashSync('admin123', 10), JSON.stringify(eventCategories)]
    );
    const adminId = adminRes.rows[0].id;

    // Create 300 users
    console.log('Creating 300 users...');
    const userIds = [adminId];
    for (let i = 1; i <= 299; i++) {
      const res = await client.query(
        `INSERT INTO users (name, email, password_hash, role, timezone, preferences)
         VALUES ($1, $2, $3, 'user', 'Asia/Jakarta', $4) RETURNING id`,
        [`User ${i}`, `user${i}@example.com`, defaultPass, JSON.stringify(randomPreferences())]
      );
      userIds.push(res.rows[0].id);
    }

    // Create special scenario users
    const scenarioUsers = {
      fullSlot1: { email: 'fullslot1@test.com', pass: 'test123', id: null },
      fullSlot2: { email: 'fullslot2@test.com', pass: 'test123', id: null },
      fullSlot3: { email: 'fullslot3@test.com', pass: 'test123', id: null },
      waitlist1: { email: 'waitlist1@test.com', pass: 'test123', id: null },
      waitlist2: { email: 'waitlist2@test.com', pass: 'test123', id: null },
      waitlist3: { email: 'waitlist3@test.com', pass: 'test123', id: null },
      busyUser: { email: 'busyuser@test.com', pass: 'test123', id: null },
      conflictUser: { email: 'conflict@test.com', pass: 'test123', id: null },
      cancelUser: { email: 'canceluser@test.com', pass: 'test123', id: null },
      promotedUser: { email: 'promoted@test.com', pass: 'test123', id: null },
    };

    for (const [key, user] of Object.entries(scenarioUsers)) {
      const res = await client.query(
        `INSERT INTO users (name, email, password_hash, role, timezone, preferences)
         VALUES ($1, $2, $3, 'user', 'Asia/Jakarta', $4) RETURNING id`,
        [key, user.email, bcrypt.hashSync(user.pass, 10), JSON.stringify(randomPreferences())]
      );
      scenarioUsers[key].id = res.rows[0].id;
    }

    const today = new Date();
    // Curated maritime tourism events grouped by region: Barat, Tengah, Timur
    console.log('Creating curated maritime tourism events by region...');

    const curated = [
      // Wilayah Indonesia Barat (Sumatera & Jawa)
      {
        region: 'Indonesia Barat',
        places: [
          {
            title: 'Pulau Weh (Sabang, Aceh)',
            description:
              'Lokasi titik nol kilometer Indonesia dengan ekosistem laut yang sangat terjaga, terutama di Pulau Rubiah yang menawarkan spot snorkeling dan diving kelas dunia.',
          },
          {
            title: 'Kepulauan Seribu (DKI Jakarta)',
            description:
              'Destinasi terdekat dari ibu kota dengan 12 pulau wisata unggulan yang memiliki fasilitas lengkap seperti resor mewah, watersport, dan penangkaran penyu.',
          },
          {
            title: 'Ancol (Jakarta Utara)',
            description:
              'Kawasan wisata bahari terintegrasi paling lengkap dengan pantai buatan, akuarium raksasa Sea World, taman hiburan, dan resor tepi laut.',
          },
          {
            title: 'Karimunjawa (Jepara, Jawa Tengah)',
            description:
              'Gugusan 27 pulau yang menawarkan pasir putih halus, penangkaran hiu, serta kejernihan air yang ideal untuk snorkeling.',
          },
        ],
      },
      // Wilayah Indonesia Tengah (Bali, NTB, NTT & Kalimantan)
      {
        region: 'Indonesia Tengah',
        places: [
          {
            title: 'Pantai Nusa Dua (Bali)',
            description:
              'Kawasan resor mewah dengan garis pantai bersih, ombak tenang untuk keluarga, serta fasilitas olahraga air seperti jet ski dan parasailing.',
          },
          {
            title: 'Gili Trawangan (Lombok, NTB)',
            description:
              'Dinobatkan sebagai Destinasi Renang Terbaik Dunia 2026 oleh Forbes. Bebas kendaraan bermotor dengan fasilitas beach club dan spot menyelam yang sangat lengkap.',
          },
          {
            title: 'Labuan Bajo & Pulau Komodo (NTT)',
            description:
              'Destinasi ikonik yang menggabungkan petualangan melihat Komodo, pemandangan bukit di Pulau Padar, dan snorkeling di Pink Beach.',
          },
          {
            title: 'Pantai Nihiwatu (Sumba, NTT)',
            description:
              'Salah satu pantai terbaik di dunia versi CNN yang menawarkan eksklusivitas, privasi, dan ombak selancar kelas internasional.',
          },
          {
            title: 'Kepulauan Derawan (Kalimantan Timur)',
            description:
              'Terkenal dengan kelengkapan biota lautnya, termasuk kesempatan berenang bersama ubur-ubur tanpa sengat di Pulau Kakaban dan hiu paus.',
          },
        ],
      },
      // Wilayah Indonesia Timur (Sulawesi, Maluku & Papua)
      {
        region: 'Indonesia Timur',
        places: [
          {
            title: 'Taman Laut Bunaken (Sulawesi Utara)',
            description:
              'Memiliki biodiversitas tertinggi dengan dinding karang raksasa (drop-off) yang dihuni ribuan spesies ikan tropis.',
          },
          {
            title: 'Wakatobi (Sulawesi Tenggara)',
            description:
              'Kawasan konservasi laut dengan ratusan titik penyelaman. Memiliki terumbu karang penghalang (barrier reef) terbesar kedua di dunia.',
          },
          {
            title: 'Raja Ampat (Papua Barat)',
            description:
              '"Jantung Segitiga Terumbu Karang Dunia". Destinasi bahari paling lengkap secara ekosistem dengan pemandangan gugusan pulau karst yang memukau.',
          },
        ],
      },
    ];

    const eventIds = [];
    const slotIds = [];
    let dayOffset = 7;

    for (const region of curated) {
      for (const place of region.places) {
        const eventDate = new Date(today);
        eventDate.setDate(today.getDate() + dayOffset);
        const dateOnly = eventDate.toISOString().slice(0, 10);

        const res = await client.query(
          `INSERT INTO events (title, description, date, location, category, created_by)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [place.title, place.description + ` (${region.region})`, dateOnly, place.title, curatedCategory, adminId]
        );
        const eid = res.rows[0].id;
        eventIds.push({ id: eid, date: eventDate, isPast: false });

        // Create 1-2 slots per event (morning and/or afternoon)
        const slotsToCreate = Math.random() > 0.5 ? 2 : 1;
        for (let s = 0; s < slotsToCreate; s++) {
          const startHour = s === 0 ? 9 : 14;
          const start = new Date(eventDate);
          start.setHours(startHour, 0, 0, 0);
          const end = new Date(start);
          end.setHours(startHour + 3, 0, 0, 0);
          const capacity = [15, 20, 25, 30][Math.floor(Math.random() * 4)];
          const slotRes = await client.query(
            `INSERT INTO slots (event_id, start_time, end_time, capacity) VALUES ($1, $2, $3, $4) RETURNING id`,
            [eid, start, end, capacity]
          );
          slotIds.push({ id: slotRes.rows[0].id, eventId: eid, capacity, isPast: false });
        }

        dayOffset += 3; // space events across different days
      }
    }

    // Add generated events to meet minimum scale: 30 past + 70 upcoming (total 100)
    console.log('Generating remaining events to reach 100 total (30 past, 70 upcoming)...');
    const requiredPast = 30;
    const requiredUpcoming = 70;

    // Count how many curated events we created (they are upcoming)
    const curatedUpcomingCount = eventIds.length;

    // Create past events until we have requiredPast
    let pastCreated = 0;
    while (pastCreated < requiredPast) {
      const daysAgo = Math.floor(Math.random() * 60) + 1; // 1-60 days ago
      const eventDate = new Date(today);
      eventDate.setDate(today.getDate() - daysAgo);
      const dateOnly = eventDate.toISOString().slice(0, 10);

      const category = eventCategories[Math.floor(Math.random() * eventCategories.length)];
      const location = locations[Math.floor(Math.random() * locations.length)];

      const res = await client.query(
        `INSERT INTO events (title, description, date, location, category, created_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          `Historical ${category} Expedition ${pastCreated + 1}`,
          `Dokumentasi perjalanan wisata laut bertema ${category.toLowerCase()} dengan fokus edukasi ekosistem pesisir dan keselamatan laut.`,
          dateOnly,
          location,
          category,
          adminId,
        ]
      );
      const eid = res.rows[0].id;
      eventIds.push({ id: eid, date: eventDate, isPast: true });

      // 1-3 slots
      const numSlots = Math.floor(Math.random() * 3) + 1;
      for (let s = 0; s < numSlots; s++) {
        const startHour = 9 + s * 3;
        const start = new Date(eventDate);
        start.setHours(startHour, 0, 0, 0);
        const end = new Date(start);
        end.setHours(startHour + 2, 0, 0, 0);
        const capacity = [10, 15, 20, 25, 30][Math.floor(Math.random() * 5)];
        const slotRes = await client.query(
          `INSERT INTO slots (event_id, start_time, end_time, capacity) VALUES ($1, $2, $3, $4) RETURNING id`,
          [eid, start, end, capacity]
        );
        slotIds.push({ id: slotRes.rows[0].id, eventId: eid, capacity, isPast: true });
      }
      pastCreated++;
    }

    // Create upcoming events until requiredUpcoming is reached (including curated)
    let upcomingCreated = 0;
    const upcomingToCreate = Math.max(0, requiredUpcoming - curatedUpcomingCount);
    while (upcomingCreated < upcomingToCreate) {
      const daysAhead = Math.floor(Math.random() * 90) + 1; // 1-90 days ahead
      const eventDate = new Date(today);
      eventDate.setDate(today.getDate() + daysAhead);
      const dateOnly = eventDate.toISOString().slice(0, 10);

      const category = eventCategories[Math.floor(Math.random() * eventCategories.length)];
      const location = locations[Math.floor(Math.random() * locations.length)];

      const res = await client.query(
        `INSERT INTO events (title, description, date, location, category, created_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          `${category} Sea Trip ${upcomingCreated + 1}`,
          `Upcoming wisata laut bertema ${category.toLowerCase()} dengan sesi praktik lapangan, konservasi, dan pengalaman bahari terarah.`,
          dateOnly,
          location,
          category,
          adminId,
        ]
      );
      const eid = res.rows[0].id;
      eventIds.push({ id: eid, date: eventDate, isPast: false });

      // 1-3 slots
      const numSlots = Math.floor(Math.random() * 3) + 1;
      for (let s = 0; s < numSlots; s++) {
        const startHour = 9 + s * 3;
        const start = new Date(eventDate);
        start.setHours(startHour, 0, 0, 0);
        const end = new Date(start);
        end.setHours(startHour + 2, 0, 0, 0);
        const capacity = [10, 15, 20, 25, 30][Math.floor(Math.random() * 5)];
        const slotRes = await client.query(
          `INSERT INTO slots (event_id, start_time, end_time, capacity) VALUES ($1, $2, $3, $4) RETURNING id`,
          [eid, start, end, capacity]
        );
        slotIds.push({ id: slotRes.rows[0].id, eventId: eid, capacity, isPast: false });
      }
      upcomingCreated++;
    }

    // Add random bookings for variety (original behavior)
    console.log('Creating random bookings...');
    for (let i = 0; i < 200; i++) {
      const randomUser = userIds[Math.floor(Math.random() * userIds.length)];
      const randomSlot = slotIds[Math.floor(Math.random() * slotIds.length)];
      const spots = Math.floor(Math.random() * 3) + 1; // 1-3 spots
      const status = randomSlot.isPast ? 'booked' : (Math.random() > 0.9 ? 'waitlist' : 'booked');

      try {
        await client.query(
          `INSERT INTO bookings (user_id, slot_id, spots, status) VALUES ($1, $2, $3, $4)`,
          [randomUser, randomSlot.id, spots, status]
        );
      } catch (e) {
        // Skip duplicates
      }
    }


    console.log('\nCreating 5 required scenarios...\n');

    // SCENARIO 1: The Full Slot
    console.log('Scenario 1 - The Full Slot');
    const sc1Event = await client.query(
      `INSERT INTO events (title, description, date, location, category, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        'Open Water Diving Camp - Full Slot',
        'Kelas diving wisata laut dengan slot utama penuh dan waitlist aktif',
        new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10),
        'Raja Ampat',
        'Diving',
        adminId,
      ]
    );
    const sc1EventId = sc1Event.rows[0].id;

    // Slot 1: Full with 3 waitlist
    const sc1Slot1 = await client.query(
      `INSERT INTO slots (event_id, start_time, end_time, capacity) VALUES ($1, $2, $3, $4) RETURNING id`,
      [sc1EventId, new Date(today.getTime() + 7 * 86400000 + 10 * 3600000), new Date(today.getTime() + 7 * 86400000 + 12 * 3600000), 10]
    );
    const sc1Slot1Id = sc1Slot1.rows[0].id;

    // Fill slot completely (10 spots)
    await client.query(
      `INSERT INTO bookings (user_id, slot_id, spots, status) VALUES ($1, $2, $3, 'booked')`,
      [scenarioUsers.fullSlot1.id, sc1Slot1Id, 4]
    );
    await client.query(
      `INSERT INTO bookings (user_id, slot_id, spots, status) VALUES ($1, $2, $3, 'booked')`,
      [scenarioUsers.fullSlot2.id, sc1Slot1Id, 3]
    );
    await client.query(
      `INSERT INTO bookings (user_id, slot_id, spots, status) VALUES ($1, $2, $3, 'booked')`,
      [scenarioUsers.fullSlot3.id, sc1Slot1Id, 3]
    );

    // Add 3 waitlist in order
    await client.query(
      `INSERT INTO bookings (user_id, slot_id, spots, status, created_at) VALUES ($1, $2, $3, 'waitlist', NOW() - INTERVAL '3 hours')`,
      [scenarioUsers.waitlist1.id, sc1Slot1Id, 2]
    );
    await client.query(
      `INSERT INTO bookings (user_id, slot_id, spots, status, created_at) VALUES ($1, $2, $3, 'waitlist', NOW() - INTERVAL '2 hours')`,
      [scenarioUsers.waitlist2.id, sc1Slot1Id, 2]
    );
    await client.query(
      `INSERT INTO bookings (user_id, slot_id, spots, status, created_at) VALUES ($1, $2, $3, 'waitlist', NOW() - INTERVAL '1 hour')`,
      [scenarioUsers.waitlist3.id, sc1Slot1Id, 1]
    );

    // Slot 2: 2 spots remaining
    const sc1Slot2 = await client.query(
      `INSERT INTO slots (event_id, start_time, end_time, capacity) VALUES ($1, $2, $3, $4) RETURNING id`,
      [sc1EventId, new Date(today.getTime() + 7 * 86400000 + 14 * 3600000), new Date(today.getTime() + 7 * 86400000 + 16 * 3600000), 15]
    );
    const sc1Slot2Id = sc1Slot2.rows[0].id;
    // Book 13 spots using multiple bookings (since max is 5 per booking)
    await client.query(
      `INSERT INTO bookings (user_id, slot_id, spots, status) VALUES ($1, $2, $3, 'booked')`,
      [userIds[5], sc1Slot2Id, 5]
    );
    await client.query(
      `INSERT INTO bookings (user_id, slot_id, spots, status) VALUES ($1, $2, $3, 'booked')`,
      [userIds[6], sc1Slot2Id, 5]
    );
    await client.query(
      `INSERT INTO bookings (user_id, slot_id, spots, status) VALUES ($1, $2, $3, 'booked')`,
      [userIds[7], sc1Slot2Id, 3] // Total: 13 booked, 2 remaining
    );

    // SCENARIO 2: The Busy User
    console.log('Scenario 2 - The Busy User');

    // Past event with booking
    const sc2PastEvent = await client.query(
      `INSERT INTO events (title, description, date, location, category, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        'Past Mangrove Conservation Cruise',
        'Riwayat wisata laut konservasi mangrove',
        new Date(today.getTime() - 10 * 86400000).toISOString().slice(0, 10),
        'Bunaken',
        'Mangrove',
        adminId,
      ]
    );
    const sc2PastSlot = await client.query(
      `INSERT INTO slots (event_id, start_time, end_time, capacity) VALUES ($1, $2, $3, $4) RETURNING id`,
      [sc2PastEvent.rows[0].id, new Date(today.getTime() - 10 * 86400000 + 10 * 3600000), new Date(today.getTime() - 10 * 86400000 + 12 * 3600000), 20]
    );
    await client.query(
      `INSERT INTO bookings (user_id, slot_id, spots, status) VALUES ($1, $2, $3, 'booked')`,
      [scenarioUsers.busyUser.id, sc2PastSlot.rows[0].id, 2]
    );

    // Upcoming event with booking
    const sc2UpcomingEvent = await client.query(
      `INSERT INTO events (title, description, date, location, category, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        'Future Coral Reef Sailing Week',
        'Event wisata laut mendatang untuk pengguna sibuk',
        new Date(today.getTime() + 15 * 86400000).toISOString().slice(0, 10),
        'Labuan Bajo',
        'Sailing',
        adminId,
      ]
    );
    const sc2UpcomingSlot = await client.query(
      `INSERT INTO slots (event_id, start_time, end_time, capacity) VALUES ($1, $2, $3, $4) RETURNING id`,
      [sc2UpcomingEvent.rows[0].id, new Date(today.getTime() + 15 * 86400000 + 14 * 3600000), new Date(today.getTime() + 15 * 86400000 + 16 * 3600000), 25]
    );
    await client.query(
      `INSERT INTO bookings (user_id, slot_id, spots, status) VALUES ($1, $2, $3, 'booked')`,
      [scenarioUsers.busyUser.id, sc2UpcomingSlot.rows[0].id, 3]
    );

    // Waitlist entry
    const sc2WaitlistEvent = await client.query(
      `INSERT INTO events (title, description, date, location, category, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        'Popular Snorkeling Masterclass',
        'Event snorkeling penuh dengan waitlist',
        new Date(today.getTime() + 20 * 86400000).toISOString().slice(0, 10),
        'Karimunjawa',
        'Snorkeling',
        adminId,
      ]
    );
    const sc2WaitlistSlot = await client.query(
      `INSERT INTO slots (event_id, start_time, end_time, capacity) VALUES ($1, $2, $3, $4) RETURNING id`,
      [sc2WaitlistEvent.rows[0].id, new Date(today.getTime() + 20 * 86400000 + 10 * 3600000), new Date(today.getTime() + 20 * 86400000 + 12 * 3600000), 5]
    );
    // Fill it
    await client.query(
      `INSERT INTO bookings (user_id, slot_id, spots, status) VALUES ($1, $2, $3, 'booked')`,
      [userIds[10], sc2WaitlistSlot.rows[0].id, 5]
    );
    // Busy user on waitlist
    await client.query(
      `INSERT INTO bookings (user_id, slot_id, spots, status) VALUES ($1, $2, $3, 'waitlist')`,
      [scenarioUsers.busyUser.id, sc2WaitlistSlot.rows[0].id, 2]
    );

    // SCENARIO 3: The Multi-Slot Event
    console.log('Scenario 3 - The Multi-Slot Event');
    const sc3Event = await client.query(
      `INSERT INTO events (title, description, date, location, category, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        'Multi-Slot Ocean Discovery Day',
        'Event wisata laut dengan tiga slot kondisi berbeda',
        new Date(today.getTime() + 12 * 86400000).toISOString().slice(0, 10),
        'Derawan',
        'Island Hopping',
        adminId,
      ]
    );
    const sc3EventId = sc3Event.rows[0].id;

    // Slot 1: Still open (5/20 booked)
    const sc3Slot1 = await client.query(
      `INSERT INTO slots (event_id, start_time, end_time, capacity) VALUES ($1, $2, $3, $4) RETURNING id`,
      [sc3EventId, new Date(today.getTime() + 12 * 86400000 + 9 * 3600000), new Date(today.getTime() + 12 * 86400000 + 11 * 3600000), 20]
    );
    await client.query(
      `INSERT INTO bookings (user_id, slot_id, spots, status) VALUES ($1, $2, $3, 'booked')`,
      [userIds[15], sc3Slot1.rows[0].id, 5]
    );

    // Slot 2: Full (15/15)
    const sc3Slot2 = await client.query(
      `INSERT INTO slots (event_id, start_time, end_time, capacity) VALUES ($1, $2, $3, $4) RETURNING id`,
      [sc3EventId, new Date(today.getTime() + 12 * 86400000 + 13 * 3600000), new Date(today.getTime() + 12 * 86400000 + 15 * 3600000), 15]
    );
    // Book 15 spots using multiple bookings
    await client.query(
      `INSERT INTO bookings (user_id, slot_id, spots, status) VALUES ($1, $2, $3, 'booked')`,
      [userIds[20], sc3Slot2.rows[0].id, 5]
    );
    await client.query(
      `INSERT INTO bookings (user_id, slot_id, spots, status) VALUES ($1, $2, $3, 'booked')`,
      [userIds[21], sc3Slot2.rows[0].id, 5]
    );
    await client.query(
      `INSERT INTO bookings (user_id, slot_id, spots, status) VALUES ($1, $2, $3, 'booked')`,
      [userIds[22], sc3Slot2.rows[0].id, 5]
    );

    // Slot 3: One spot left (9/10)
    const sc3Slot3 = await client.query(
      `INSERT INTO slots (event_id, start_time, end_time, capacity) VALUES ($1, $2, $3, $4) RETURNING id`,
      [sc3EventId, new Date(today.getTime() + 12 * 86400000 + 16 * 3600000), new Date(today.getTime() + 12 * 86400000 + 18 * 3600000), 10]
    );
    await client.query(
      `INSERT INTO bookings (user_id, slot_id, spots, status) VALUES ($1, $2, $3, 'booked')`,
      [userIds[25], sc3Slot3.rows[0].id, 5]
    );
    await client.query(
      `INSERT INTO bookings (user_id, slot_id, spots, status) VALUES ($1, $2, $3, 'booked')`,
      [userIds[26], sc3Slot3.rows[0].id, 4] // Total: 9 booked, 1 remaining
    );

    // SCENARIO 4: The Cancellation Chain
    console.log('Scenario 4 - The Cancellation Chain');
    const sc4Event = await client.query(
      `INSERT INTO events (title, description, date, location, category, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        'Cancellation Chain Sea Tour',
        'Event wisata laut untuk simulasi cancellation dan auto-promotion',
        new Date(today.getTime() + 14 * 86400000).toISOString().slice(0, 10),
        'Wakatobi',
        'Conservation',
        adminId,
      ]
    );
    const sc4Slot = await client.query(
      `INSERT INTO slots (event_id, start_time, end_time, capacity) VALUES ($1, $2, $3, $4) RETURNING id`,
      [sc4Event.rows[0].id, new Date(today.getTime() + 14 * 86400000 + 10 * 3600000), new Date(today.getTime() + 14 * 86400000 + 12 * 3600000), 10]
    );
    const sc4SlotId = sc4Slot.rows[0].id;

    // Initial bookings (10 spots filled)
    await client.query(
      `INSERT INTO bookings (user_id, slot_id, spots, status) VALUES ($1, $2, $3, 'booked')`,
      [scenarioUsers.cancelUser.id, sc4SlotId, 3]
    );
    await client.query(
      `INSERT INTO bookings (user_id, slot_id, spots, status) VALUES ($1, $2, $3, 'booked')`,
      [userIds[30], sc4SlotId, 4]
    );
    await client.query(
      `INSERT INTO bookings (user_id, slot_id, spots, status) VALUES ($1, $2, $3, 'booked')`,
      [userIds[31], sc4SlotId, 3]
    );

    // One booking was cancelled (simulate)
    await client.query(
      `UPDATE bookings SET status = 'cancelled', updated_at = NOW() - INTERVAL '1 day' WHERE user_id = $1 AND slot_id = $2`,
      [scenarioUsers.cancelUser.id, sc4SlotId]
    );

    // Promoted user (was on waitlist, now booked)
    await client.query(
      `INSERT INTO bookings (user_id, slot_id, spots, status, created_at, updated_at) VALUES ($1, $2, $3, 'booked', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 day')`,
      [scenarioUsers.promotedUser.id, sc4SlotId, 3]
    );

    // SCENARIO 5: The Conflict
    console.log('Scenario 5 - The Conflict');
    const conflictDate = new Date(today.getTime() + 10 * 86400000);
    const conflictStart = new Date(conflictDate);
    conflictStart.setHours(14, 0, 0, 0);
    const conflictEnd = new Date(conflictDate);
    conflictEnd.setHours(16, 0, 0, 0);

    // Event 1
    const sc5Event1 = await client.query(
      `INSERT INTO events (title, description, date, location, category, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        'Conflicting Sea Kayak Session A',
        'Sesi wisata laut overlap pertama',
        conflictDate.toISOString().slice(0, 10),
        'Bali',
        'Sailing',
        adminId,
      ]
    );
    const sc5Slot1 = await client.query(
      `INSERT INTO slots (event_id, start_time, end_time, capacity) VALUES ($1, $2, $3, $4) RETURNING id`,
      [sc5Event1.rows[0].id, conflictStart, conflictEnd, 20]
    );

    // Event 2 (overlapping time)
    const sc5Event2 = await client.query(
      `INSERT INTO events (title, description, date, location, category, created_by) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        'Conflicting Sea Kayak Session B',
        'Sesi wisata laut overlap kedua',
        conflictDate.toISOString().slice(0, 10),
        'Lombok',
        'Sailing',
        adminId,
      ]
    );
    const sc5Slot2 = await client.query(
      `INSERT INTO slots (event_id, start_time, end_time, capacity) VALUES ($1, $2, $3, $4) RETURNING id`,
      [sc5Event2.rows[0].id, conflictStart, conflictEnd, 20]
    );

    // User booked both (conflict!)
    await client.query(
      `INSERT INTO bookings (user_id, slot_id, spots, status) VALUES ($1, $2, $3, 'booked')`,
      [scenarioUsers.conflictUser.id, sc5Slot1.rows[0].id, 1]
    );
    await client.query(
      `INSERT INTO bookings (user_id, slot_id, spots, status) VALUES ($1, $2, $3, 'booked')`,
      [scenarioUsers.conflictUser.id, sc5Slot2.rows[0].id, 1]
    );

    console.log('\nSeed completed successfully.\n');
    console.log('TEST CREDENTIALS:\n');
    console.log('Admin:');
    console.log('  Email: admin@example.com');
    console.log('  Password: admin123\n');
    console.log('Scenario 1 - Full Slot:');
    console.log('  fullslot1@test.com / test123 (booked 4 spots)');
    console.log('  waitlist1@test.com / test123 (1st in waitlist)');
    console.log('  waitlist2@test.com / test123 (2nd in waitlist)');
    console.log('  waitlist3@test.com / test123 (3rd in waitlist)\n');
    console.log('Scenario 2 - Busy User:');
    console.log('  busyuser@test.com / test123\n');
    console.log('Scenario 3 - Multi-Slot:');
    console.log('  (Check event: "Multi-Slot Ocean Discovery Day")\n');
    console.log('Scenario 4 - Cancellation Chain:');
    console.log('  promoted@test.com / test123 (auto-promoted)\n');
    console.log('Scenario 5 - Conflict:');
    console.log('  conflict@test.com / test123 (double booked)\n');
    console.log('Regular users: user1@example.com to user299@example.com');
    console.log('Password: password123');

  } finally {
    await client.end();
  }
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
