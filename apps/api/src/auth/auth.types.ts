export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
};

export type AccessTokenPayload = {
  sub: string;
  email: string;
};
