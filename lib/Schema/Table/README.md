# Table

Extends Schema, inherits properties & methods.

See [createTable Operator](https://github.com/planetarydev/json-sql-builder2/tree/master/sql/operators/createTable) readme for json-sql-builder2 for schema help.

## Arguments

| Name         | Description                                                                            |
| ------------ | -------------------------------------------------------------------------------------- |
| TableBuilder | Instance of JSiteDatabase                                                              |
| schema       | json-sql-builder2 Object, or Function (recursively called until non-function returned) |
| name         | File name that the schema came from, used when schema doesn't provide a name           |

### Example

```js
const JSiteDatabase = require("jsite-database");
const Table = require("jsite-database/lib/Schema/Table/Table");

let Database = new JSiteDatabase();

// ...full definition
let Table1 = new Table(Database, {
    $table: "my_people_table",
    $define: {
        people_id: { $column: { $type: "INT", $default: 0 } },
        first_name: { $column: { $type: "VARCHAR", $size: 50, $notNull: true } },
        last_name: { $column: { $type: "VARCHAR", $size: 50, $notNull: true } },
        bio: { $column: { $type: "TEXT" } }
    }
});

// ...alternative method
let Table2 = new Table(
    Database,
    {
        people_id: { $column: { $type: "INT", $default: 0 } },
        first_name: { $column: { $type: "VARCHAR", $size: 50, $notNull: true } },
        last_name: { $column: { $type: "VARCHAR", $size: 50, $notNull: true } },
        bio: { $column: { $type: "TEXT" } }
    },
    "my_people_table"
);
```

## Properties

| Name | Description |
| ---- | ----------- |
| sql  | All SQL     |
