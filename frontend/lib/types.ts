export type User = { id: string; email: string; role: string };
export type Resource = {
  id: string;
  name: string;
  type: string;
  capacity: number;
  active: boolean;
  description: string;
};
export type Booking = {
  id: string;
  userId: string;
  resourceId: string;
  startTime: string;
  endTime: string;
  status: string;
};
export type Notification = {
  id: string;
  message: string;
  read?: boolean;
  isRead?: boolean;
  createdAt: string;
};
export type Review = {
  id: string;
  bookingId: string;
  resourceId: string;
  rating: number;
  comment: string;
  userId: string;
};
export type Closure = {
  id: string;
  resourceId: string | null;
  startTime: string;
  endTime: string;
  reason: string | null;
};
