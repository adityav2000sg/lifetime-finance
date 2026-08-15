export type LocalUser = {
  userId: string;
  displayName: string;
  email: string;
};

// A single fixed local identity. This replaces the removed ChatGPT session so
// that per-user data scoping keeps working and nothing has to handle a null
// user. Swap this for a real provider when one is added.
export const LOCAL_USER: LocalUser = {
  userId: "local",
  displayName: "You",
  email: "you@localhost",
};
