export enum MetricType {
  REQUEST_RATE = 'request_rate',
  QUEUE_SIZE = 'queue_size',
  ACTIVE_USERS = 'active_users',
  DISK_IO = 'disk_io',
  NETWORK_IO = 'network_io',
  CPU = 'cpu',
  MEMORY = 'memory',
  RESPONSE_TIME = 'response_time',
  ERROR_RATE = 'error_rate',
  MEMORY_USED = 'memory_used', // Added MEMORY_USED
}

export interface Metric {
  id?: string;
  timestamp: Date;
  type: MetricType;
  value: number;
  unit: string;
  host?: string;
  tags?: Record<string, string>;
}

export interface MetricFilter {
  types?: MetricType[];
  fromDate?: Date;
  toDate?: Date;
  minValue?: number;
  maxValue?: number;
  tags?: Record<string, string>;
}

export interface MetricThreshold {
  type: MetricType;
  warningThreshold: number;
  criticalThreshold: number;
  duration?: number; // Duration in ms for which threshold must be exceeded
}
