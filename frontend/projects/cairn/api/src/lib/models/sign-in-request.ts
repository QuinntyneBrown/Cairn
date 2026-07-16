/** Body of `POST /api/auth/sign-in`. */
export interface SignInRequest {
  readonly email: string;
  readonly password: string;
}
