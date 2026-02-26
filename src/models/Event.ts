import { DataTypes, Model } from 'sequelize';
import sequelize from '../lib/db';

class Event extends Model {
  public id!: number;
  public title!: string;
  public description!: string;
  public date!: Date;
  public location!: string;
  public category!: string;
  public created_by!: number;
}

Event.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING(200),
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    created_by: {
      type: DataTypes.INTEGER,
    },
  },
  {
    sequelize,
    tableName: 'events',
    timestamps: false,
  }
);

export default Event;
