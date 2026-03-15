export async function fetchFastBundleConfig(storeDomain) {
  const html = await fetchStorefrontHtml(storeDomain);
  const configText = extractConfigText(html);
  const config = JSON.parse(configText);

  validateConfig(config);
  return config;
}

async function fetchStorefrontHtml(storeDomain) {
  const response = await fetch(`https://${storeDomain}/`);

  if (!response.ok) {
    throw new Error(`Unable to load storefront HTML for ${storeDomain}.`);
  }

  return response.text();
}

function extractConfigText(html) {
  const startMarker = "const FastBundleConf = ";
  const endMarker = ";\n        FastBundleConf.pid =";
  const startIndex = html.indexOf(startMarker);
  const endIndex = html.indexOf(endMarker, startIndex);

  if (startIndex === -1 || endIndex === -1) {
    throw new Error("FastBundleConf was not found in storefront HTML.");
  }

  return html.slice(startIndex + startMarker.length, endIndex);
}

function validateConfig(config) {
  if (!config?.baps) {
    throw new Error("FastBundleConf does not contain bundle-as-product mappings.");
  }
}
