export async function fetchBundleDetails(bundleProducts, config, options) {
  const entries = await Promise.all(
    bundleProducts.map((bundleProduct) => fetchBundleDetail(bundleProduct, config, options)),
  );

  return Object.fromEntries(entries.map((entry) => [entry.productId, entry.detail]));
}

async function fetchBundleDetail(bundleProduct, config, options) {
  const url = createBundleUrl(bundleProduct, config, options);
  const response = await fetch(url);
  const detail = await response.json();

  if (!response.ok || detail.detail === "Not found.") {
    throw new Error(`FastBundle detail not found for ${bundleProduct.handle}.`);
  }

  return {
    productId: bundleProduct.productId,
    detail,
  };
}

function createBundleUrl(bundleProduct, config, options) {
  const params = new URLSearchParams({
    shop: options.storeDomain,
    url: `/products/${bundleProduct.handle}`,
    is_preview: "false",
    lang: config.bundleBox?.primary_locale ?? "en",
  });

  return `https://api.fastbundle.co/v3/baps/${bundleProduct.productId}/?${params.toString()}`;
}
