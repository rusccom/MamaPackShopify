export function resolveBundleProducts(products, baps) {
  const bundlesByHandle = createBundleLookup(baps);
  const found = [];
  const missing = [];

  products.forEach((product) => {
    const bundleProduct = bundlesByHandle.get(product.handle);
    addResolvedProduct(found, missing, product.handle, bundleProduct);
  });

  return {
    found,
    missing,
  };
}

function createBundleLookup(baps) {
  return new Map(
    Object.entries(baps).map(([productId, bundleProduct]) => [
      bundleProduct.handle,
      createResolvedBundleProduct(productId, bundleProduct),
    ]),
  );
}

function createResolvedBundleProduct(productId, bundleProduct) {
  return {
    productId: String(productId),
    handle: bundleProduct.handle,
    bundleId: String(bundleProduct.bundle_id),
    variantId: String(bundleProduct.variant_id),
    type: bundleProduct.type,
  };
}

function addResolvedProduct(found, missing, handle, bundleProduct) {
  if (bundleProduct) {
    found.push(bundleProduct);
    return;
  }

  missing.push({ handle });
}
