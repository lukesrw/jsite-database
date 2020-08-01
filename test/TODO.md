# Tests Needed

## Enhancements

Enhancements that I've implemented, but not written tests for,

-   _None_

## Bugs

Bugs that I've resolved, but not written tests against,

-   \$constraint columns (fixed in v5.6.4)
    -   Previous code didn't allow $constraint definitions in $define block
    -   Previous code treated $constraint definitions as $column definitions
        -   History table tried making fields for the foreign keys
        -   getAlter function saw \$constraint defitions as new columns
