export type ActionResult = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  verificationEmailSent?: boolean;
};

export type LoginResult = ActionResult & {
  requiresTotp?: boolean;
  redirectTo?: string;
};

export type TotpSetupResult = ActionResult & {
  qrDataUrl?: string;
  recoveryCodes?: string[];
};

export type SessionUser = {
  id: string;
  email: string;
  emailVerified: boolean;
};
