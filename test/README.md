# Tests

## Test Cases

-   SQLite, with row auditing (db/1)
-   SQLite, with column auditing (db/2)
-   SQLite, with all auditing (db/3)
-   MySQL, with row auditing (mysql/1)
-   MySQL, with column auditing (mysql/2)
-   MySQL, with all auditing (mysql/3)

## Test Steps

-   Container Init -> (create an instance, tests set values)
-   Container Ready -> (after the ready, tests set values)
-   Container Inserts -> (run insert queries)
-   Container Updates -> (run update queries)
-   Container Delete -> (run delete queries)
-   Container Inserts -> (run insert queries)
-   Container Updates -> (run update queries)
-   Container Delete -> (run delete queries)
-   Container Auditing (row) -> (check auditing \_\_history table) - skipped when row auditing is not enabled
-   Container Auditing (column) -> (check auditing \_\_changes table) - skipped when column auditing is not enabled
-   Container Closing -> (close the container, tests set values)
-   Container Utilities -> (test the build-in utilities)

## Test Directories

## Example Mocha output:

    JSiteDatabase (sqlite, row - \path\to\jsite-database\test\private\db\1)
      Container Init
        √ 'Connection' is false
        √ 'tables' is undefined
        √ 'views' is undefined
        √ 'format' is empty object
        √ 'mysql' is empty object
        √ 'sql' is instance of json-sql-builder2
        √ 'audit' is set to "row"
        √ 'abs' is set at parent (test) directory
        √ 'files' is an object
        √ 'files'.'db' is set at db (test/private/db) directory
        √ 'files'.'tables' is set at tables (test/private/db/tables) directory
        √ 'files'.'single' is set to true
        √ 'utils' is an object
        √ 'utils'.'flattenObject' is a function
        √ 'utils'.'getDate' is a function
      JSiteDatabase (sqlite, row) - readying
        Container Ready
          √ 'Connection' is instance of sqlite3.Database
          √ 'tables' is an array
          √ 'tables' has a length of 4
          √ 'tables' is in priority order
          √ 'views' is an array
          √ 'views' has a length of 4
          √ 'views' is in priority order
          √ 'files' => 'single' has made individual files
          √ 'format' is empty object
          √ 'mysql' is empty object
          √ 'sql' is instance of json-sql-builder2
          √ 'audit' is set to "row"
          √ 'abs' is set at parent (test) directory
          √ 'files' is an object
          √ 'files'.'db' is set at db (test/private/db) directory
          √ 'files'.'tables' is set at tables (test/private/db/tables) directory
          √ 'files'.'single' is set to true
          √ 'utils' is an object
          √ 'utils'.'flattenObject' is a function
          √ 'utils'.'getDate' is a function
        JSiteDatabase (sqlite, row - queries)
          Container Inserts
            √ Insert row into 'tbl1' (123ms)
            √ Select 1 rows from 'tbl1'
            √ Insert row into 'tbl1' (113ms)
            √ Select 2 rows from 'tbl1'
            √ Insert row into 'tbl4' custom table (467ms)
            √ Select 2 rows from 'tbl4' custom table
          Container Updates
            √ Update row in 'tbl1' (115ms)
            √ Update row in 'tbl1' (126ms)
          Container Delete
            √ Deletes row in 'tbl1' (127ms)
          Container Inserts
            √ Insert row into 'tbl1' (127ms)
            √ Select 2 rows from 'tbl1'
            √ Insert row into 'tbl4' custom table (125ms)
            √ Select 2 rows from 'tbl4' custom table
          Container Updates
            √ Update row in 'tbl1' (126ms)
          Container Delete
            √ Deletes row in 'tbl1' (114ms)
        JSiteDatabase (sqlite, row) - audits
          Container Auditing (row)
            √ Inspect id__history__last property of audit
            √ Inspect id__history property of audit
            √ Inspect id__history__next property of audit
            √ Inspect id__updated property of audit
            √ Inspect id__last property of audit
            √ Inspect id property of audit
            √ Inspect id__next property of audit
            √ Inspect column1__updated property of audit
            √ Inspect column1__last property of audit
            √ Inspect column1 property of audit
            √ Inspect column1__next property of audit
            √ Inspect column2__updated property of audit
            √ Inspect column2__last property of audit
            √ Inspect column2 property of audit
            √ Inspect column2__next property of audit
            √ Inspect insert_date_time__updated property of audit
            √ Inspect insert_description__updated property of audit
            √ Inspect update_date_time__updated property of audit
            √ Inspect update_description__updated property of audit
            √ Inspect delete_date_time__updated property of audit
            √ Inspect delete_description__updated property of audit
            √ Inspect scd__event property of audit
          Container Auditing (column)
            - Inspect id__changes__last property of audit
            - Inspect id__changes property of audit
            - Inspect id__changes__next property of audit
            - Inspect id property of audit
            - Inspect field property of audit
            - Inspect value__last property of audit
            - Inspect value property of audit
            - Inspect value__next property of audit
            - Inspect scd__event property of audit
          Container Closing
            √ 'Connection' is false after disconnect
            √ 'tables' is an array
            √ 'tables' has a length of 4
            √ 'format' is empty object
            √ 'mysql' is empty object
            √ 'sql' is instance of json-sql-builder2
            √ 'audit' is set to "row"
            √ 'abs' is set at parent (test) directory
            √ 'files' is an object
            √ 'files'.'db' is set at db (test/private/db) directory
            √ 'files'.'tables' is set at tables (test/private/db/tables) directory
            √ 'files'.'single' is set to true
            √ 'utils' is an object
            √ 'utils'.'flattenObject' is a function
            √ 'utils'.'getDate' is a function
          Container Utilities
            √ 'flattenObject' utility test 1
            √ 'getDate' utility test 1
            √ 'getDate' utility test 2
            √ 'getDate' utility test 3

    JSiteDatabase (sqlite, column - \path\to\jsite-database\test\private\db\2)
      Container Init
        √ 'Connection' is false
        √ 'tables' is undefined
        √ 'views' is undefined
        √ 'format' is empty object
        √ 'mysql' is empty object
        √ 'sql' is instance of json-sql-builder2
        √ 'audit' is set to "column"
        √ 'abs' is set at parent (test) directory
        √ 'files' is an object
        √ 'files'.'db' is set at db (test/private/db) directory
        √ 'files'.'tables' is set at tables (test/private/db/tables) directory
        √ 'files'.'single' is set to false
        √ 'utils' is an object
        √ 'utils'.'flattenObject' is a function
        √ 'utils'.'getDate' is a function
      JSiteDatabase (sqlite, column) - readying
        Container Ready
          √ 'Connection' is instance of sqlite3.Database
          √ 'tables' is an array
          √ 'tables' has a length of 4
          √ 'tables' is in priority order
          √ 'views' is an array
          √ 'views' has a length of 4
          √ 'views' is in priority order
          √ 'files' => 'single' has not made individual files
          √ 'format' is empty object
          √ 'mysql' is empty object
          √ 'sql' is instance of json-sql-builder2
          √ 'audit' is set to "column"
          √ 'abs' is set at parent (test) directory
          √ 'files' is an object
          √ 'files'.'db' is set at db (test/private/db) directory
          √ 'files'.'tables' is set at tables (test/private/db/tables) directory
          √ 'files'.'single' is set to false
          √ 'utils' is an object
          √ 'utils'.'flattenObject' is a function
          √ 'utils'.'getDate' is a function
        JSiteDatabase (sqlite, column - queries)
          Container Inserts
            √ Insert row into 'tbl1' (115ms)
            √ Select 1 rows from 'tbl1'
            √ Insert row into 'tbl1' (131ms)
            √ Select 2 rows from 'tbl1'
            √ Insert row into 'tbl4' custom table (142ms)
            √ Select 2 rows from 'tbl4' custom table
          Container Updates
            √ Update row in 'tbl1' (194ms)
            √ Update row in 'tbl1' (122ms)
          Container Delete
            √ Deletes row in 'tbl1' (125ms)
          Container Inserts
            √ Insert row into 'tbl1' (112ms)
            √ Select 2 rows from 'tbl1'
            √ Insert row into 'tbl4' custom table (132ms)
            √ Select 2 rows from 'tbl4' custom table
          Container Updates
            √ Update row in 'tbl1' (130ms)
          Container Delete
            √ Deletes row in 'tbl1' (117ms)
        JSiteDatabase (sqlite, column) - audits
          Container Auditing (row)
            - Inspect id__history__last property of audit
            - Inspect id__history property of audit
            - Inspect id__history__next property of audit
            - Inspect id__updated property of audit
            - Inspect id__last property of audit
            - Inspect id property of audit
            - Inspect id__next property of audit
            - Inspect column1__updated property of audit
            - Inspect column1__last property of audit
            - Inspect column1 property of audit
            - Inspect column1__next property of audit
            - Inspect column2__updated property of audit
            - Inspect column2__last property of audit
            - Inspect column2 property of audit
            - Inspect column2__next property of audit
            - Inspect insert_date_time__updated property of audit
            - Inspect insert_description__updated property of audit
            - Inspect update_date_time__updated property of audit
            - Inspect update_description__updated property of audit
            - Inspect delete_date_time__updated property of audit
            - Inspect delete_description__updated property of audit
            - Inspect scd__event property of audit
          Container Auditing (column)
            √ Inspect id__changes__last property of audit
            √ Inspect id__changes property of audit
            √ Inspect id__changes__next property of audit
            √ Inspect id property of audit
            √ Inspect field property of audit
            √ Inspect value__last property of audit
            √ Inspect value property of audit
            √ Inspect value__next property of audit
            √ Inspect scd__event property of audit
          Container Closing
            √ 'Connection' is false after disconnect
            √ 'tables' is an array
            √ 'tables' has a length of 4
            √ 'format' is empty object
            √ 'mysql' is empty object
            √ 'sql' is instance of json-sql-builder2
            √ 'audit' is set to "column"
            √ 'abs' is set at parent (test) directory
            √ 'files' is an object
            √ 'files'.'db' is set at db (test/private/db) directory
            √ 'files'.'tables' is set at tables (test/private/db/tables) directory
            √ 'files'.'single' is set to false
            √ 'utils' is an object
            √ 'utils'.'flattenObject' is a function
            √ 'utils'.'getDate' is a function
          Container Utilities
            √ 'flattenObject' utility test 1
            √ 'getDate' utility test 1
            √ 'getDate' utility test 2
            √ 'getDate' utility test 3

    JSiteDatabase (sqlite, all - \path\to\jsite-database\test\private\db\3)
      Container Init
        √ 'Connection' is false
        √ 'tables' is undefined
        √ 'views' is undefined
        √ 'format' is empty object
        √ 'mysql' is empty object
        √ 'sql' is instance of json-sql-builder2
        √ 'audit' is set to "all"
        √ 'abs' is set at parent (test) directory
        √ 'files' is an object
        √ 'files'.'db' is set at db (test/private/db) directory
        √ 'files'.'tables' is set at tables (test/private/db/tables) directory
        √ 'files'.'single' is set to true
        √ 'utils' is an object
        √ 'utils'.'flattenObject' is a function
        √ 'utils'.'getDate' is a function
      JSiteDatabase (sqlite, all) - readying
        Container Ready
          √ 'Connection' is instance of sqlite3.Database
          √ 'tables' is an array
          √ 'tables' has a length of 4
          √ 'tables' is in priority order
          √ 'views' is an array
          √ 'views' has a length of 4
          √ 'views' is in priority order
          √ 'files' => 'single' has made individual files
          √ 'format' is empty object
          √ 'mysql' is empty object
          √ 'sql' is instance of json-sql-builder2
          √ 'audit' is set to "all"
          √ 'abs' is set at parent (test) directory
          √ 'files' is an object
          √ 'files'.'db' is set at db (test/private/db) directory
          √ 'files'.'tables' is set at tables (test/private/db/tables) directory
          √ 'files'.'single' is set to true
          √ 'utils' is an object
          √ 'utils'.'flattenObject' is a function
          √ 'utils'.'getDate' is a function
        JSiteDatabase (sqlite, all - queries)
          Container Inserts
            √ Insert row into 'tbl1' (168ms)
            √ Select 1 rows from 'tbl1'
            √ Insert row into 'tbl1' (185ms)
            √ Select 2 rows from 'tbl1'
            √ Insert row into 'tbl4' custom table (163ms)
            √ Select 2 rows from 'tbl4' custom table
          Container Updates
            √ Update row in 'tbl1' (151ms)
            √ Update row in 'tbl1' (132ms)
          Container Delete
            √ Deletes row in 'tbl1' (162ms)
          Container Inserts
            √ Insert row into 'tbl1' (142ms)
            √ Select 2 rows from 'tbl1'
            √ Insert row into 'tbl4' custom table (178ms)
            √ Select 2 rows from 'tbl4' custom table
          Container Updates
            √ Update row in 'tbl1' (149ms)
          Container Delete
            √ Deletes row in 'tbl1' (184ms)
        JSiteDatabase (sqlite, all) - audits
          Container Auditing (row)
            √ Inspect id__history__last property of audit
            √ Inspect id__history property of audit
            √ Inspect id__history__next property of audit
            √ Inspect id__updated property of audit
            √ Inspect id__last property of audit
            √ Inspect id property of audit
            √ Inspect id__next property of audit
            √ Inspect column1__updated property of audit
            √ Inspect column1__last property of audit
            √ Inspect column1 property of audit
            √ Inspect column1__next property of audit
            √ Inspect column2__updated property of audit
            √ Inspect column2__last property of audit
            √ Inspect column2 property of audit
            √ Inspect column2__next property of audit
            √ Inspect insert_date_time__updated property of audit
            √ Inspect insert_description__updated property of audit
            √ Inspect update_date_time__updated property of audit
            √ Inspect update_description__updated property of audit
            √ Inspect delete_date_time__updated property of audit
            √ Inspect delete_description__updated property of audit
            √ Inspect scd__event property of audit
          Container Auditing (column)
            √ Inspect id__changes__last property of audit
            √ Inspect id__changes property of audit
            √ Inspect id__changes__next property of audit
            √ Inspect id property of audit
            √ Inspect field property of audit
            √ Inspect value__last property of audit
            √ Inspect value property of audit
            √ Inspect value__next property of audit
            √ Inspect scd__event property of audit
          Container Closing
            √ 'Connection' is false after disconnect
            √ 'tables' is an array
            √ 'tables' has a length of 4
            √ 'format' is empty object
            √ 'mysql' is empty object
            √ 'sql' is instance of json-sql-builder2
            √ 'audit' is set to "all"
            √ 'abs' is set at parent (test) directory
            √ 'files' is an object
            √ 'files'.'db' is set at db (test/private/db) directory
            √ 'files'.'tables' is set at tables (test/private/db/tables) directory
            √ 'files'.'single' is set to true
            √ 'utils' is an object
            √ 'utils'.'flattenObject' is a function
            √ 'utils'.'getDate' is a function
          Container Utilities
            √ 'flattenObject' utility test 1
            √ 'getDate' utility test 1
            √ 'getDate' utility test 2
            √ 'getDate' utility test 3

    JSiteDatabase (mysql, row - \path\to\jsite-database\test\private\mysql\1)
      Container Init
        √ 'Connection' is false
        √ 'tables' is undefined
        √ 'views' is undefined
        √ 'format' is empty object
        √ 'mysql' is empty object
        √ 'sql' is instance of json-sql-builder2
        √ 'audit' is set to "row"
        √ 'abs' is set at parent (test) directory
        √ 'files' is an object
        √ 'files'.'db' is set at db (test/private/db) directory
        √ 'files'.'tables' is set at tables (test/private/db/tables) directory
        √ 'files'.'single' is set to false
        √ 'utils' is an object
        √ 'utils'.'flattenObject' is a function
        √ 'utils'.'getDate' is a function
      JSiteDatabase (mysql, row) - readying
        Container Ready
          √ 'Connection' is instance of MySQL Pool
          √ 'tables' is an array
          √ 'tables' has a length of 4
          √ 'tables' is in priority order
          √ 'views' is an array
          √ 'views' has a length of 4
          √ 'views' is in priority order
          √ 'files' => 'single' has not made individual files
          √ 'format' is empty object
          √ 'mysql' is empty object
          √ 'sql' is instance of json-sql-builder2
          √ 'audit' is set to "row"
          √ 'abs' is set at parent (test) directory
          √ 'files' is an object
          √ 'files'.'db' is set at db (test/private/db) directory
          √ 'files'.'tables' is set at tables (test/private/db/tables) directory
          √ 'files'.'single' is set to false
          √ 'utils' is an object
          √ 'utils'.'flattenObject' is a function
          √ 'utils'.'getDate' is a function
        JSiteDatabase (mysql, row - queries)
          Container Inserts
            √ Insert row into 'tbl1' (40ms)
            √ Select 1 rows from 'tbl1'
            √ Insert row into 'tbl1' (59ms)
            √ Select 2 rows from 'tbl1'
            √ Insert row into 'tbl4' custom table (90ms)
            √ Select 2 rows from 'tbl4' custom table
          Container Updates
            √ Update row in 'tbl1' (112ms)
            √ Update row in 'tbl1' (95ms)
          Container Delete
            √ Deletes row in 'tbl1' (100ms)
          Container Inserts
            √ Insert row into 'tbl1' (91ms)
            √ Select 2 rows from 'tbl1'
            √ Insert row into 'tbl4' custom table (162ms)
            √ Select 2 rows from 'tbl4' custom table
          Container Updates
            √ Update row in 'tbl1' (104ms)
          Container Delete
            √ Deletes row in 'tbl1' (169ms)
        JSiteDatabase (mysql, row) - audits
          Container Auditing (row)
            √ Inspect id__history__last property of audit
            √ Inspect id__history property of audit
            √ Inspect id__history__next property of audit
            √ Inspect id__updated property of audit
            √ Inspect id__last property of audit
            √ Inspect id property of audit
            √ Inspect id__next property of audit
            √ Inspect column1__updated property of audit
            √ Inspect column1__last property of audit
            √ Inspect column1 property of audit
            √ Inspect column1__next property of audit
            √ Inspect column2__updated property of audit
            √ Inspect column2__last property of audit
            √ Inspect column2 property of audit
            √ Inspect column2__next property of audit
            √ Inspect insert_date_time__updated property of audit
            √ Inspect insert_description__updated property of audit
            √ Inspect update_date_time__updated property of audit
            √ Inspect update_description__updated property of audit
            √ Inspect delete_date_time__updated property of audit
            √ Inspect delete_description__updated property of audit
            √ Inspect scd__event property of audit
          Container Auditing (column)
            - Inspect id__changes__last property of audit
            - Inspect id__changes property of audit
            - Inspect id__changes__next property of audit
            - Inspect id property of audit
            - Inspect field property of audit
            - Inspect value__last property of audit
            - Inspect value property of audit
            - Inspect value__next property of audit
            - Inspect scd__event property of audit
          Container Closing
            √ 'Connection' is false after disconnect
            √ 'tables' is an array
            √ 'tables' has a length of 4
            √ 'format' is empty object
            √ 'mysql' is empty object
            √ 'sql' is instance of json-sql-builder2
            √ 'audit' is set to "row"
            √ 'abs' is set at parent (test) directory
            √ 'files' is an object
            √ 'files'.'db' is set at db (test/private/db) directory
            √ 'files'.'tables' is set at tables (test/private/db/tables) directory
            √ 'files'.'single' is set to false
            √ 'utils' is an object
            √ 'utils'.'flattenObject' is a function
            √ 'utils'.'getDate' is a function
          Container Utilities
            √ 'flattenObject' utility test 1
            √ 'getDate' utility test 1
            √ 'getDate' utility test 2
            √ 'getDate' utility test 3

    JSiteDatabase (mysql, column - \path\to\jsite-database\test\private\mysql\2)
      Container Init
        √ 'Connection' is false
        √ 'tables' is undefined
        √ 'views' is undefined
        √ 'format' is empty object
        √ 'mysql' is empty object
        √ 'sql' is instance of json-sql-builder2
        √ 'audit' is set to "column"
        √ 'abs' is set at parent (test) directory
        √ 'files' is an object
        √ 'files'.'db' is set at db (test/private/db) directory
        √ 'files'.'tables' is set at tables (test/private/db/tables) directory
        √ 'files'.'single' is set to true
        √ 'utils' is an object
        √ 'utils'.'flattenObject' is a function
        √ 'utils'.'getDate' is a function
      JSiteDatabase (mysql, column) - readying
        Container Ready
          √ 'Connection' is instance of MySQL Pool
          √ 'tables' is an array
          √ 'tables' has a length of 4
          √ 'tables' is in priority order
          √ 'views' is an array
          √ 'views' has a length of 4
          √ 'views' is in priority order
          √ 'files' => 'single' has made individual files
          √ 'format' is empty object
          √ 'mysql' is empty object
          √ 'sql' is instance of json-sql-builder2
          √ 'audit' is set to "column"
          √ 'abs' is set at parent (test) directory
          √ 'files' is an object
          √ 'files'.'db' is set at db (test/private/db) directory
          √ 'files'.'tables' is set at tables (test/private/db/tables) directory
          √ 'files'.'single' is set to true
          √ 'utils' is an object
          √ 'utils'.'flattenObject' is a function
          √ 'utils'.'getDate' is a function
        JSiteDatabase (mysql, column - queries)
          Container Inserts
            √ Insert row into 'tbl1' (38ms)
            √ Select 1 rows from 'tbl1'
            √ Insert row into 'tbl1' (57ms)
            √ Select 2 rows from 'tbl1'
            √ Insert row into 'tbl4' custom table (106ms)
            √ Select 2 rows from 'tbl4' custom table
          Container Updates
            √ Update row in 'tbl1' (130ms)
            √ Update row in 'tbl1' (59ms)
          Container Delete
            √ Deletes row in 'tbl1' (58ms)
          Container Inserts
            √ Insert row into 'tbl1' (38ms)
            √ Select 2 rows from 'tbl1'
            √ Insert row into 'tbl4' custom table (54ms)
            √ Select 2 rows from 'tbl4' custom table
          Container Updates
            √ Update row in 'tbl1' (61ms)
          Container Delete
            √ Deletes row in 'tbl1' (66ms)
        JSiteDatabase (mysql, column) - audits
          Container Auditing (row)
            - Inspect id__history__last property of audit
            - Inspect id__history property of audit
            - Inspect id__history__next property of audit
            - Inspect id__updated property of audit
            - Inspect id__last property of audit
            - Inspect id property of audit
            - Inspect id__next property of audit
            - Inspect column1__updated property of audit
            - Inspect column1__last property of audit
            - Inspect column1 property of audit
            - Inspect column1__next property of audit
            - Inspect column2__updated property of audit
            - Inspect column2__last property of audit
            - Inspect column2 property of audit
            - Inspect column2__next property of audit
            - Inspect insert_date_time__updated property of audit
            - Inspect insert_description__updated property of audit
            - Inspect update_date_time__updated property of audit
            - Inspect update_description__updated property of audit
            - Inspect delete_date_time__updated property of audit
            - Inspect delete_description__updated property of audit
            - Inspect scd__event property of audit
          Container Auditing (column)
            √ Inspect id__changes__last property of audit
            √ Inspect id__changes property of audit
            √ Inspect id__changes__next property of audit
            √ Inspect id property of audit
            √ Inspect field property of audit
            √ Inspect value__last property of audit
            √ Inspect value property of audit
            √ Inspect value__next property of audit
            √ Inspect scd__event property of audit
          Container Closing
            √ 'Connection' is false after disconnect
            √ 'tables' is an array
            √ 'tables' has a length of 4
            √ 'format' is empty object
            √ 'mysql' is empty object
            √ 'sql' is instance of json-sql-builder2
            √ 'audit' is set to "column"
            √ 'abs' is set at parent (test) directory
            √ 'files' is an object
            √ 'files'.'db' is set at db (test/private/db) directory
            √ 'files'.'tables' is set at tables (test/private/db/tables) directory
            √ 'files'.'single' is set to true
            √ 'utils' is an object
            √ 'utils'.'flattenObject' is a function
            √ 'utils'.'getDate' is a function
          Container Utilities
            √ 'flattenObject' utility test 1
            √ 'getDate' utility test 1
            √ 'getDate' utility test 2
            √ 'getDate' utility test 3

    JSiteDatabase (mysql, all - \path\to\jsite-database\test\private\mysql\3)
      Container Init
        √ 'Connection' is false
        √ 'tables' is undefined
        √ 'views' is undefined
        √ 'format' is empty object
        √ 'mysql' is empty object
        √ 'sql' is instance of json-sql-builder2
        √ 'audit' is set to "all"
        √ 'abs' is set at parent (test) directory
        √ 'files' is an object
        √ 'files'.'db' is set at db (test/private/db) directory
        √ 'files'.'tables' is set at tables (test/private/db/tables) directory
        √ 'files'.'single' is set to false
        √ 'utils' is an object
        √ 'utils'.'flattenObject' is a function
        √ 'utils'.'getDate' is a function
      JSiteDatabase (mysql, all) - readying
        Container Ready
          √ 'Connection' is instance of MySQL Pool
          √ 'tables' is an array
          √ 'tables' has a length of 4
          √ 'tables' is in priority order
          √ 'views' is an array
          √ 'views' has a length of 4
          √ 'views' is in priority order
          √ 'files' => 'single' has not made individual files
          √ 'format' is empty object
          √ 'mysql' is empty object
          √ 'sql' is instance of json-sql-builder2
          √ 'audit' is set to "all"
          √ 'abs' is set at parent (test) directory
          √ 'files' is an object
          √ 'files'.'db' is set at db (test/private/db) directory
          √ 'files'.'tables' is set at tables (test/private/db/tables) directory
          √ 'files'.'single' is set to false
          √ 'utils' is an object
          √ 'utils'.'flattenObject' is a function
          √ 'utils'.'getDate' is a function
        JSiteDatabase (mysql, all - queries)
          Container Inserts
            √ Insert row into 'tbl1' (44ms)
            √ Select 1 rows from 'tbl1'
            √ Insert row into 'tbl1' (71ms)
            √ Select 2 rows from 'tbl1'
            √ Insert row into 'tbl4' custom table (88ms)
            √ Select 2 rows from 'tbl4' custom table
          Container Updates
            √ Update row in 'tbl1' (100ms)
            √ Update row in 'tbl1' (103ms)
          Container Delete
            √ Deletes row in 'tbl1' (60ms)
          Container Inserts
            √ Insert row into 'tbl1' (46ms)
            √ Select 2 rows from 'tbl1'
            √ Insert row into 'tbl4' custom table (40ms)
            √ Select 2 rows from 'tbl4' custom table
          Container Updates
            √ Update row in 'tbl1' (111ms)
          Container Delete
            √ Deletes row in 'tbl1' (166ms)
        JSiteDatabase (mysql, all) - audits
          Container Auditing (row)
            √ Inspect id__history__last property of audit
            √ Inspect id__history property of audit
            √ Inspect id__history__next property of audit
            √ Inspect id__updated property of audit
            √ Inspect id__last property of audit
            √ Inspect id property of audit
            √ Inspect id__next property of audit
            √ Inspect column1__updated property of audit
            √ Inspect column1__last property of audit
            √ Inspect column1 property of audit
            √ Inspect column1__next property of audit
            √ Inspect column2__updated property of audit
            √ Inspect column2__last property of audit
            √ Inspect column2 property of audit
            √ Inspect column2__next property of audit
            √ Inspect insert_date_time__updated property of audit
            √ Inspect insert_description__updated property of audit
            √ Inspect update_date_time__updated property of audit
            √ Inspect update_description__updated property of audit
            √ Inspect delete_date_time__updated property of audit
            √ Inspect delete_description__updated property of audit
            √ Inspect scd__event property of audit
          Container Auditing (column)
            √ Inspect id__changes__last property of audit
            √ Inspect id__changes property of audit
            √ Inspect id__changes__next property of audit
            √ Inspect id property of audit
            √ Inspect field property of audit
            √ Inspect value__last property of audit
            √ Inspect value property of audit
            √ Inspect value__next property of audit
            √ Inspect scd__event property of audit
          Container Closing
            √ 'Connection' is false after disconnect
            √ 'tables' is an array
            √ 'tables' has a length of 4
            √ 'format' is empty object
            √ 'mysql' is empty object
            √ 'sql' is instance of json-sql-builder2
            √ 'audit' is set to "all"
            √ 'abs' is set at parent (test) directory
            √ 'files' is an object
            √ 'files'.'db' is set at db (test/private/db) directory
            √ 'files'.'tables' is set at tables (test/private/db/tables) directory
            √ 'files'.'single' is set to false
            √ 'utils' is an object
            √ 'utils'.'flattenObject' is a function
            √ 'utils'.'getDate' is a function
          Container Utilities
            √ 'flattenObject' utility test 1
            √ 'getDate' utility test 1
            √ 'getDate' utility test 2
            √ 'getDate' utility test 3


    538 passing (45s)
    62 pending
