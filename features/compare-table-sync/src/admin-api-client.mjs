import { readFile } from "node:fs/promises";

export async function createAdminApiClient(options) {
  const token = await readToken(options.adminTokenFile);
  return {
    graphql(query, variables) {
      return executeGraphql(options.storeDomain, token, query, variables);
    },
  };
}

async function readToken(tokenFile) {
  const token = (await readFile(tokenFile, "utf8")).trim();

  if (!token) {
    throw new Error(`Admin token file ${tokenFile} is empty.`);
  }

  return token;
}

async function executeGraphql(storeDomain, token, query, variables) {
  const response = await fetch(createEndpoint(storeDomain), createRequest(token, query, variables));
  const payload = await response.json();
  throwOnTopLevelErrors(payload);
  return payload.data;
}

function createEndpoint(storeDomain) {
  return `https://${storeDomain}/admin/api/2026-01/graphql.json`;
}

function createRequest(token, query, variables) {
  return {
    method: "POST",
    headers: createHeaders(token),
    body: JSON.stringify({ query, variables }),
  };
}

function createHeaders(token) {
  return {
    "Content-Type": "application/json",
    "X-Shopify-Access-Token": token,
  };
}

function throwOnTopLevelErrors(payload) {
  if (!payload.errors?.length) {
    return;
  }

  const message = payload.errors.map((error) => error.message).join("; ");
  throw new Error(message);
}
