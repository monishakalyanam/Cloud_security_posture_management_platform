// Small helpers for reasoning about network rules (IPv4 and IPv6).
import { isIPv4, isIPv6 } from 'node:net';

// family is 4 or 6. Example valid values: "10.0.0.0/8", "::/0", "2001:db8::/32".
export function isValidCidr(value, family) {
  if (typeof value !== 'string') return false;
  const parts = value.split('/');
  if (parts.length !== 2) return false;
  const [address, prefixText] = parts;
  if (!/^\d{1,3}$/.test(prefixText)) return false;
  const prefix = Number(prefixText);
  if (family === 4) return isIPv4(address) && prefix <= 32;
  return isIPv6(address) && prefix <= 128;
}

// A CIDR with prefix length 0 ("0.0.0.0/0" or "::/0") means "every address on the internet".
export function isOpenToInternet(cidr) {
  return Number(cidr.split('/')[1]) === 0;
}

// Does this (already validated) inbound rule cover the given TCP port?
export function ruleCoversTcpPort(rule, port) {
  if (rule.protocol === '-1') return true; // all protocols and all ports
  if (rule.protocol !== 'tcp') return false; // SSH and RDP are TCP services
  return rule.fromPort <= port && port <= rule.toPort;
}

// Returns [{ index, rule, cidrs }] for every inbound rule that exposes `port` to the whole internet.
export function findInternetOpenRules(inboundRules, port) {
  const matches = [];
  inboundRules.forEach((rule, index) => {
    if (!ruleCoversTcpPort(rule, port)) return;
    const cidrs = [...rule.ipv4Cidrs, ...rule.ipv6Cidrs].filter(isOpenToInternet);
    if (cidrs.length > 0) matches.push({ index, rule, cidrs });
  });
  return matches;
}
