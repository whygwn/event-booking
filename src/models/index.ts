import sequelize from '../lib/db';
import User from './User';
import Event from './Event';
import Slot from './Slot';
import Booking from './Booking';
import Notification from './Notification';

// Associations
Event.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
User.hasMany(Event, { foreignKey: 'created_by', as: 'events' });

Slot.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });
Event.hasMany(Slot, { foreignKey: 'event_id', as: 'slots' });

Booking.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(Booking, { foreignKey: 'user_id', as: 'bookings' });

Booking.belongsTo(Slot, { foreignKey: 'slot_id', as: 'slot' });
Slot.hasMany(Booking, { foreignKey: 'slot_id', as: 'bookings' });

Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });

export { sequelize, User, Event, Slot, Booking, Notification };
