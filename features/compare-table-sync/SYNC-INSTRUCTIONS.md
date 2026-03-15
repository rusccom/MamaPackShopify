# Compare Table Sync

Эта инструкция описывает, как запускать локальную синхронизацию `MamaPack -> FastBundle -> compare_table`.

## Что делает синк

- Находит `tab_item` и связанные с ним `product_card`.
- По товарам таба получает состав FastBundle.
- Строит таблицу сравнения:
  - колонки = товары таба
  - строки = товары внутри бандлов
  - сортировка = по убыванию совпадений между бандлами
- Обновляет Shopify metaobjects:
  - `compare_table.header_products`
  - `compare_table.rows`
  - `compare_row.item_product`
  - `compare_row.custom_label`
  - `compare_row.category_title`
  - `compare_row.included_in_products`
  - `compare_row.sort_order`
- Удаляет старые `compare_row`, которые больше не входят в новую таблицу.

## Важные правила

- Источник истины для запуска: `live theme` или указанный `theme id`.
- Локальный `templates/page.json` не использовать, если продакшен уже отличается от репозитория.
- `--write` делает реальную запись в Shopify.
- При записи таблица полностью пересобирается.
- Если у строки тот же `item_product`, то сохраняются существующие ручные поля:
  - `title`
  - `custom_label`
  - `category_title`
- Если строка исчезает из нового состава бандлов, она удаляется.

## Что нужно перед запуском

- Shopify CLI должен быть установлен и авторизован.
- Нужен custom app access с scope:
  - `read_products`
  - `read_metaobjects`
  - `write_metaobjects`
- Токен должен лежать в файле:
  - `.shopify/sync-admin-token.txt`

Если токен лежит в другом месте, используй `--admin-token-file`.

## Где находится скрипт

Главный файл:

`features/compare-table-sync/sync-compare-table.mjs`

Запускать из корня репозитория.

## Базовый dry-run

Показывает, что будет построено, но ничего не пишет в Shopify:

```bash
node features/compare-table-sync/sync-compare-table.mjs \
  --store-domain c1e90d-4.myshopify.com \
  --live-theme \
  --tab-key 1 \
  --json
```

## Реальная запись в Shopify

```bash
node features/compare-table-sync/sync-compare-table.mjs \
  --store-domain c1e90d-4.myshopify.com \
  --live-theme \
  --tab-key 1 \
  --write \
  --json
```

## Если нужен конкретный theme

Если нужно читать не текущую live theme, а конкретную:

```bash
node features/compare-table-sync/sync-compare-table.mjs \
  --store-domain c1e90d-4.myshopify.com \
  --live-theme \
  --theme-id 158161928525 \
  --tab-key 1 \
  --json
```

Примечание:

- если `--theme-id` не указан, используется текущая `live theme`
- флаг `--live-theme` обязателен для чтения удалённой темы через Shopify CLI

## Если у таба не назначен compare_table

По умолчанию скрипт берёт `compare_table` из `tab_item.settings.compare_table`.

Если поле пустое, можно явно передать handle таблицы:

```bash
node features/compare-table-sync/sync-compare-table.mjs \
  --store-domain c1e90d-4.myshopify.com \
  --live-theme \
  --tab-key 2 \
  --compare-table-handle baby \
  --write \
  --json
```

Использовать это только осознанно. Скрипт перезапишет именно эту таблицу.

## Если в теме несколько MamaPack sections

Тогда нужно указать `section id`:

```bash
node features/compare-table-sync/sync-compare-table.mjs \
  --store-domain c1e90d-4.myshopify.com \
  --live-theme \
  --section-id mamapack_tabs_showcase_7PjxJY \
  --tab-key 1 \
  --json
```

## Локальный режим по файлу

Использовать только если точно нужно читать локальный JSON-шаблон:

```bash
node features/compare-table-sync/sync-compare-table.mjs \
  --store-domain c1e90d-4.myshopify.com \
  --template-file templates/page.json \
  --tab-key 1 \
  --json
```

Для продакшена этот режим не рекомендован.

## Порядок безопасного запуска

1. Проверить, что у нужного таба назначен правильный `compare_table`.
2. Сначала выполнить dry-run с `--json`.
3. Проверить:
   - правильный `tabKey`
   - правильный `sectionId`
   - правильные `headers`
   - правильное количество `rows`
4. Только после этого запускать с `--write`.
5. После записи проверить `compare_table` в Shopify admin.

## Как понять результат

В результате выводятся:

- `source.compareTableAssigned`
- `headers`
- `rows`
- `missingProducts`
- `persisted.compareTableHandle`
- `persisted.rowCount`

Если `missingProducts` не пустой, значит часть `product_card` не была найдена в FastBundle config.

## Что синк не делает

- Не назначает `compare_table` в `tab_item`.
- Не меняет theme files в Shopify.
- Не обновляет второй или третий таб автоматически.
- Не создаёт app UI.

## Быстрые команды

Dry-run первого таба:

```bash
node features/compare-table-sync/sync-compare-table.mjs --store-domain c1e90d-4.myshopify.com --live-theme --tab-key 1 --json
```

Запись первого таба:

```bash
node features/compare-table-sync/sync-compare-table.mjs --store-domain c1e90d-4.myshopify.com --live-theme --tab-key 1 --write --json
```

Запись таба без назначенной таблицы:

```bash
node features/compare-table-sync/sync-compare-table.mjs --store-domain c1e90d-4.myshopify.com --live-theme --tab-key 2 --compare-table-handle HANDLE --write --json
```

## Текущее поведение по данным

- Если `compare_table` уже содержит старые тестовые данные, синк их перезапишет.
- Если старые `compare_row` больше не нужны, синк их удалит.
- Если строка совпала по `item_product`, ручные подписи стараются сохраниться.


[REDACTED_API_KEY]
[REDACTED_SHARED_SECRET]
