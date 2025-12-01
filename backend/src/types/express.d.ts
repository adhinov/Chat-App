// Augment Express Request type to include `user` set by our auth middleware
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export {};
