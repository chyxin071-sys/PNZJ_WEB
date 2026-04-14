import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  phone: string;
  role: string; // admin, sales, designer, manager
  department: string;
  passwordHash: string;
  status: string; // active, inactive
  joinDate: string;
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  role: { type: String, required: true },
  department: { type: String },
  passwordHash: { type: String, required: true },
  status: { type: String, default: 'active' },
  joinDate: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);