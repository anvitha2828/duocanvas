export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  room_id: string;
  user_id: string;
  points: Point[];
  color: string;
  width: number;
  created_at?: string;
}
