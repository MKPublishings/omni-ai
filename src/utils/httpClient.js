// ION-ai/src/utils/httpClient.js
// Basic HTTP client using node-fetch for internet access

import fetch from 'node-fetch';

/**
 * Makes an HTTP GET request to the specified URL.
 * @param {string} url - The URL to fetch.
 * @param {import('node-fetch').RequestInit} [options] - Optional fetch options.
 * @returns {Promise<any>} - The response data.
 */
export async function httpGet(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

/**
 * Makes an HTTP POST request to the specified URL.
 * @param {string} url - The URL to post to.
 * @param {object} body - The body to send.
 * @param {import('node-fetch').RequestInit} [options] - Optional fetch options.
 * @returns {Promise<any>} - The response data.
 */
export async function httpPost(url, body, options = {}) {
  const requestOptions = /** @type {import('node-fetch').RequestInit & { headers?: Record<string, string> }} */ (options);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(requestOptions.headers || {}) },
    body: JSON.stringify(body),
    ...requestOptions,
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}
