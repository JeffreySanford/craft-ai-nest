import { Schema, Document } from 'mongoose';
import { MetricType } from './metrics.types';

export interface MetricDocument extends Document {
  id: string;
  timestamp: Date;
  type: MetricType;
  value: number;
  unit: string;
  host: string;
  tags: Record<string, string>;
}

export const MetricSchema = new Schema<MetricDocument>({
  id: { type: String, required: true },
  timestamp: { type: Date, required: true },
  type: { type: String, required: true, enum: Object.values(MetricType) },
  value: { type: Number, required: true },
  unit: { type: String, required: true },
  host: { type: String, default: 'localhost' },
  tags: { type: Schema.Types.Mixed, default: {} },
});

// Add indexes for faster querying
MetricSchema.index({ timestamp: -1 });
MetricSchema.index({ type: 1, timestamp: -1 });
MetricSchema.index({ host: 1, timestamp: -1 });
