const METAOBJECT_UPSERT_MUTATION = `
  mutation MetaobjectUpsert($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
    metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
      metaobject {
        id
        handle
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const METAOBJECT_UPDATE_MUTATION = `
  mutation MetaobjectUpdate($id: ID!, $metaobject: MetaobjectUpdateInput!) {
    metaobjectUpdate(id: $id, metaobject: $metaobject) {
      metaobject {
        id
        handle
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const METAOBJECT_DELETE_MUTATION = `
  mutation MetaobjectDelete($id: ID!) {
    metaobjectDelete(id: $id) {
      deletedId
      userErrors {
        field
        message
      }
    }
  }
`;

export async function persistCompareTable(api, compareTable, compareMatrix) {
  const rowIds = [];

  for (const row of compareMatrix.rows) {
    const savedRow = await upsertCompareRow(api, compareTable, row);
    rowIds.push(savedRow.id);
  }

  await updateCompareTable(api, compareTable, compareMatrix, rowIds);
  await deleteObsoleteRows(api, compareTable, compareMatrix);

  return {
    compareTableHandle: compareTable.handle,
    rowCount: rowIds.length,
  };
}

async function upsertCompareRow(api, compareTable, row) {
  const existingRow = compareTable.existingRows.get(row.productGid);
  const handle = existingRow?.handle ?? createRowHandle(compareTable.handle, row.productId);
  const data = await api.graphql(METAOBJECT_UPSERT_MUTATION, {
    handle: { type: "compare_row", handle },
    metaobject: { fields: createRowFields(existingRow, row) },
  });

  throwOnUserErrors(data.metaobjectUpsert.userErrors);
  return data.metaobjectUpsert.metaobject;
}

async function updateCompareTable(api, compareTable, compareMatrix, rowIds) {
  const data = await api.graphql(METAOBJECT_UPDATE_MUTATION, {
    id: compareTable.id,
    metaobject: {
      fields: createCompareTableFields(compareTable, compareMatrix, rowIds),
    },
  });

  throwOnUserErrors(data.metaobjectUpdate.userErrors);
  return data.metaobjectUpdate.metaobject;
}

function createRowFields(existingRow, row) {
  const customLabel = existingRow?.customLabel ?? row.title;
  const title = existingRow?.title ?? customLabel;
  const categoryTitle = existingRow?.categoryTitle ?? "";

  return [
    createField("title", title),
    createField("category_title", categoryTitle),
    createField("item_product", row.productGid),
    createField("custom_label", customLabel),
    createField("included_in_products", JSON.stringify(row.includedProductGids)),
    createField("sort_order", String(row.position)),
  ];
}

function createCompareTableFields(compareTable, compareMatrix, rowIds) {
  const headerProducts = compareMatrix.headers.map((header) => header.productGid);

  return [
    createField("title", compareTable.title),
    createField("header_products", JSON.stringify(headerProducts)),
    createField("rows", JSON.stringify(rowIds)),
  ];
}

function createField(key, value) {
  return { key, value };
}

function createRowHandle(compareTableHandle, productId) {
  return `compare-row-${sanitizeHandle(compareTableHandle)}-${productId}`;
}

function sanitizeHandle(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function throwOnUserErrors(errors) {
  if (!errors?.length) {
    return;
  }

  const message = errors.map((error) => error.message).join("; ");
  throw new Error(message);
}

async function deleteObsoleteRows(api, compareTable, compareMatrix) {
  const activeProductIds = new Set(compareMatrix.rows.map((row) => row.productGid));
  const obsoleteRows = compareTable.existingRowList.filter((row) => !activeProductIds.has(row.itemProductId));

  for (const row of obsoleteRows) {
    const data = await api.graphql(METAOBJECT_DELETE_MUTATION, { id: row.id });
    throwOnUserErrors(data.metaobjectDelete.userErrors);
  }
}
