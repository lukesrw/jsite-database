# JSite Database

## Installation

### npm

```cmd
npm install jsite-database
```

## Usage

```js
const path = require("path");
const JSiteDatabase = require("jsite-database");

/**
 * Initiate Container
 */
let Database1 = new JSiteDatabase();

// ...or with options,
let Database2 = new JSiteDatabase({
    format: {
        indent: "    "
    },
    mysql: {
        host: "localhost",
        user: "AzureDiamond",
        password: "hunter2",
        database: "reddit"
    },
    sql: {
        language: "mysql",
        options: {
            quoteIdentifiers: true
        }
    },
    audit: "column",
    files: {
        db: path.join(__dirname, "private", "mysql")
    }
});

/**
 * Start container
 */
Database1.ready()
    .then(() => {
        // Database ready
    })
    .catch(console.log);
```

## Documentation

### Options

| Name   | Type (default)                                                                                                                           | Description                                         |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| format | [Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) (`{}`)                                 | Arguments for "sql-formatter" module                |
| mysql  | [Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object) (`{}`)                                 | Arguments for "mysql" module                        |
| sql    | [Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array) (`{ language: "sqlite", options: {} }`) | Language & arguments for "json-sql-builder2" module |
| audit  | [String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions) (`"row"`)                                          | Desired auditing method (see "Options (audit)")     |
| files  | [Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions) (`{}`)                                             | Custom file location                                |

#### Options (audit)

