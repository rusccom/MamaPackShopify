import { createAdminApiClient } from "./src/admin-api-client.mjs";
import { buildCompareMatrix } from "./src/build-compare-matrix.mjs";
import { fetchBundleDetails } from "./src/fetch-bundle-details.mjs";
import { fetchFastBundleConfig } from "./src/fetch-fastbundle-config.mjs";
import { loadTabContext } from "./src/load-tab-context.mjs";
import { loadTargetCompareTable } from "./src/load-target-compare-table.mjs";
import { parseCliOptions } from "./src/parse-cli-options.mjs";
import { persistCompareTable } from "./src/persist-compare-table.mjs";
import { resolveBundleProducts } from "./src/resolve-bundle-products.mjs";

async function main() {
  try {
    const options = parseCliOptions(process.argv.slice(2));
    const result = await runSync(options);
    printResult(result, options.json);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

async function runSync(options) {
  const tabContext = await loadTabContext(options);
  const config = await fetchFastBundleConfig(options.storeDomain);
  const resolution = resolveBundleProducts(tabContext.products, config.baps);
  const details = await fetchBundleDetails(resolution.found, config, options);
  const compareMatrix = buildCompareMatrix({
    storeDomain: options.storeDomain,
    tabContext,
    bundleProducts: resolution.found,
    bundleDetails: details,
    missingProducts: resolution.missing,
  });

  if (!options.write) {
    return compareMatrix;
  }

  const api = await createAdminApiClient(options);
  const compareTable = await loadTargetCompareTable(api, tabContext, options);
  const persisted = await persistCompareTable(api, compareTable, compareMatrix);

  return {
    ...compareMatrix,
    persisted,
  };
}

function printResult(result, asJson) {
  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Section: ${result.source.sectionId}`);
  console.log(`Tab key: ${result.source.tabKey}`);
  console.log(`Compare table assigned: ${result.source.compareTableAssigned}`);
  console.log(`Headers: ${result.headers.length}`);
  console.log(`Rows: ${result.rows.length}`);
  console.log(`Missing bundle products: ${result.missingProducts.length}`);

  if (result.persisted) {
    console.log(`Updated compare table: ${result.persisted.compareTableHandle}`);
  }
}

await main();
