export interface User {
  id: number;
  email: string;
  username?: string;
  [key: string]: any;
}
