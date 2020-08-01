module.exports = class Table extends require("../Schema") {
    /**
     * Table representation in JSiteDatabase
     * Handles building sql/triggers/etc.
     *
     * @param {object} properties Properties for building table
     */
    constructor(properties) {
        super(
            Object.assign(properties, {
                main: "$define"
            })
        );

        try {
            /**
             * Ensure schema set properly (chjecks $table, $define, and $columns)
             */
            if (!Object.prototype.hasOwnProperty.call(this.schema, "$table")) {
                throw new Error("Missing $table in schema");
            }
            if (typeof this.schema.$table !== "string") {
                throw new Error("Invalid $table in schema");
            }
            if (!Object.prototype.hasOwnProperty.call(this.schema, "$define")) {
                throw new Error(`Missing $define in ${this.schema.$table} schema`);
            }
            if (typeof this.schema.$define !== "object") {
                throw new Error(`Invalid $define in ${this.schema.$table} schema`);
            }

            Object.keys(this.schema.$define).forEach(column => {
                if (column === "$column") throw new Error("Invalid column name ($column used)");

                if (Object.prototype.hasOwnProperty.call(this.schema.$define[column], "$column")) {
                    if (typeof this.schema.$define[column].$column !== "object") {
                        throw new Error(`Invalid $column (non-object) in "${column}" definition`);
                    }
                } else if (Object.prototype.hasOwnProperty.call(this.schema.$define[column], "$constraint")) {
                    if (typeof this.schema.$define[column].$constraint !== "object") {
                        throw new Error(`Invalid $constraint (non-object) in "${column}" definition`);
                    }
                } else {
                    throw new Error(`Missing $column/$constraint in "${column}" definition`);
                }
            });

            /**
             * Build SQL from the various tables (normal, history, changes)
             * Filter the schema, just in case it hasn't been used
             * Then replace placeholders in the returned string
             */
            this.sql = this.TableBuilder.formatSQL(
                `${[this.buildSchema(), this.buildHistorySchema(), this.buildChangesSchema()]
                    .filter(schema => schema)
                    .map(sql => this.replacePlaceholders(sql))
                    .join(";")};`
            );

            /**
             * Append the insert, update, and delete triggers
             */
            this.sql += this.getInsertTrigger(this.TableBuilder.audit);
            this.sql += this.getUpdateTrigger(this.TableBuilder.audit);
            this.sql += this.getDeleteTrigger(this.TableBuilder.audit);

            this.sql = this.sql.replace(/^(\)|END);/gmu, "$1;\n");

            /**
             * This is a hack...
             *
             * ...the json-sql-builder module doesn't support the "AUTOINCREMENT" keyword in SQLite
             * So this will return any primary key field into autoincrement.
             * Hopefully support for this is added at some point.
             */
            if (this.TableBuilder.getLanguage() === "sqlite") {
                this.sql = this.sql.replace(/PRIMARY KEY/gu, "PRIMARY KEY AUTOINCREMENT");
            }
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * Build the default schema for the table
     *
     * @returns {string} Built schema object
     */
    buildSchema() {
        /**
         * Set "IF NOT EXISTS" flag for the table
         */
        this.schema.$ine = true;

        /**
         * Retrieve the case for the given table schema
         */
        let case_config = this.case;
        if (typeof case_config.table !== "object") case_config.table = this.getCase(this.schema.$table);
        if (typeof case_config.column !== "object") case_config.column = this.getCase(Object.keys(this.schema.$define));
        if (case_config.table.join.length === 0 && case_config.column.join.length > 0) {
            case_config.table.join = case_config.column.join;
        }

        /**
         * has_primary (False/String) name of primary key column, if any exists
         * Determines whether this.schema contains a $primary column, to insert our own
         */
        let primary = this.getPrimary();
        if (primary === false && !Object.prototype.hasOwnProperty.call(this.schema.$define, this.setCase(["id"]))) {
            this.schema.$define = Object.assign(
                {
                    [this.setCase(["id"])]: {
                        $column: {
                            $autoInc: true,
                            $primary: true,
                            $type: "INTEGER"
                        }
                    }
                },
                this.schema.$define
            );

            /**
             * Remove $autoInc if the specific driver does not support it
             */
            if (!this.supports("$column", "$autoInc")) {
                delete this.schema.$define[this.setCase(["id"])].$column.$autoInc;
            }
        }

        /**
         * Loop through created/updated, and ""/"_desc", add to table this.schema, depending on is_lower_case
         * If any of these columns already exists, they will not be added or modified at all
         */
        let suffixes = [["date", "time"], ["description"]];
        [["insert"], ["update"], ["delete"]].forEach(col => {
            suffixes.forEach(suffix => {
                if (!Object.prototype.hasOwnProperty.call(this.schema.$define, this.setCase(col.concat(suffix)))) {
                    if (suffix.indexOf("time") > -1) {
                        /**
                         * Time columns datatype definition (default to now, not null, as datetime)
                         */
                        this.schema.$define[this.setCase(col.concat(suffix))] = {
                            $column: {
                                $default: this.getTime(),
                                $notNull: true,
                                $type: "DATETIME"
                            }
                        };
                    } else {
                        /**
                         * Description columns datatype definition (default to no description, 127 size, as varchar)
                         */
                        this.schema.$define[this.setCase(col.concat(suffix))] = {
                            $column: {
                                $default: "'No Description'",
                                $size: 127,
                                $type: "VARCHAR"
                            }
                        };
                    }

                    /**
                     * If the column is a delete column, remove the default/null, as these aren't wanted
                     */
                    if (col[0] === "delete") {
                        delete this.schema.$define[this.setCase(col.concat(suffix))].$column.$notNull;
                        delete this.schema.$define[this.setCase(col.concat(suffix))].$column.$default;
                    }
                }
            });
        });

        return this.TableBuilder.sql.$createTable(this.schema);
    }

    /**
     * Build the schema for the history version of the table
     *
     * @returns {string} Built schema object
     */
    buildHistorySchema() {
        /**
         * If we're not using this kind of audit, return empty string
         */
        if (this.TableBuilder.audit !== "all" && this.TableBuilder.audit !== "row") return "";

        this.schema_history = JSON.parse(JSON.stringify(this.schema));

        /**
         * Filter out constraints
         */
        Object.keys(this.schema_history.$define).forEach(column => {
            if (!Object.prototype.hasOwnProperty.call(this.schema_history.$define[column], "$column")) {
                delete this.schema_history.$define[column];
            }
        });

        this.schema_history.$table = this.setCase([this.schema.$table, true, "history"], this.case.table);

        /**
         * Create new $define property to map table__history onto
         * Begin with the id__history/__last and __next columns
         */
        let $define = this.getSecondaryDefinition("history");

        /**
         * Add history columns for each column in the existing this.schema,
         * column__updated - whether or not the value changed in this action
         * column__last - what this value used to be (null on new)
         * column - what this value is now (null on delete)
         * column__next - what this value was next (null on current)
         */
        Object.keys(this.schema_history.$define).forEach(column => {
            if (column !== this.setCase(["id", true, "history"])) {
                delete this.schema_history.$define[column].$column.$primary;
                delete this.schema_history.$define[column].$column.$autoInc;
            }
            delete this.schema_history.$define[column].$column.$default;
            delete this.schema_history.$define[column].$column.$notNull;
            delete this.schema_history.$define[column].$column.$unique;

            $define[this.setCase([column, true, "updated"])] = {
                $column: {
                    $default: "0",
                    $notNull: true,
                    $size: 1,
                    $type: "TINYINT"
                }
            };
            $define[this.setCase([column, true, "last"])] = this.schema_history.$define[column];
            $define[column] = this.schema_history.$define[column];
            $define[this.setCase([column, true, "next"])] = this.schema_history.$define[column];
        });

        /**
         * Assign columns for SCD time and method tracking at end of history table,
         * scd__start - what time the record started being used as primary
         * scd__end - what time the record stopped being used as primary
         * scd__duration - how many seconds this record was used as primary
         * scd__event - what event created this record (insert, update, delete)
         */
        this.schema_history.$define = Object.assign($define, this.getSCDDefinition());

        return this.TableBuilder.sql.$createTable(this.schema_history);
    }

    /**
     * Get definitions for other table id/id_last/next
     *
     * @param {string} type Type of table
     * @returns {object} Column definitions
     */
    getSecondaryDefinition(type) {
        let object = {
            [this.setCase(["id", true, type, true, "last"])]: {
                $column: {
                    $type: "INTEGER"
                }
            },
            [this.setCase(["id", true, type])]: {
                $column: {
                    $autoInc: true,
                    $notNull: true,
                    $primary: true,
                    $type: "INTEGER"
                }
            },
            [this.setCase(["id", true, type, true, "next"])]: {
                $column: {
                    $type: "INTEGER"
                }
            }
        };

        if (!this.supports("$column", "$autoInc")) delete object[this.setCase(["id", true, type])].$column.$autoInc;

        return object;
    }

    /**
     * Build schema for changes version of the table
     *
     * @returns {string} Built table schema
     */
    buildChangesSchema() {
        /**
         * If audit isn't this kind, return blank
         */
        if (this.TableBuilder.audit !== "all" && this.TableBuilder.audit !== "column") return "";

        this.schema_changes = JSON.parse(JSON.stringify(this.schema));
        this.schema_changes.$table = this.setCase([this.schema.$table, true, "changes"], this.case.table);

        /**
         * This audit style is a lot easier from a code point of view
         * ...but produces way more SQL (and is a bad audit method 99% of the time)
         */
        this.schema_changes.$define = Object.assign(
            this.getSecondaryDefinition("changes"),
            {
                [this.setCase([this.getPrimary()])]: JSON.parse(JSON.stringify(this.schema.$define[this.getPrimary()])),
                [this.setCase(["field"])]: {
                    $column: {
                        $notNull: true,
                        $size: 255,
                        $type: "VARCHAR"
                    }
                },
                [this.setCase(["value", true, "last"])]: {
                    $column: {
                        $type: "LONGTEXT"
                    }
                },
                [this.setCase(["value"])]: {
                    $column: {
                        $type: "LONGTEXT"
                    }
                },
                [this.setCase(["value", true, "next"])]: {
                    $column: {
                        $type: "LONGTEXT"
                    }
                },
                [this.setCase(["scd", true, "start"])]: {
                    $column: {
                        $type: "DATETIME"
                    }
                },
                [this.setCase(["scd", true, "end"])]: {
                    $column: {
                        $type: "DATETIME"
                    }
                }
            },
            this.getSCDDefinition()
        );

        delete this.schema_changes.$define[this.getPrimary()].$column.$autoInc;
        delete this.schema_changes.$define[this.getPrimary()].$column.$primary;

        return this.TableBuilder.sql.$createTable(this.schema_changes);
    }

    /**
     * Get SCD column definitions
     *
     * @returns {object} Object with column defitions
     */
    getSCDDefinition() {
        return {
            [this.setCase(["scd", true, "start"])]: {
                $column: {
                    $type: "DATETIME"
                }
            },
            [this.setCase(["scd", true, "end"])]: {
                $column: {
                    $type: "DATETIME"
                }
            },
            [this.setCase(["scd", true, "duration"])]: {
                $column: {
                    $type: "INTEGER"
                }
            },
            [this.setCase(["scd", true, "event"])]: {
                $column: {
                    $notNull: true,
                    $size: 6,
                    $type: "CHAR"
                }
            }
        };
    }

    /**
     * Find the primary key in the schema, if one exists
     *
     * @returns {bool|string} False, or name of primary key
     */
    getPrimary() {
        let key = false;

        Object.keys(this.schema.$define).some(column => {
            if (
                Object.prototype.hasOwnProperty.call(this.schema.$define[column], "$column") &&
                Object.prototype.hasOwnProperty.call(this.schema.$define[column].$column, "$primary") &&
                this.schema.$define[column].$column.$primary
            ) {
                key = column;

                return true;
            }

            return false;
        });

        return key;
    }

    /**
     * Find out whether driver supports the specific helper
     *
     * @param {string} operator Name of operator
     * @param {string} helper Name of helper (feature)
     * @returns {bool} Whether driver supports helper
     */
    supports(operator, helper) {
        return (
            Object.keys(
                this.TableBuilder.sql._operators[operator].__getTypeBasedSyntax__("Object").__registeredHelpers__
            ).indexOf(helper) > -1
        );
    }

    /**
     * Set the case for a specific set of words
     *
     * @param {array} words String of words/parts
     * @param {object} config Specific case config
     * @returns {string} String with set case
     */
    setCase(words, config) {
        let char_index = 1;

        if (config === undefined) config = this.case.column;
        if (typeof words === "string") words = [words];

        return words
            .map((word, word_i) => {
                /**
                 * If the part is true or false, insert an additional spacer
                 * If the part is true, add a place at the next part
                 */
                if (word === true || word === false) {
                    if (word === true) words[word_i + 1] = (config.join.length ? config.join : "_") + words[word_i + 1];

                    return true;
                }

                char_index = 1;

                /**
                 * Set upper/pascal/specific cases of part (id, scd, etc.)
                 */
                if (config.type === "upper" || (config.type === "pascal" && (word === "id" || word === "scd"))) {
                    return word.toUpperCase();
                }

                /**
                 * Set camel/pascal cases of part
                 */
                if ((config.type === "camel" && word_i > 0) || config.type === "pascal") {
                    if (word.substr(0, 1) === (config.join.length ? config.join : "_")) char_index = 2;

                    return word.substr(0, char_index).toUpperCase() + word.substr(char_index);
                }

                return word;
            })
            .filter(word => {
                /**
                 * Filter out those parts where part is not true
                 */
                return word !== true;
            })
            .join(config.join);
    }

    /**
     * Determine the case of a given example string
     *
     * @param {string} example Example string
     * @returns {object} Case object
     */
    getCase(example) {
        let config = {
            join: [],
            type: []
        };

        if (Array.isArray(example)) {
            example.forEach(test => {
                test = this.getCase(test);
                if (config.type.indexOf(test.type) === -1) config.type.push(test.type);
                if (config.join.indexOf(test.join) === -1) config.join.push(test.join);
            });

            if (config.type.indexOf("upper") > -1 && config.type.indexOf("pascal") > -1) {
                config.type.splice(config.type.indexOf("upper"), 1);
            }

            if (config.type.length > 1) throw Error(`Unable to getCase, mixed types (${config.type.join(", ")})`);
            if (config.join.length > 1) throw Error(`Unable to getCase, mixed join (${config.join.join(", ")})`);

            return {
                join: config.join[0],
                type: config.type[0]
            };
        }

        config.join = example.replace(/([a-z0-9]+)/giu, "").substr(0, 1);

        if (example.toLowerCase() === example) {
            /**
             * If the word is fully lower, the case is lower
             */
            config.type = "lower";
            if (config.join.length === 0) config.join = "_";
        } else if (example.toUpperCase() === example) {
            /**
             * If the word is fully upper, the case is upper
             */
            config.type = "upper";
            if (config.join.length === 0) config.join = "_";
        } else if (example.substr(0, 1).toUpperCase() === example.substr(0, 1)) {
            /**
             * If the first character is uppercase in both, the case is pascal
             */
            config.type = "pascal";
        } else {
            /**
             * Otherwise the case is mixed, but not pascal - so it's camel
             */
            config.type = "camel";
        }

        return config;
    }

    /**
     * Retrieve trigger create line for given event/when part
     *
     * @param {string} event Name of the event
     * @param {string} [when="AFTER"] Whether it's AFTER/BEFORE
     * @returns {string} First line of SQL trigger
     */
    getTriggerLine(event, when = "AFTER") {
        return `DROP TRIGGER IF EXISTS ${this.TableBuilder.getEscaped(
            this.setCase([this.schema.$table, true, event], this.case.table),
            true
        )};

CREATE TRIGGER IF NOT EXISTS ${this.TableBuilder.getEscaped(
            this.setCase([this.schema.$table, true, event], this.case.table),
            true
        )} ${when} ${event.toUpperCase()} ON ${this.TableBuilder.getEscaped(this.schema.$table, true)}`;
    }

    /**
     * Retrieve the colums in the table, with included parts (if any provided)
     *
     * @param {array} [parts=[]] Array of item parts to include
     * @param {boolean} [escape=true] Whether to escape the part
     * @returns {array} Columns for table
     */
    getColumns(parts = [], escape = true) {
        return Object.keys(this.schema.$define)
            .filter(field => {
                return Object.prototype.hasOwnProperty.call(this.schema.$define[field], "$column");
            })
            .map(column => {
                column = this.setCase([column].concat(parts));
                if (escape) column = this.TableBuilder.getEscaped(column);

                return column;
            });
    }

    /**
     * Retrieve a comparison SQL string for a column
     * This will check whether the value has changed at all
     *
     * @param {string} column Specific column to compare
     * @param {string} [event=false] Event to build comparison on
     * @param {boolean} [is_update=false] Whether this change is update only (for update_date_time, etc.)
     * @param {boolean} [is_delete=false] Whether this change is delete only (for delete_date_time, etc.)
     * @returns {string} Comparison string, given the arguments
     */
    getColumnComparison(column, event = false, is_update = false, is_delete = false) {
        /**
         * If we only want to trigger on update_date_time, return 0 unless that is the given column
         */
        if (is_update) return column === this.TableBuilder.getEscaped(this.setCase(["update", "date", "time"])) ? 1 : 0;

        /**
         * If we only want to trigger on delete_date_time, return 0 unless that is the given column
         */
        if (is_delete) return column === this.TableBuilder.getEscaped(this.setCase(["delete", "date", "time"])) ? 1 : 0;

        /**
         * If the event is "simple" (insert/delete) return easy string
         */
        if (event === "insert") return `(NEW.${column} IS NOT NULL)`;
        if (event === "delete") return `(OLD.${column} IS NOT NULL)`;

        /**
         * If the event is more complicated, include full comparison of before/after
         * This checks for string AND null, because SQL doesn't include that as change
         */
        let sql = [];
        // new value is not old value
        sql.push(`(NEW.${column} != OLD.${column})`);
        // new value is not null and old value was
        sql.push(`(NEW.${column} IS NOT NULL AND OLD.${column} IS NULL)`);
        // new value is null and old value was not
        sql.push(`(NEW.${column} IS NULL AND OLD.${column} IS NOT NULL)`);

        return `(${sql.join(" OR ")})`;
    }

    /**
     * Retrieve list of comparisons for columns in the table
     *
     * @param {string} [event=false] Event to get comparisons for
     * @param {boolean} [is_update=false] Whether this change is update only (only update_date_time)
     * @param {boolean} [is_delete=false] Whether this change is delete only (only delete_date_time)
     * @returns {array} Array of column comparisons for the columns in the table
     */
    getColumnsCompare(event = false, is_update = false, is_delete = false) {
        return this.getColumns().map(column => this.getColumnComparison(column, event, is_update, is_delete));
    }

    /**
     * Retrieve list of comparison cases for columns in the table
     *
     * @param {string} [event=false] Event to get comparison case for
     * @param {boolean} [is_update=false] Whether this change is update only (only update_date_time)
     * @param {boolean} [is_delete=false] Whether this change is delete only (only delete_date_time)
     * @returns {array} Array of column comparison cases for the columns in the table
     */
    getColumnsCompareCase(event = false, is_update = false, is_delete = false) {
        return this.getColumnsCompare(event, is_update).map(column => {
            if (is_update || is_delete) return column;

            return `CASE WHEN ${column} THEN 1 ELSE 0 END`;
        });
    }

    /**
     * Retrieve the browser-specific method for getting the current time
     * This will be NOW() or CURRENT_TIMESTAMP in MySQL for example
     *
     * @param {boolean} [is_insert=false] Whether this is for insert purposes (see code)
     * @returns {string} SQL part for getting current time
     */
    getTime(is_insert = false) {
        switch (this.TableBuilder.getLanguage()) {
            case "mysql":
                return is_insert ? "NOW()" : "CURRENT_TIMESTAMP";
            case "sqlite":
                return "(STRFTIME('%s', 'now'))";
        }
    }

    /**
     * Unescapes a string, getting the original string back
     * Uses the arguments from json-sql-builder configuration
     *
     * @param {string} string String to unescape
     * @returns {string} Original string, without escaping
     */
    escapeToWord(string) {
        return string.replace(
            new RegExp(`${this.TableBuilder.sql._quoteCharLeft}|${this.TableBuilder.sql._quoteCharRight}`, "gu"),
            "'"
        );
    }

    /**
     * Retireve the insert trigger for the different auditing types
     *
     * @param {string} method Audit method
     * @returns {string} SQL query for insert trigger
     */
    getInsertTrigger(method) {
        if (!method) return "";

        let trigger = `
${this.getTriggerLine("insert")}
FOR EACH ROW BEGIN
`;

        if (method === "row" || method === "all") {
            trigger += `    INSERT INTO ${this.TableBuilder.getEscaped(this.schema_history.$table, true)} (
        ${this.getColumns([true, "updated"]).join(", ")},
        ${this.getColumns().join(", ")},
        ${this.TableBuilder.getEscaped(this.setCase(["scd", true, "start"]))}, ${this.TableBuilder.getEscaped(
                this.setCase(["scd", true, "event"])
            )}
    ) VALUES (
        ${this.getColumnsCompareCase("insert").join(", ")},
        NEW.${this.getColumns().join(", NEW.")},
        ${this.getTime(true)}, 'insert'
    );

`;
        }

        if (method === "column" || method === "all") {
            trigger += `${this.getColumns()
                .map(column => {
                    return `    INSERT INTO ${this.TableBuilder.getEscaped(this.schema_changes.$table, true)} (
        ${this.TableBuilder.getEscaped(this.setCase([this.getPrimary()]))},
        ${this.TableBuilder.getEscaped(this.setCase(["field"]))}, ${this.TableBuilder.getEscaped(
                        this.setCase(["value"])
                    )},
        ${this.TableBuilder.getEscaped(this.setCase(["scd", true, "start"]))}, ${this.TableBuilder.getEscaped(
                        this.setCase(["scd", true, "event"])
                    )}
    ) SELECT
        NEW.${this.TableBuilder.getEscaped(this.getPrimary())},
        ${this.escapeToWord(column)}, NEW.${column},
        ${this.getTime(true)}, 'insert'
    WHERE
        ${this.getColumnComparison(column, "insert")};

`;
                })
                .join("")}`;
        }

        return `${trigger}END;`;
    }

    /**
     * Retrieve the last id history change (or changes change)
     *
     * @param {string} system Language to retrieve select query for
     * @param {string} [event=""] Event to get select query for
     * @param {string} column Name of the column-level change
     * @returns {string} SQL string for retrieving the last id history
     */
    getTriggerSelectQuery(system, event = "", column) {
        system = system || this.TableBuilder.getLanguage();

        let primary = [this.getPrimary()];
        if (event === "delete") primary = primary.concat(true, "last");
        primary = this.setCase(primary);

        switch (system) {
            case "mysql":
                return `@${this.setCase(["id", true, column ? "changes" : "history", true, "last"])}`;
            default:
                if (column) {
                    return `(SELECT ${this.TableBuilder.getEscaped(
                        this.setCase(["id", true, "changes"])
                    )} FROM ${this.TableBuilder.getEscaped(
                        this.schema_changes.$table,
                        true
                    )} WHERE ${this.TableBuilder.getEscaped(primary)} = OLD.${this.TableBuilder.getEscaped(
                        this.getPrimary()
                    )} AND ${this.TableBuilder.getEscaped(this.setCase(["field"]))} = ${this.escapeToWord(
                        column
                    )} AND ${this.TableBuilder.getEscaped(
                        this.setCase(["id", true, "changes", true, "next"])
                    )} IS NULL AND ${this.TableBuilder.getEscaped(this.setCase(["scd", true, "end"]))} IS NOT NULL)`;
                }

                return `(SELECT ${this.TableBuilder.getEscaped(
                    this.setCase(["id", true, "history"])
                )} FROM ${this.TableBuilder.getEscaped(
                    this.schema_history.$table,
                    true
                )} WHERE ${this.TableBuilder.getEscaped(primary)} = OLD.${this.TableBuilder.getEscaped(
                    this.getPrimary()
                )} AND ${this.TableBuilder.getEscaped(
                    this.setCase(["id", true, "history", true, "next"])
                )} IS NULL AND ${this.TableBuilder.getEscaped(this.setCase(["scd", true, "end"]))} IS NOT NULL)`;
        }
    }

    /**
     * Retrieve driver-specific query for getting last insert ID
     *
     * @returns {string} SQL query for last insert ID
     */
    getLastInsert() {
        if (this.TableBuilder.getLanguage() === "sqlite") return "last_insert_rowid()";

        return "LAST_INSERT_ID()";
    }

    /**
     * Retrieve SQL statement for setting last insert ID variable
     *
     * @param {string} event Type of event to get variable for
     * @param {string} column Name of the column to retrieve
     * @returns {string} SQL string for setting variable (for MySQL)
     */
    getTriggerSelect(event, column = false) {
        if (this.TableBuilder.getLanguage() === "sqlite") return "";

        return `
    SET @${this.setCase(["id", true, column ? "changes" : "history", true, "last"])} = ${this.getTriggerSelectQuery(
            "sqlite",
            event,
            column
        )};
`;
    }

    /**
     * Get "next" columns from table schema
     *
     * @returns {array} Array of next columns
     */
    getColumnsSQLNext() {
        return this.getColumns([], false).map(column => {
            return `${this.TableBuilder.getEscaped(
                this.setCase([column, true, "next"])
            )} = NEW.${this.TableBuilder.getEscaped(column)}`;
        });
    }

    /**
     * Retrieve the SQL for column-specific update triggers
     *
     * @param {boolean} [is_update=false] Whether to only trigger for update (i.e. update_date_time)
     * @param {boolean} [is_delete=false] Whether to only trigger for delete (i.e. delete_date_time)
     * @returns {string} SQL query for update trigger (columns type)
     */
    getUpdateTriggerColumn(is_update = false, is_delete = false) {
        let columns = this.getColumns();
        if (is_update) columns = [this.TableBuilder.getEscaped(this.setCase(["update", "date", "time"]))];
        if (is_delete) columns = [this.TableBuilder.getEscaped(this.setCase(["delete", "date", "time"]))];

        return `
${columns
    .map(column => {
        return `    UPDATE ${this.TableBuilder.getEscaped(this.schema_changes.$table, true)} SET
        ${this.TableBuilder.getEscaped(this.setCase(["scd", true, "end"]))} = ${this.getTime(true)},
        ${this.TableBuilder.getEscaped(this.setCase(["scd", true, "duration"]))} = ${this.getTime(
            true
        )} - ${this.TableBuilder.getEscaped(this.setCase(["scd", true, "start"]))}
    WHERE
        OLD.${this.TableBuilder.getEscaped(this.getPrimary())} = ${this.TableBuilder.getEscaped(this.getPrimary())} AND
        ${this.TableBuilder.getEscaped(this.setCase(["field"]))} = ${this.escapeToWord(column)} AND
        ${this.TableBuilder.getEscaped(this.setCase(["scd", true, "end"]))} IS NULL AND
        ${this.getColumnComparison(column, "update", is_update, is_delete)};
    ${this.getTriggerSelect("update", column)}
    INSERT INTO ${this.TableBuilder.getEscaped(this.schema_changes.$table, true)} (
        ${this.TableBuilder.getEscaped(this.setCase([this.getPrimary()]))},
        ${this.TableBuilder.getEscaped(this.setCase(["field"]))}, ${this.TableBuilder.getEscaped(
            this.setCase(["value", true, "last"])
        )}, ${this.TableBuilder.getEscaped(this.setCase(["value"]))},
        ${this.TableBuilder.getEscaped(this.setCase(["scd", true, "start"]))}, ${this.TableBuilder.getEscaped(
            this.setCase(["scd", true, "event"])
        )},
        ${this.TableBuilder.getEscaped(this.setCase(["id", true, "changes", true, "last"]))}
    ) SELECT
        NEW.${this.TableBuilder.getEscaped(this.getPrimary())},
        ${this.escapeToWord(column)}, ${is_update ? "NEW" : "OLD"}.${column}, ${
            is_update ? this.getTime(true) : `NEW.${column}`
        },
        ${this.getTime(true)}, 'update',
        ${this.getTriggerSelectQuery(null, "update", column)}
    WHERE
        ${this.getColumnComparison(column, "update", is_update, is_delete)};

    UPDATE ${this.TableBuilder.getEscaped(this.schema_changes.$table, true)} SET
        ${this.TableBuilder.getEscaped(this.setCase(["id", true, "changes", true, "next"]))} = ${this.getLastInsert()},
        ${this.TableBuilder.getEscaped(this.setCase(["value", true, "next"]))} = ${
            is_update ? this.getTime(true) : `NEW.${column}`
        }
    WHERE
        OLD.${this.TableBuilder.getEscaped(this.getPrimary())} = ${this.TableBuilder.getEscaped(this.getPrimary())} AND
        ${this.TableBuilder.getEscaped(this.setCase(["field"]))} = ${this.escapeToWord(column)} AND
        ${this.TableBuilder.getEscaped(this.setCase(["scd", true, "end"]))} IS NOT NULL AND
        ${this.TableBuilder.getEscaped(this.setCase(["id", true, "changes", true, "next"]))} IS NULL AND
        ${this.getColumnComparison(column, "update", is_update, is_delete)};

`;
    })
    .join("")}`;
    }

    /**
     * Retrieve new column values (or time for update only mode)
     *
     * @param {boolean} [update=false] Whether to only trigger for update (i.e. update_date_time)
     * @returns {string} String of new values for update trigger
     */
    getUpdateTriggerRowValues(update = false) {
        let columns = this.getColumns();

        if (update) {
            return columns
                .map(column => {
                    if (column === this.TableBuilder.getEscaped(this.setCase(["update", "date", "time"]))) {
                        return this.getTime(true);
                    }

                    return `NEW.${column}`;
                })
                .join(", ");
        }

        return `NEW.${columns.join(", NEW.")}`;
    }

    /**
     * Get code for triggering update (row mode) for independant usage
     *
     * @param {boolean} [update=false] Whether to only trigger for upate (i.e. update_date_time)
     * @returns {string} SQL query for update trigger
     */
    getUpdateTriggerRow(update = false) {
        return `
    UPDATE ${this.TableBuilder.getEscaped(this.schema_history.$table, true)} SET
        ${this.TableBuilder.getEscaped(this.setCase(["scd", true, "end"]))} = ${this.getTime(true)},
        ${this.TableBuilder.getEscaped(this.setCase(["scd", true, "duration"]))} = ${this.getTime(
            true
        )} - ${this.TableBuilder.getEscaped(this.setCase(["scd", true, "start"]))}
    WHERE
        ${this.TableBuilder.getEscaped(this.getPrimary())} = OLD.${this.TableBuilder.getEscaped(this.getPrimary())} AND
        ${this.TableBuilder.getEscaped(this.setCase(["scd", true, "end"]))} IS NULL;
    ${this.getTriggerSelect("update")}
    INSERT INTO ${this.TableBuilder.getEscaped(this.schema_history.$table, true)} (
        ${this.getColumns([true, "updated"]).join(", ")},
        ${this.getColumns([true, "last"]).join(", ")},
        ${this.getColumns().join(", ")},
        ${this.TableBuilder.getEscaped(this.setCase(["scd", true, "start"]))}, ${this.TableBuilder.getEscaped(
            this.setCase(["scd", true, "event"])
        )},
        ${this.TableBuilder.getEscaped(this.setCase(["id", true, "history", true, "last"]))}
    ) VALUES (
        ${this.getColumnsCompareCase("update", update).join(", ")},
        ${update ? "NEW" : "OLD"}.${this.getColumns().join(`, ${update ? "NEW" : "OLD"}.`)},
        ${this.getUpdateTriggerRowValues(update)},
        ${this.getTime(true)}, 'update',
        ${this.getTriggerSelectQuery()}
    );

    UPDATE ${this.TableBuilder.getEscaped(this.schema_history.$table, true)} SET
        ${this.TableBuilder.getEscaped(this.setCase(["id", true, "history", true, "next"]))} = ${this.getLastInsert()},
        ${this.getColumnsSQLNext().join(", ")}
    WHERE
        ${this.TableBuilder.getEscaped(this.getPrimary())} = OLD.${this.TableBuilder.getEscaped(this.getPrimary())} AND
        ${this.TableBuilder.getEscaped(this.setCase(["scd", true, "end"]))} IS NOT NULL AND
        ${this.TableBuilder.getEscaped(this.setCase(["id", true, "history", true, "next"]))} IS NULL;
`;
    }

    /**
     * Retrieve update trigger for given driver
     *
     * @param {string} method Audit method
     * @returns {string} SQL update trigger
     */
    getUpdateTrigger(method) {
        if (!method) return "";

        let when = "";

        let trigger = `
${this.getTriggerLine("update")}
FOR EACH ROW${when} BEGIN`;

        if (method === "row" || method === "all") {
            trigger += this.getUpdateTriggerRow();
        }
        if (method === "column" || method === "all") {
            trigger += this.getUpdateTriggerColumn();
        }

        /*
        Trigger to modify update_date_time automatically
        ...MySQL has issues with this, commented for now.

        let update_syntax = "";
        if (this.TableBuilder.getLanguage() === "sqlite") {
            when = ` WHEN (${this.getColumnsCompare().join(" OR\n\t")})`;
            update_syntax = `UPDATE ${this.TableBuilder.getEscaped(this.schema.$table, true)}`;
        }

        trigger += `
    ${update_syntax}SET
        ${update_syntax ? "" : "NEW."}${this.TableBuilder.getEscaped(this.setCase(["update", "date", "time"]))} = ${this.getTime(true)}
    WHERE
        ${this.TableBuilder.getEscaped(this.getPrimary())} = NEW.${this.TableBuilder.getEscaped(this.getPrimary())};
`;

        if (method === "row" || method === "all") {
            trigger += this.getUpdateTriggerRow(true);
        }
        if (method === "column" || method === "all") {
            trigger += this.getUpdateTriggerColumn(true);
        }
        */

        return `${trigger}END;`;
    }

    /**
     * Get delete trigger for the schema
     *
     * @param {string} method Audit method
     * @returns {string} SQL delete trigger
     */
    getDeleteTrigger(method) {
        let trigger = `
${this.getTriggerLine("delete", "BEFORE")}
FOR EACH ROW BEGIN
    /*
    auto-update delete_date_time
    UPDATE ${this.TableBuilder.getEscaped(this.schema.$table, true)} SET
        ${this.TableBuilder.getEscaped(this.setCase(["delete", "date", "time"]))} = ${this.getTime(true)}
    WHERE
        ${this.TableBuilder.getEscaped(this.getPrimary())} = OLD.${this.TableBuilder.getEscaped(this.getPrimary())};
    */`;

        if (method === "row" || method === "all") {
            // trigger += this.getUpdateTriggerRow(false, true);

            trigger += `

    UPDATE ${this.TableBuilder.getEscaped(this.schema_history.$table, true)} SET
        ${this.TableBuilder.getEscaped(this.setCase(["scd", true, "end"]))} = ${this.getTime(true)},
        ${this.TableBuilder.getEscaped(this.setCase(["scd", true, "duration"]))} = ${this.getTime(
                true
            )} - ${this.TableBuilder.getEscaped(this.setCase(["scd", true, "start"]))}
    WHERE
        ${this.TableBuilder.getEscaped(this.getPrimary())} = OLD.${this.TableBuilder.getEscaped(this.getPrimary())} AND
        ${this.TableBuilder.getEscaped(this.setCase(["scd", true, "end"]))} IS NULL;
    ${this.getTriggerSelect("delete")}
    INSERT INTO ${this.TableBuilder.getEscaped(this.schema_history.$table, true)} (
        ${this.getColumns([true, "updated"])},
        ${this.getColumns([true, "last"])},
        ${this.getColumns()},
        ${this.getColumns([true, "next"])},
        ${this.TableBuilder.getEscaped(this.setCase(["scd", true, "start"]))}, ${this.TableBuilder.getEscaped(
                this.setCase(["scd", true, "event"])
            )},
        ${this.TableBuilder.getEscaped(this.setCase(["id", true, "history", true, "last"]))}
    ) VALUES (
        ${this.getColumnsCompareCase("delete").join(", ")},
        OLD.${this.getColumns().join(", OLD.")},
        ${this.getColumns()
            .map(() => "NULL")
            .join(", ")},
        ${this.getColumns()
            .map(() => "NULL")
            .join(", ")},
        ${this.getTime(true)}, 'delete',
        ${this.getTriggerSelectQuery()}
    );

    UPDATE ${this.TableBuilder.getEscaped(this.schema_history.$table, true)} SET
        ${this.TableBuilder.getEscaped(this.setCase(["id", true, "history", true, "next"]))} = ${this.getLastInsert()}
    WHERE
        ${this.TableBuilder.getEscaped(
            this.setCase([this.getPrimary(), true, "last"])
        )} = OLD.${this.TableBuilder.getEscaped(this.getPrimary())} AND
        ${this.TableBuilder.getEscaped(this.setCase(["id", true, "history", true, "next"]))} IS NULL AND
        ${this.TableBuilder.getEscaped(this.setCase(["scd", true, "end"]))} IS NOT NULL;
`;
        }

        if (method === "column" || method === "all") {
            // trigger += this.getUpdateTriggerColumn(false, true);

            trigger += `${this.getColumns()
                .map(column => {
                    return `
    UPDATE ${this.TableBuilder.getEscaped(this.schema_changes.$table, true)} SET
        ${this.TableBuilder.getEscaped(this.setCase(["scd", true, "end"]))} = ${this.getTime(true)},
        ${this.TableBuilder.getEscaped(this.setCase(["scd", true, "duration"]))} = ${this.getTime(
                        true
                    )} - ${this.TableBuilder.getEscaped(this.setCase(["scd", true, "start"]))}
    WHERE
        OLD.${this.TableBuilder.getEscaped(this.getPrimary())} = ${this.TableBuilder.getEscaped(this.getPrimary())} AND
        ${this.TableBuilder.getEscaped(this.setCase(["field"]))} = ${this.escapeToWord(column)} AND
        ${this.TableBuilder.getEscaped(this.setCase(["scd", true, "end"]))} IS NULL AND
        ${this.getColumnComparison(column, "delete")};

    INSERT INTO ${this.TableBuilder.getEscaped(this.schema_changes.$table, true)} (
        ${this.TableBuilder.getEscaped(this.setCase([this.getPrimary()]))},
        ${this.TableBuilder.getEscaped(this.setCase(["field"]))}, ${this.TableBuilder.getEscaped(
                        this.setCase(["value", true, "last"])
                    )}, ${this.TableBuilder.getEscaped(this.setCase(["value"]))},
        ${this.TableBuilder.getEscaped(this.setCase(["scd", true, "start"]))}, ${this.TableBuilder.getEscaped(
                        this.setCase(["scd", true, "event"])
                    )}
    ) SELECT
        OLD.${this.TableBuilder.getEscaped(this.getPrimary())},
        ${this.escapeToWord(column)}, OLD.${column}, NULL,
        ${this.getTime(true)}, 'delete'
    WHERE
        ${this.getColumnComparison(column, "delete")};

    UPDATE ${this.TableBuilder.getEscaped(this.schema_changes.$table, true)} SET
        ${this.TableBuilder.getEscaped(this.setCase(["id", true, "changes", true, "next"]))} = ${this.getLastInsert()},
        ${this.TableBuilder.getEscaped(this.setCase(["value", true, "next"]))} = NULL
    WHERE
        OLD.${this.TableBuilder.getEscaped(this.getPrimary())} = ${this.TableBuilder.getEscaped(this.getPrimary())} AND
        ${this.TableBuilder.getEscaped(this.setCase(["field"]))} = ${this.escapeToWord(column)} AND
        ${this.TableBuilder.getEscaped(this.setCase(["scd", true, "end"]))} IS NOT NULL AND
        ${this.TableBuilder.getEscaped(this.setCase(["id", true, "changes", true, "next"]))} IS NULL AND
        ${this.getColumnComparison(column, "delete")};
`;
                })
                .join("")}`;
        }

        return `${trigger}END;`;
    }
};
