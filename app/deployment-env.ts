export function publicOrigin() {
  return process.env.BETTER_AUTH_URL || process.env.RENDER_EXTERNAL_URL;
}

export function privateApiOrigin() {
  const { PAWPRINT_API_ORIGIN, PAWPRINT_API_HOSTPORT } = process.env;
  return PAWPRINT_API_ORIGIN || (PAWPRINT_API_HOSTPORT && `http://${PAWPRINT_API_HOSTPORT}`);
}
