import { Schema, Document } from 'mongoose';

export interface LogEntry extends Document {
  id: string;
  message: Schema.Types.Mixed;
  context?: string;
  level: number;
  timestamp: Date;
  additionalInfo?: unknown;
  // Compliance tracking fields
  isAudit?: boolean;
  userId?: string;
  sessionId?: string;
  origin?: string;
  resourceId?: string;
  action?: string;
  status?: string;
}

export const LogSchema = new Schema<LogEntry>({
  id: { type: String, required: true },
  message: { type: Schema.Types.Mixed, required: true },
  context: { type: String },
  level: { type: Number, required: true },
  timestamp: { type: Date, required: true },
  additionalInfo: { type: Schema.Types.Mixed },
  // Add compliance fields to schema
  isAudit: { type: Boolean, default: false },
  userId: { type: String },
  sessionId: { type: String },
  origin: { type: String },
  resourceId: { type: String },
  action: { type: String },
  status: { type: String },
});

// Add indexes for faster audit log queries
LogSchema.index({ timestamp: -1 });
LogSchema.index({ isAudit: 1, timestamp: -1 });
LogSchema.index({ userId: 1, timestamp: -1 });
LogSchema.index({ action: 1, timestamp: -1 });
