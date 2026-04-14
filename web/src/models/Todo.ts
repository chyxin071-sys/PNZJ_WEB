import mongoose, { Schema, Document } from 'mongoose';

export interface ITodo extends Document {
  title: string;
  description: string;
  priority: string; // high, medium, low
  status: string; // pending, completed
  dueDate: string;
  createdAt: string;
  assignees: { id: string, name: string, role: string }[];
  relatedTo: {
    type: string; // none, lead, project
    id: string;
    name: string;
  };
}

const TodoSchema: Schema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  priority: { type: String, default: 'medium' },
  status: { type: String, default: 'pending' },
  dueDate: { type: String },
  createdAt: { type: String },
  assignees: [{
    id: { type: String },
    name: { type: String },
    role: { type: String }
  }],
  relatedTo: {
    type: { type: String, default: 'none' },
    id: { type: String },
    name: { type: String }
  }
});

export default mongoose.models.Todo || mongoose.model<ITodo>('Todo', TodoSchema);