/**
 * Single-instructor login for a private Cloudflare Worker.
 * No identity-provider integration, database, accounts or password in source.
 * Secrets: INSTRUCTOR_USERNAME, INSTRUCTOR_ACCESS_CODE, SESSION_SECRET.
 */
const SESSION_COOKIE = "__Host-arthreysquared_instructor";
const SESSION_SECONDS = 45 * 60;
const encoder = new TextEncoder();
const AUTH_HEADERS = {
  "Cache-Control": "no-store, max-age=0, private",
  "Pragma": "no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff"
};
function respondJson(body, status=200, extra={}) {
  return new Response(JSON.stringify(body), {
    status, headers: {...AUTH_HEADERS, "Content-Type": "application/json; charset=utf-8", ...extra}
  });
}
function parseCookie(header, key) {
  const c = (header || "").split(";").map(s => s.trim()).find(s => s.startsWith(key + "="));
  return c ? c.slice(key.length + 1) : "";
}
function bytesToUrl(bytes) {
  let s = "";
  for (const n of bytes) s += String.fromCharCode(n);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function urlToBytes(data) {
  if (!/^[A-Za-z0-9_-]{40,50}$/.test(data)) throw Error("Bad signature");
  const raw = atob(data.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4-data.length % 4) % 4));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
async function keyFor(secret) {
  return crypto.subtle.importKey("raw", encoder.encode(secret),
    { name:"HMAC", hash:"SHA-256" }, false, ["sign","verify"]);
}
async function compareSecret(a,b) {
  const [left,right] = await Promise.all([
    crypto.subtle.digest("SHA-256",encoder.encode(a)),
    crypto.subtle.digest("SHA-256",encoder.encode(b))
  ]);
  const x=new Uint8Array(left), y=new Uint8Array(right);
  let diff=0;
  for(let i=0;i<x.length;i++) diff |= x[i]^y[i];
  return diff===0;
}
function cookie(value,maxAge) {
  return SESSION_COOKIE+"="+value+"; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age="+maxAge;
}
function credentialsConfigured(env) {
  return Boolean(env.INSTRUCTOR_USERNAME && env.INSTRUCTOR_ACCESS_CODE &&
    env.SESSION_SECRET && env.SESSION_SECRET.length >= 32);
}
function originMatches(req) {
  const origin=req.headers.get("Origin");
  return Boolean(origin) && origin===new URL(req.url).origin;
}
async function issueSession(env) {
  const exp=Math.floor(Date.now()/1000)+SESSION_SECONDS;
  const random=crypto.getRandomValues(new Uint8Array(16));
  const payload=String(exp)+"."+Array.from(random,b=>b.toString(16).padStart(2,"0")).join("");
  const key=await keyFor(env.SESSION_SECRET);
  const signature=await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return payload+"."+bytesToUrl(new Uint8Array(signature));
}
export async function hasSession(req,env) {
  if (!credentialsConfigured(env)) return false;
  const token=parseCookie(req.headers.get("Cookie"), SESSION_COOKIE);
  const fields=token.split(".");
  if (fields.length!==3) return false;
  const [expiry, nonce, signature]=fields;
  if (!/^[0-9]{10,12}$/.test(expiry) || !/^[a-f0-9]{32}$/.test(nonce)) return false;
  const now=Math.floor(Date.now()/1000), end=Number(expiry);
  if (!Number.isSafeInteger(end)||end<=now||end>now+SESSION_SECONDS) return false;
  try {
    const key=await keyFor(env.SESSION_SECRET);
    return await crypto.subtle.verify("HMAC",key,urlToBytes(signature),encoder.encode(expiry+"."+nonce));
  } catch { return false; }
}
export async function login(req, env) {
  if (!credentialsConfigured(env) || !env.LOGIN_RATE_LIMITER) {
    return respondJson({error:"Instructor access has not been configured."},503);
  }
  if (!originMatches(req)) return respondJson({error:"Invalid login request."},403);
  if (!(req.headers.get("Content-Type")||"").startsWith("application/json")) {
    return respondJson({error:"Invalid request."},415);
  }
  if (Number(req.headers.get("Content-Length")||0)>2048) return respondJson({error:"Request is too large."},413);
  const ip=req.headers.get("CF-Connecting-IP")||"unknown";
  let limit;
  try { limit=await env.LOGIN_RATE_LIMITER.limit({key:"instructor-login:"+ip}); }
  catch { return respondJson({error:"Login temporarily unavailable."},503); }
  if (!limit.success) return respondJson({error:"Too many attempts. Try again later."},429);
  let input;
  try {
    const raw = await req.text();
    if (raw.length > 2048) return respondJson({error:"Request is too large."},413);
    input = JSON.parse(raw);
  } catch { return respondJson({error:"Invalid login request."},400); }
  if (typeof input?.username!=="string"||typeof input?.code!=="string"||
      input.username.length>100||input.code.length>256) {
    return respondJson({error:"Incorrect username or access code."},401);
  }
  const userMatch=await compareSecret(input.username,env.INSTRUCTOR_USERNAME);
  const codeMatch=await compareSecret(input.code,env.INSTRUCTOR_ACCESS_CODE);
  if (!userMatch || !codeMatch) return respondJson({error:"Incorrect username or access code."},401);
  const token=await issueSession(env);
  return respondJson({ok:true},200,{"Set-Cookie":cookie(token,SESSION_SECONDS)});
}
export function logout(req) {
  if (!originMatches(req)) return respondJson({error:"Invalid logout request."},403);
  return respondJson({ok:true},200,{"Set-Cookie":cookie("",0)});
}
