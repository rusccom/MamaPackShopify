export function buildCompareMatrix(input) {
  const headers = createHeaders(input.bundleProducts, input.bundleDetails);
  const rowMap = createRowMap(headers, input.bundleDetails);
  const rows = finalizeRows(rowMap, headers);

  return {
    generatedAt: new Date().toISOString(),
    storeDomain: input.storeDomain,
    source: createSource(input.tabContext),
    headers,
    rows,
    missingProducts: input.missingProducts,
  };
}

function createHeaders(bundleProducts, bundleDetails) {
  return bundleProducts.map((bundleProduct, index) =>
    createHeader(bundleProduct, bundleDetails[bundleProduct.productId], index),
  );
}

function createHeader(bundleProduct, detail, index) {
  return {
    position: index + 1,
    bundleId: bundleProduct.bundleId,
    productId: bundleProduct.productId,
    productGid: toProductGid(bundleProduct.productId),
    productHandle: bundleProduct.handle,
    title: detail?.title ?? bundleProduct.handle,
    variantId: bundleProduct.variantId,
    bundleItemCount: detail?.items?.length ?? 0,
  };
}

function createRowMap(headers, bundleDetails) {
  const rowMap = new Map();

  headers.forEach((header) => {
    const detail = bundleDetails[header.productId];
    addBundleItems(rowMap, header, detail);
  });

  return rowMap;
}

function addBundleItems(rowMap, header, detail) {
  const items = detail?.items ?? [];

  items.forEach((item) => {
    const row = getOrCreateRow(rowMap, item);
    row.includedProductIds.add(header.productId);
    row.variantIds = mergeVariantIds(row.variantIds, item.variants);
    row.weight += header.bundleItemCount;
  });
}

function getOrCreateRow(rowMap, item) {
  const rowKey = String(item.id);

  if (!rowMap.has(rowKey)) {
    rowMap.set(rowKey, createRowRecord(item));
  }

  return rowMap.get(rowKey);
}

function createRowRecord(item) {
  return {
    productId: String(item.id),
    productGid: toProductGid(item.id),
    handle: item.handle ?? "",
    title: item.title ?? "",
    variantIds: [],
    includedProductIds: new Set(),
    weight: 0,
  };
}

function mergeVariantIds(currentIds, variants) {
  const variantIds = variants?.map((variant) => String(variant.id)) ?? [];
  const mergedIds = new Set([...currentIds, ...variantIds]);

  return Array.from(mergedIds).sort();
}

function finalizeRows(rowMap, headers) {
  const rows = Array.from(rowMap.values()).map((row) => finalizeRow(row, headers));
  return rows.sort(compareRows).map(addPosition);
}

function finalizeRow(row, headers) {
  const includedIds = Array.from(row.includedProductIds);
  const matches = headers.map((header) => includedIds.includes(header.productId));

  return {
    productId: row.productId,
    productGid: row.productGid,
    handle: row.handle,
    title: row.title,
    variantIds: row.variantIds,
    includedProductIds: includedIds,
    includedProductGids: includedIds.map(toProductGid),
    coverage: includedIds.length,
    weight: row.weight,
    matches,
  };
}

function compareRows(left, right) {
  if (left.coverage !== right.coverage) {
    return right.coverage - left.coverage;
  }

  if (left.weight !== right.weight) {
    return right.weight - left.weight;
  }

  return left.title.localeCompare(right.title);
}

function addPosition(row, index) {
  return {
    position: index + 1,
    ...row,
  };
}

function createSource(tabContext) {
  return {
    templateFile: tabContext.templateFile,
    sectionId: tabContext.sectionId,
    tabKey: tabContext.tabKey,
    compareTableAssigned: tabContext.compareTableAssigned,
    compareTableReference: tabContext.compareTableReference,
    productHandles: tabContext.products.map((product) => product.handle),
  };
}

function toProductGid(productId) {
  return `gid://shopify/Product/${productId}`;
}
