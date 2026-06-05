"use client";

import { getAuthBaseUrl, getAuthProvider } from "./auth";

function getCurrentReturnToUrl(): string {
  return `${window.location.origin}${window.location.pathname}${window.location.search}`;
}

export function buildLoginUrl(options: { email?: string; handle?: string } = {}): string {
  const url = new URL("/login", getAuthBaseUrl());
  url.searchParams.set("returnTo", getCurrentReturnToUrl());

  const provider = getAuthProvider();
  if (provider) {
    url.searchParams.set("provider", provider);
  }

  const email = options.email?.trim();
  if (email) {
    url.searchParams.set("email", email);
  }

  const handle = options.handle?.trim();
  if (handle) {
    url.searchParams.set("handle", handle);
  }

  return url.toString();
}

export function buildLogoutUrl(): string {
  const url = new URL("/logout", getAuthBaseUrl());
  url.searchParams.set("returnTo", getCurrentReturnToUrl());
  return url.toString();
}

export function redirectToLogin(options: { email?: string; handle?: string } = {}): void {
  window.location.href = buildLoginUrl(options);
}

export function redirectToLogout(): void {
  window.location.href = buildLogoutUrl();
}
