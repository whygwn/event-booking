# Feature Overview

## User-Facing Features
- Account registration and login.
- Browse upcoming events with search and pagination.
- Event detail page with slot list and live remaining capacity.
- Book 1-5 spots.
- Booking status handling: booked, waitlist, cancelled.
- Booking history (upcoming and past).
- Full cancellation and partial cancellation.
- Undo cancellation within 24 hours.

## Scheduling and Capacity
- Multi-slot events.
- Independent slot capacities.
- FIFO waitlist and auto-promotion.
- Time conflict protection across overlapping slots.

## Access Control
- Admin role: create, edit, delete events and slots.
- User role: browse events and manage own bookings.

## Advanced Behaviors
- Transaction-safe booking flow with row locks.
- Timezone-aware date and time display.
- Smart sorting by user preferences and capacity.

## Seed Dataset
- Maritime tourism focused event catalog.
- Includes all five required test scenarios.
