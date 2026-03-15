const LIST_COMPARE_TABLES_QUERY = `
  query ListCompareTables {
    metaobjects(type: "compare_table", first: 20) {
      edges {
        node {
          handle
        }
      }
    }
  }
`;

const COMPARE_TABLE_QUERY = `
  query GetCompareTable($handle: MetaobjectHandleInput!) {
    metaobjectByHandle(handle: $handle) {
      id
      handle
      type
      displayName
      fields {
        key
        value
        references(first: 100) {
          edges {
            node {
              ... on Product {
                id
                handle
                title
              }
              ... on Metaobject {
                id
                handle
                type
                displayName
                fields {
                  key
                  value
                  reference {
                    ... on Product {
                      id
                      handle
                      title
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export async function loadTargetCompareTable(api, tabContext, options) {
  const handle = await resolveHandle(api, tabContext, options);
  const data = await api.graphql(COMPARE_TABLE_QUERY, {
    handle: { type: "compare_table", handle },
  });

  if (!data.metaobjectByHandle) {
    throw new Error(`Compare table ${handle} was not found.`);
  }

  return createCompareTableRecord(data.metaobjectByHandle);
}

async function resolveHandle(api, tabContext, options) {
  if (options.compareTableHandle) {
    return options.compareTableHandle;
  }

  if (tabContext.compareTableReference) {
    return tabContext.compareTableReference;
  }

  return resolveSingleCompareTable(api);
}

async function resolveSingleCompareTable(api) {
  const data = await api.graphql(LIST_COMPARE_TABLES_QUERY);
  const handles = data.metaobjects.edges.map((edge) => edge.node.handle);

  if (handles.length !== 1) {
    throw new Error("Assign compare_table to the tab or provide --compare-table-handle.");
  }

  return handles[0];
}

function createCompareTableRecord(metaobject) {
  const rows = readRowRecords(metaobject.fields);

  return {
    id: metaobject.id,
    handle: metaobject.handle,
    title: readFieldValue(metaobject.fields, "title") ?? metaobject.displayName ?? metaobject.handle,
    existingRowList: rows,
    existingRows: new Map(rows.map((row) => [row.itemProductId, row])),
  };
}

function readRowRecords(fields) {
  const rowsField = fields.find((field) => field.key === "rows");
  const rowNodes = rowsField?.references?.edges.map((edge) => edge.node) ?? [];
  return rowNodes.map(createRowRecord);
}

function createRowRecord(metaobject) {
  const fields = metaobject.fields ?? [];
  const itemProductField = fields.find((field) => field.key === "item_product");

  return {
    id: metaobject.id,
    handle: metaobject.handle,
    itemProductId: itemProductField?.value ?? "",
    title: readFieldValue(fields, "title"),
    categoryTitle: readFieldValue(fields, "category_title"),
    customLabel: readFieldValue(fields, "custom_label"),
  };
}

function readFieldValue(fields, key) {
  return fields.find((field) => field.key === key)?.value ?? null;
}
