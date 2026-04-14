import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  customer: string;
  manager: string;
  address: string;
  stage: string;
  progress: number;
  status: string;
  health: string;
  startDate: string;
  delayDays: number;
  latestUpdate: string;
}

const ProjectSchema: Schema = new Schema({
  customer: { type: String },
  manager: { type: String },
  address: { type: String },
  stage: { type: String },
  progress: { type: Number },
  status: { type: String }, // 未开工, 施工中, 已竣工, 已停工
  health: { type: String }, // 正常, 预警, 严重延期
  startDate: { type: String },
  delayDays: { type: Number, default: 0 },
  latestUpdate: { type: String }
});

export default mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema);