export interface JwtUserPayload {
  id: number;
  email: string;
  username: string;
  role: "USER" | "ADMIN";
}