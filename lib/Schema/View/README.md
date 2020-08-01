# View

Extends Schema, inherits properties & methods.

See [createView Operator](https://github.com/planetarydev/json-sql-builder2/tree/master/sql/operators/createView) readme for json-sql-builder2 for schema help.

## Arguments

| Name         | Description                                                                            |
| ------------ | -------------------------------------------------------------------------------------- |
| TableBuilder | Instance of JSiteDatabase                                                              |
| schema       | json-sql-builder2 Object, or Function (recursively called until non-function returned) |
| name         | File name that the schema came from, used when schema doesn't provide a name           |

### Example

```js
const JSiteDatabase = require("jsite-database");
const View = require("jsite-database/lib/Schema/View/View");

let Database = new JSiteDatabase();

// ...full definition
let View1 = new View(Database, {
    $view: "my_view_name",
    $select: {
        first_name: 1,
        last_name: 1,
        total_likes: peopleLikes,
        $from: "people"
    }
});

// ...alternative method
let View2 = new View(
    Database,
    {
        first_name: 1,
        last_name: 1,
        total_likes: peopleLikes,
        $from: "people"
    },
    "my_view_name"
);
```

## Properties

| Name              | Description           |
| ----------------- | --------------------- |
| schema\_\_history | Schema history object |
| schema\_\_changes | Schema changes object |
| case              | Determined case       |
| sql               | All SQL               |
