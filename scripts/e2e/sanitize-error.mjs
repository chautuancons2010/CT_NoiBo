export function sanitizeE2EError(error, secrets = []) {
  let message = error?.stack || String(error);
  message = message.replace(/(?:cookie|authorization|set-cookie):[^\r\n]*/gi, "[redacted authentication header]");
  message = message.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[redacted token]");
  for (const secret of secrets) if (typeof secret === "string" && secret.length >= 8) message = message.split(secret).join("[redacted]");
  return message;
}
