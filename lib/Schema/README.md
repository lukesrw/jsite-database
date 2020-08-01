# Schema

Extended by Table, View - enables generic handling of files.

## Arguments

| Name         | Description                                                                            |
| ------------ | -------------------------------------------------------------------------------------- |
| TableBuilder | Instance of JSiteDatabase                                                              |
| schema       | json-sql-builder2 Object, or Function (recursively called until non-function returned) |
| name         | File name that the schema came from, used when schema doesn't provide a name           |
| main         | Main property for definition ($select, $define, etc.)                                  |

## Properties

| Name         | Description                                                                            |
| ------------ | -------------------------------------------------------------------------------------- |
| TableBuilder | Instance of JSiteDatabase                                                              |
| schema       | json-sql-builder2 Object, or Function (recursively called until non-function returned) |
| name         | File name turned into usable schema name                                               |
| main         | Main property for definition ($select, $define, etc.)                                  |
| priority     | Priority for sorting, defaults to 1000                                                 |