JSiteDatabase has two built-in audit methods (`"row"` and `"column"`), "row" will setup full [slowly changing dimension](https://en.wikipedia.org/wiki/Slowly_changing_dimension#Type_4:_add_history_table) (SCD) tables - these take the core structure of SCD 4, with some improvements. "column" will track individual field changes - this is, most of the time, worse than "row". You can also pass `"all"` to enable both auditing methods.

##### Row (table\_\_history)

| Field                 | Description                                       |
| --------------------- | ------------------------------------------------- |
| id\_\_history\_\_last | ID of previous SCD row for this record            |
| id\_\_history         | ID of current SCD row for this record             |
| id\_\_history\_\_next | ID of next SCD row for this record                |
| (column)\_\_updated   | Whether the (column) updated in this change (1/0) |
| (column)\_\_last      | Previous value for the (column) for this record   |
| (column)              | Current value for the (column) for this record    |
| (column)\_\_next      | Next value for the (column) for this record       |

##### Column (table\_\_changes)

| Field                 | Description                                              |
| --------------------- | -------------------------------------------------------- |
| id\_\_changes\_\_last | ID of previous changes row for this field in this record |
| id\_\_changes         | ID of current changes row for this field in this record  |
| id\_\_changes\_\_next | ID of next changes row for this field in this record     |
| id                    | Primary key for this record                              |
| field                 | Field name being changed in this record                  |
| value\_\_last         | Previous value for this field in this record             |
| value                 | Current value for this field in this record              |
| value\_\_next         | Next value for this field in this record                 |

##### Both (table\_\_history, table\_\_changes)

Both auditing tables contain the following SCD columns,

| Field           | Description                                                                  |
| --------------- | ---------------------------------------------------------------------------- |
| scd\_\_start    | Datetime (or timestamp in SQLite) for this record being used (EffecitveFrom) |
| scd\_\_end      | Datetime (or timestamp in SQLite) for this record being used (EffectiveTo)   |
| scd\_\_duration | Number of seconds this record was active for                                 |
| scd\_\_event    | SQL event that caused this record (insert, update, delete)                   |

### Files

By default the file location will be: `<current dir>/private/db/` (the location can be changed with the "files" option, see above) inside of here, the module will create the following structure:

```txt
└───private
    └───db
        │   index.db
        │
        ├───sql
        │       alter.sql
        │       custom.sql
        │       tables.sql
        │       views.sql
        │
        ├───tables
        │       tables1.json
        │       tables2.json
        │       tables3.js
        │       tbl1.sql
        │       tbl2.sql
        │       tbl3.sql
        │       tbl4.sql
        │
        └───views
                view1.json
                view1.sql
                view2.json
                view2.sql
                view3.sql
                view4.js
                view4.sql
```

By default the `tables` directory will be empty, you can populate this with your table schema files, these should be in JSON format. You can prefix the file with an underscore (i.e. `_tables3.json`) if you do not want it to be built.

* * *

`index.db` will only exist if the container has been started using sqlite

* * *

By default the `tables.sql` file will contain all of the SQL required to make your database schema, each table and trigger will use "IF NOT EXISTS", to prevent duplication or accidental removal of tables in the database. You can inspect this file to see exactly what is being executed during the `.ready()` process.

* * *

By default the `alter.sql` file will not be created on first startup, this file is created when the module notices differences between your database and your schema files. This file will contain the SQL needed to alter your database from what exists to what the schema describes - beware that this is only basic, it cannot handle columns being renamed or datatypes changing (currently, datatypes is an enhancement I'm looking to add). You can inspect this file to see exactly what is being executed during the `.ready()` process.

### Tables

Your tables schema files should be in JSON format and follow the json-sql-builder format for the `.$createTable()` method (see [their documentation](https://github.com/planetarydev/json-sql-builder2/tree/master/sql/operators/createTable)). An example of this format is the following:

```json
{
    "$table": "my_table_name",
    "$define": {
        "column_name": {
            "$column": {
                "$type": "VARCHAR",
                "$size": 11
            }
        }
    }
}
```

Each JSON file can contain multiple tables:

```json
[
    {
        "$table": "my_table_name1",
        "$define": {
            "column_name": {
                "$column": {
                    "$type": "VARCHAR",
                    "$size": 11
                }
            }
        }
    },
    {
        "$table": "my_table_name2",
        "$define": {
            "column_name": {
                "$column": {
                    "$type": "VARCHAR",
                    "$size": 11
                }
            }
        }
    }
]
```

You can ommit the `$table` and `$define` option, if your JSON file has only one table. This will set `$define` to your JSON and `$table` to the name of the JSON file (without the .json), as an example:

#### my_table_name3.json

```json
{
    "column_name": {
        "$column": {
            "$type": "VARCHAR",
            "$size": 11
        }
    }
}
```

...will be turned into...

```json
{
    "$table": "my_table_name3",
    "$define": {
        "column_name": {
            "$column": {
                "$type": "VARCHAR",
                "$size": 11
            }
        }
    }
}
```

Under the `$define` property you can supply a priority (named as `$priority`), this will sort the table in the produced SQL file/executed queries. This is supplied along with columns so that it can be used in the minimal file format, shown above.

## Todo

List of things that I'm looking to add to the module, this list is not in priority order.

-   Detection of datatype changes in alter

    -   Method for noticing that a column has changed datatype between the existing database and the provided schema, and automatically updating this through the `alter.sql` file

-   Support for further database software

    -   json-sql-builder supports MySQL, MariaDB, PostgreSQL, SQLite, Oracle, and Microsoft SQL Server - currently this module only supports MySQL, MariaDB and SQLite
    -   sql-formatter supports "Standard SQL", Couchbase N1QL, IMB DB2, and Oracle PL/SQL - currently this module only supports "Standard SQL"

-   Further SCD support

    -   Currently "audit" supports "row" and "column" - update the auditing to cover all SCD methods ("SCD2", "SCD3", etc.) to allow more flexibility with existing systems

-   Built-in validation

    -   Allow end-users to pass an object into the module and have it validated against the schema, for instance an object with the property "column_name" would have the value checked against the "column_name" in the table and checked for type, length, etc.

-   Implementation of previous version "get", "put", "patch", "delete"
    -   Previous versions of this module had methods for get/put/patch/delete that allowed data to be safely modified in the database by providing a table and then the changes requested - checking for SQL injection, column names, etc.
