import mongoose, { Schema, Document } from 'mongoose';

export interface ILead extends Document {
  name: string;
  phone: string;
  rating: string;
  address: string;
  area: number;
  requirementType: string;
  budget: string;
  source: string;
  status: string;
  sales: string;
  designer: string;
  createdAt: string;
  lastFollowUp: string;
  unread: boolean;
  notes: string;
}

const LeadSchema: Schema = new Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  rating: { type: String },
  address: { type: String },
  area: { type: Number },
  requirementType: { type: String },
  budget: { type: String },
  source: { type: String },
  status: { type: String },
  sales: { type: String },
  designer: { type: String },
  createdAt: { type: String },
  lastFollowUp: { type: String },
  unread: { type: Boolean, default: false },
  notes: { type: String }
});

export default mongoose.models.Lead || mongoose.model<ILead>('Lead', LeadSchema);