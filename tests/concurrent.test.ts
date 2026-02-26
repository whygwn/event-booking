import { sequelize, Event, Slot } from '../src/models';
import { registerUser } from '../src/services/auth';
import { bookSlot } from '../src/services/bookings';

jest.setTimeout(30000);

describe('Concurrent booking protection', () => {
  let eventId: number;
  let slotId: number;
  const users: Array<{ id: number; email: string; password: string }> = [];

  beforeAll(async () => {
    await sequelize.authenticate();

    // create a test event + slot with capacity 1
    const event = await Event.create({
      title: 'Concurrent Test Event',
      description: 'Testing concurrent bookings',
      date: new Date().toISOString().slice(0, 10),
      location: 'Test',
      created_by: 1,
    });
    eventId = event.get('id') as number;

    const slot = await Slot.create({
      event_id: eventId,
      start_time: new Date(),
      end_time: new Date(Date.now() + 60 * 60 * 1000),
      capacity: 1,
    });
    slotId = slot.get('id') as number;

    // register 8 users
    for (let i = 0; i < 8; i++) {
      const email = `concurrent_user_${Date.now()}_${i}@example.com`;
      const res = await registerUser({ name: `User ${i}`, email, password: 'password123' });
      users.push({ id: res.id, email, password: 'password123' });
    }
  });

  afterAll(async () => {
    // cleanup bookings, slots, events, users
    await sequelize.query('DELETE FROM bookings WHERE slot_id = :slotId', { replacements: { slotId } });
    await sequelize.query('DELETE FROM slots WHERE id = :slotId', { replacements: { slotId } });
    await sequelize.query('DELETE FROM events WHERE id = :eventId', { replacements: { eventId } });
    for (const u of users) {
      await sequelize.query('DELETE FROM users WHERE email = :email', { replacements: { email: u.email } });
    }
    await sequelize.close();
  });

  test('only one concurrent booking succeeds for last spot', async () => {
    // Run bookings concurrently
    const promises = users.map((u) => bookSlot({ userId: u.id, slotId, spots: 1 }).catch((e) => ({ error: e.message })));
    const results = await Promise.all(promises);

    const booked = results.filter((r: any) => r && r.status === 'booked');
    const waitlisted = results.filter((r: any) => r && r.status === 'waitlist');
    const errors = results.filter((r: any) => r && r.error);

    expect(booked.length).toBe(1);
    expect(booked.length + waitlisted.length + errors.length).toBe(users.length);
  });
});
