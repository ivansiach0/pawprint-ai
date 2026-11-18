export function localRecoveryEnabled() {
  return process.env.NODE_ENV !== "production" && !process.env.RENDER
    && process.env.PAWPRINT_LOCAL_RECOVERY === "true";
}

export const recoveryActions = ["request-password-reset", "validate-reset-token", "reset-password"];
