/**
 * Node.js modules
 */
const fs = require("fs");
const path = require("path");

/**
 * Npm packages
 */
const SQLBuilder = require("json-sql-builder2"); // for building SQL queries
const formatSQL = require("sql-formatter").format; // for formatting SQL queries
const sqlite = require("sqlite3").verbose(); // for supporting SQLite databases
const mysql = require("mysql"); // for supporting MySQL databases
const mysql_OkPacket = require("mysql/lib/protocol/packets/OkPacket"); // for handling return queries
const mysql_Pool = require("mysql/lib/Pool");
const Data = require("jsite-data"); // for generic data handling and validation

/**
 * Lib Files
 */
const View = require("./lib/Schema/View/View"); // for handling view building
const Table = require("./lib/Schema/Table/Table"); // for handling table building
const { flattenObject, getDate, trySQL } = require("./lib/utils"); // for random utilities

/**
 * Constants
 */
const EXT = {
    json: ".json"
};
const VARCHAR_MAX_SIZE = 127;

module.exports = class TableBuilder extends Data {
    /**
     * Manager for building database schema
     *
     * @param {Object} [properties={}] TableBuilder settings
     *  - sql: Object ("language" used for driver, others passed into json-sql-builder2)
     *  - format: Object (passed into sql-formatter - formatting the output SQL)
     *  - audit: String ("all", "row", "column" - auditing method)
     *  - files: Object (used for logic of file/directory handling)
     */
    constructor(properties) {
        super(
            {
                Connection: (Connection, is_strict) => {
                    let test = Data.isTypeOf("Connection", Connection, "boolean");
                    if (!test) {
                        test = Data.isInstanceOf("Connection", Connection, "MySQL/SQLite Database", [
                            mysql_Pool,
                            sqlite.Database
                        ]);
                    }

                    if (Data.canBeStrict(test, { is_strict })) {
                        throw new Error("Connection should be a MySQL/SQLite Database, or false");
                    }

                    return test;
                },
                abs: {
                    pre: value => {
                        // Seen in: Passenger
                        if (Object.prototype.hasOwnProperty.call(process.env, "PWD")) {
                            value = process.env.PWD;
                        }
                        // Seen in: Mocha
                        if (Object.prototype.hasOwnProperty.call(process.env, "INIT_CWD")) {
                            value = process.env.INIT_CWD;
                        }

                        if (
                            process.mainModule.filename.substr(
                                process.mainModule.filename.lastIndexOf(path.sep) + 1
                            ) === "mocha"
                        ) {
                            value = path.join(value, "test");
                        }

                        return path.join(value, "private");
                    },
                    validate: (abs, is_strict) => {
                        return Data.isTypeOf("Absolute Path", abs, "string", { is_strict });
                    }
                },
                audit: (audit, is_strict) => {
                    return Data.isTypeOf("Audit Method", audit, "string", { is_strict });
                },
                files: (files, is_strict) => {
                    return Data.isTypeOf("Files Config", files, "object", { is_strict });
                },
                format: (format, is_strict) => {
                    return Data.isTypeOf("Format Config", format, "object", { is_strict });
                },
                mysql: (mysql, is_strict) => {
                    return Data.isTypeOf("MySQL Config", mysql, "object", { is_strict });
                },
                sql: {
                    pre: sql => {
                        if (Object.prototype.hasOwnProperty.call(sql, "language")) {
                            sql = {
                                language: sql.language,
                                options: sql
                            };
                        }

                        return new SQLBuilder(sql.language, sql.options);
                    },
                    validate: (sql, is_strict) => {
                        return Data.isInstanceOf("SQL Builder", sql, "SQL Builder", SQLBuilder, { is_strict });
                    }
                },
                tables: (tables, is_strict) => {
                    return Data.isTypeOf("Tables", tables, ["boolean", "array"], { is_strict });
                },
                utils: (utils, is_strict) => {
                    return Data.isTypeOf("Utilities", utils, "object", { is_strict });
                },
                views: (views, is_strict) => {
                    return Data.isTypeOf("Views", views, ["boolean", "array"], { is_strict });
                }
            },
            Object.assign(
                {
                    Connection: false,
                    abs: path.resolve(process.mainModule.filename, ".."),
                    audit: "row",
                    files: {},
                    format: {},
                    mysql: {},
                    sql: {
                        language: "sqlite",
                        options: {}
                    },
                    tables: false,
                    utils: {
                        flattenObject,
                        getDate
                    },
                    views: false
                },
                properties
            )
        );

        this._setRule("files", {
            pre: files => {
                files = Object.assign(
                    {
                        db: path.join(this.abs, "db"),
                        single: false
                    },
                    files
                );
                files.tables = path.join(files.db, "tables");
                files.sql = path.join(files.db, "sql");

                return files;
            },
            validate: (files, is_strict) => {
                return Data.isTypeOf("Files Config", files, "object", { is_strict });
            }
        });
    }

    /**
     * Format SQL string with established config
     *
     * @param {string} [sql=""] SQL query
     * @returns {string} Formatted query
     */
    formatSQL(sql = "") {
        return this.format ? formatSQL(sql, this.format) : sql;
    }

    /**
     * Get current language from SQLBuilder config
     *
     * @returns {string} SQL driver (lowercase)
     */
    getLanguage() {
        return this.sql._currentLanguage.toLowerCase();
    }

    /**
     * Escape a string according to specific SQLBuilder configs
     *
     * @param {string} [string=""] String to escape
     * @param {boolean} [is_table=false] Whether string is table name
     * @returns {string} Escaped string
     */
    getEscaped(string = "", is_table = false) {
        let sql = this.sql;
        if (
            !is_table ||
            (Object.prototype.hasOwnProperty.call(sql, "_options") &&
                typeof sql._options === "object" &&
                Object.prototype.hasOwnProperty.call(sql._options, "quoteIdentifiers") &&
                sql._options.quoteIdentifiers)
        ) {
            return sql._quoteCharLeft + string + sql._quoteCharRight;
        }

        return string;
    }

    getGeneric(prop, prop_schema, Name) {
        return new Promise((resolve, reject) => {
            if (typeof this[`${prop}s`] === "object") return resolve(this[`${prop}s`]);

            let files;
            let files_prop = this.files;

            return fs.promises
                .mkdir(path.join(files_prop.db, `${prop}s`), { recursive: true })
                .then(() => fs.promises.mkdir(files_prop.sql, { recursive: true }))
                .then(() => fs.promises.readdir(path.join(files_prop.db, `${prop}s`)))
                .then(_files => {
                    files = _files
                        .filter(file => file.substr(EXT.json.length * -1) === EXT.json && file.substr(0, 1) !== "_")
                        .map(file => file.substr(0, file.length - EXT.json.length));

                    return Promise.all(
                        files.map(file => {
                            return fs.promises.readFile(path.join(files_prop.db, `${prop}s`, `${file}.json`), "utf8");
                        })
                    );
                })
                .then(data => {
                    let items = [];
                    let item;
                    this[`${prop}s`] = [];

                    files.forEach((file, file_i) => {
                        try {
                            item = JSON.parse(data[file_i]);
                        } catch (ignore) {}

                        if (!Array.isArray(item)) item = [item];

                        item.forEach(schema => {
                            if (typeof schema !== "object" || Array.isArray(schema)) return true;

                            /**
                             * If a schema doesn't exist in the object, set as defaults
                             */
                            if (!Object.prototype.hasOwnProperty.call(schema, "$table")) {
                                schema = {
                                    [prop_schema]: schema,
                                    [`$${prop}`]: file
                                };
                            }

                            /**
                             * If we've already got a table with this name, return error
                             */
                            if (items.indexOf(schema[`$${prop}`]) > -1) {
                                return reject(`Duplicate Schema Name (${schema[`$${prop}`]})`);
                            }
                            items.push(schema[`$${prop}`]);

                            /**
                             * Add new Table object to this.tables array
                             */
                            this[`${prop}s`].push(
                                new Name({
                                    TableBuilder: this,
                                    schema
                                })
                            );
                        });
                    });

                    /**
                     * Sort tables according to priority
                     */
                    this[`${prop}s`] = this[`${prop}s`].sort((i1, i2) => (i1.priority || 1000) - (i2.priority || 1000));

                    if (files_prop.single) {
                        return Promise.all(
                            this[`${prop}s`].map(item => {
                                return fs.promises.writeFile(
                                    path.join(path.join(files_prop.db, `${prop}s`), `${item.schema[`$${prop}`]}.sql`),
                                    item.sql
                                );
                            })
                        );
                    }
                })
                .then(resolve)
                .catch(reject);
        });
    }

    /**
     * Retrieve columns from the provided schema
     * This will query the database (no cache currently)
     *
     * @param {object} schema Table schema
     * @returns {array} Array of columns
     */
    getColumns(schema) {
        return new Promise((resolve, reject) => {
            let sql;
            let property;
            let values = [];

            /**
             * Build the specific query given the driver
             */
            switch (this.getLanguage()) {
                case "sqlite":
                    sql = `PRAGMA table_info(${schema.$table})`;
                    property = "name";
                    break;

                case "mysql":
                    sql = `DESCRIBE ${schema.$table}`;
                    property = "Field";
                    break;
            }

            if (sql) {
                /**
                 * Run the query, retrieving an array of columns
                 */
                return this.all(sql, values)
                    .then(columns => resolve(columns.map(column => column[property])))
                    .catch(reject);
            }

            throw new Error(`Unsupported Language (${this.getLanguage()})`);
        });
    }

    getAlter(table) {
        return new Promise((resolve, reject) => {
            /**
             * Build array of tables we can make an alter query for
             * We don't need to do table.schema_changes, as this doesn't need an alter
             */
            let tables = [table.schema, table.schema_history];
            tables = tables.filter(schema => Object.prototype.hasOwnProperty.call(schema, "$table"));

            /**
             * Retrieve the columns from the table, given the schema
             */
            return Promise.all(tables.map(table => this.getColumns(table)))
                .then(tables_columns => {
                    let schema_alter;

                    /**
                     * Map through the columns to build a specific alter query
                     */
                    tables_columns = tables_columns.map((columns, columns_i) => {
                        schema_alter = JSON.parse(JSON.stringify(tables[columns_i]));

                        /**
                         * Remove the properties that previously existed in the database
                         * ...or if the column isn't actually a column (i.e. constraint)
                         * The only issue is if a column is renamed (or datatype changes)
                         */
                        Object.keys(schema_alter.$define).forEach(column => {
                            if (
                                columns.indexOf(column) > -1 ||
                                !Object.prototype.hasOwnProperty.call(schema_alter.$define[column], "$column")
                            ) {
                                delete schema_alter.$define[column];
                            }
                        });

                        /**
                         * If there's nothing to alter, return an empty string
                         */
                        if (!Object.values(schema_alter.$define).length) return "";

                        /**
                         * Build a new table schema from the array (as json-sql-builder doesn't support alter)
                         * Once this query has been built, we then remove the "create table if not exists..." part
                         */
                        schema_alter = this.sql
                            .$createTable(schema_alter)
                            .sql.replace(
                                `CREATE TABLE IF NOT EXISTS  ${this.getEscaped(schema_alter.$table, true)}`,
                                ""
                            )
                            .trim();

                        /**
                         * Remove the columns from around the column names
                         * Then split by comma, to split into seperate columns
                         * ...as ALTER statements can only do one change at a time.
                         */
                        return schema_alter
                            .substr(1, schema_alter.length - 2)
                            .split(", ")
                            .map(column => {
                                return `ALTER TABLE ${this.getEscaped(
                                    tables[columns_i].$table,
                                    true
                                )} ADD COLUMN ${column};`;
                            })
                            .join("\n");
                    });

                    /**
                     * Join the new alter statements together by new line (and trim)
                     */
                    return resolve(tables_columns.join("\n\n").trim());
                })
                .then(resolve)
                .catch(reject);
        });
    }

    getSQL(sql, file) {
        return new Promise((resolve, reject) => {
            sql = sql.join("\n").trim() || "";

            return fs.promises
                .writeFile(path.join(this.files.sql, file), sql)
                .then(() => this.exec(sql))
                .then(() => resolve(sql))
                .catch(reject);
        });
    }

    getAltersSQL() {
        return new Promise((resolve, reject) => {
            return Promise.all(this.tables.map(table => this.getAlter(table)))
                .then(alters => this.getSQL(alters, "alter.sql"))
                .then(resolve)
                .catch(reject);
        });
    }

    getCustomSQL() {
        return new Promise((resolve, reject) => {
            return fs.promises
                .readFile(path.join(this.files.sql, "custom.sql"), "utf8")
                .catch(() => "")
                .then(sql => this.exec(sql))
                .then(resolve)
                .catch(reject);
        });
    }

    /**
     * Setup the database container
     *
     * @returns {Promise} Pending promise for readying database
     */
    ready() {
        this.tables = false;
        this.views = false;

        return new Promise((resolve, reject) => {
            return fs.promises
                .mkdir(this.files.sql, { recursive: true })
                .then(() => Table.getAll(this, "tables"))
                .then(() => View.getAll(this, "views"))
                .then(() => this.getConnection())
                .then(() => {
                    return this.getSQL(
                        this.tables.map(table => table.sql),
                        "tables.sql"
                    );
                })
                .then(() => this.getAltersSQL())
                .then(() => {
                    return this.getSQL(
                        this.views.map(view => view.sql),
                        "views.sql"
                    );
                })
                .then(() => this.getCustomSQL())
                .then(resolve)
                .catch(reject);
        });
    }

    getConnection() {
        return new Promise((resolve, reject) => {
            /**
             * Prepare the connection for the driver
             */
            switch (this.getLanguage()) {
                case "sqlite":
                    this.Connection = new sqlite.Database(path.join(this.files.db, "index.db"));
                    break;

                case "mysql":
                    this.Connection = mysql.createPool(
                        Object.assign(this.mysql, {
                            multipleStatements: true
                        })
                    );
                    break;

                default:
                    return reject(`Unsupported Language (${this.getLanguage()})`);
            }

            return resolve();
        });
    }

    /**
     * Mirror the SQLite.all method
     *
     * Maps into other driver support
     *
     * @param {string} sql SQL query
     * @param {array} values SQL values
     * @returns {Promise} Pending promise for database query
     */
    all(sql, values) {
        return new Promise((resolve, reject) => {
            if (typeof sql !== "string") {
                /**
                 * If the provided SQL string isn't actually a string
                 */
                if (typeof sql === "object") {
                    /**
                     * If the SQL "string" is actually an object
                     */
                    if (
                        !(
                            Object.prototype.hasOwnProperty.call(sql, "sql") &&
                            Object.prototype.hasOwnProperty.call(sql, "values")
                        )
                    ) {
                        /**
                         * If SQL object hasn't got sql and values parts, build with SQLBuilder
                         */
                        sql = trySQL(this.sql.$select, sql, reject);
                    }

                    if (
                        Object.prototype.hasOwnProperty.call(sql, "sql") &&
                        Object.prototype.hasOwnProperty.call(sql, "values")
                    ) {
                        /**
                         * If it does have sql and values parts, split into values/sql
                         */
                        values = sql.values;
                        sql = sql.sql;
                    }
                }

                /**
                 * If SQL is still not a string, reject Promise
                 */
                if (typeof sql !== "string") return reject(`Invalid SQL (${typeof sql})`);
            }

            /**
             * Select appropriate method for given driver
             */
            let func;
            switch (this.getLanguage()) {
                case "sqlite":
                    func = "all";
                    break;
                case "mysql":
                    func = "query";
                    break;
            }

            /**
             * Execute given function with sql and values
             */
            if (func) {
                sql = sql.trim();

                if (!sql) return resolve();

                return this.Connection[func](sql, values, function queryReturn(e, data) {
                    if (e) return reject(e);

                    if (data instanceof mysql_OkPacket) {
                        data.changes = data.affectedRows;
                        data.lastID = data.insertId;
                    }

                    return resolve(data);
                });
            }

            return reject(`Unsupported System: ${this.getLanguage()}`);
        });
    }

    /**
     * Mirror the SQLite.run method
     *
     * @param {string} sql SQL query
     * @param {array} values SQL values
     * @returns {Promise} Pending promise for database query
     */
    run(sql, values) {
        return new Promise((resolve, reject) => {
            /**
             * Prepare sql/values (see "all" for detailed comments)
             */
            if (typeof sql !== "string") {
                if (typeof sql === "object") {
                    if (
                        !(
                            Object.prototype.hasOwnProperty.call(sql, "sql") &&
                            Object.prototype.hasOwnProperty.call(sql, "values")
                        )
                    ) {
                        sql = trySQL(this.sql.$select, sql, reject);
                    }

                    if (
                        Object.prototype.hasOwnProperty.call(sql, "sql") &&
                        Object.prototype.hasOwnProperty.call(sql, "values")
                    ) {
                        values = sql.values;
                        sql = sql.sql;
                    }
                }

                if (typeof sql !== "string") return reject(`Invalid SQL (${typeof sql})`);
            }

            /**
             * Execute specific calls for supported drivers
             */
            switch (this.getLanguage()) {
                case "sqlite":
                    return this.Connection.run(sql, values, function runResult(e) {
                        return e ? reject(e) : resolve(this);
                    });
                case "mysql":
                    /**
                     * TODO: update return last insert id, affected rows, etc.
                     */
                    return this.all(sql, values)
                        .then(resolve)
                        .catch(reject);
            }
        });
    }

    /**
     * Mirror the SQLite.get method
     *
     * @param {string} sql SQL string
     * @param {array} values SQL values
     * @returns {Promise} Pending promise for database query
     */
    get(sql, values) {
        return new Promise((resolve, reject) => {
            /**
             * Prepare sql/values (see "all" for detailed comments)
             */
            if (typeof sql !== "string") {
                if (typeof sql === "object") {
                    if (
                        !(
                            Object.prototype.hasOwnProperty.call(sql, "sql") &&
                            Object.prototype.hasOwnProperty.call(sql, "values")
                        )
                    ) {
                        sql = trySQL(this.sql.$select, sql, reject);
                    }

                    if (
                        Object.prototype.hasOwnProperty.call(sql, "sql") &&
                        Object.prototype.hasOwnProperty.call(sql, "values")
                    ) {
                        values = sql.values;
                        sql = sql.sql;
                    }
                }

                if (typeof sql !== "string") return reject(`Invalid SQL (${typeof sql})`);
            }

            /**
             * Execute specific calls for supported drivers
             */
            switch (this.getLanguage()) {
                case "sqlite":
                    return this.Connection.get(sql, values, (e, data) => (e ? reject(e) : resolve(data)));
                case "mysql":
                    return this.all(sql, values)
                        .then(data => resolve(data.length ? data[0] : {}))
                        .catch(reject);
            }
        });
    }

    /**
     * Mirror the SQLite.each method
     *
     * Read the SQLite module docuemntation for understanding this method
     * The "callback" is executed for each item in the list (same as module)
     * Then, once complete, the promise callback is returned properly
     *
     * @param {string} sql SQL query
     * @param {array} values SQL values
     * @param {function} callback Each callback
     * @returns {Promise} Pending promise for database query
     */
    each(sql, values, callback) {
        return new Promise((resolve, reject) => {
            /**
             * Prepare sql/values (see "all" for detailed comments)
             */
            if (typeof sql !== "string") {
                if (typeof sql === "object") {
                    if (
                        !(
                            Object.prototype.hasOwnProperty.call(sql, "sql") &&
                            Object.prototype.hasOwnProperty.call(sql, "values")
                        )
                    ) {
                        sql = trySQL(this.sql.$select, sql, reject);
                    }

                    if (
                        Object.prototype.hasOwnProperty.call(sql, "sql") &&
                        Object.prototype.hasOwnProperty.call(sql, "values")
                    ) {
                        values = sql.values;
                        sql = sql.sql;
                    }
                }

                if (typeof sql !== "string") return reject(`Invalid SQL (${typeof sql})`);
            }

            /**
             * Execute specific calls for supported drivers
             */
            switch (this.getLanguage()) {
                case "sqlite":
                    return this.Connection.each(sql, values, callback, (e, rows) => (e ? reject(e) : resolve(rows)));
                case "mysql":
                    return reject(`Unsupported Language: ${this.getLanguage()}`);
            }
        });
    }

    /**
     * Mirror the SQLite.exec method
     *
     * @param {string} sql SQL query
     * @returns {Promise} Pending promise for database query
     */
    exec(sql) {
        /**
         * Execute specific call for supported drivers
         */
        switch (this.getLanguage()) {
            case "sqlite":
                return new Promise((resolve, reject) => {
                    /**
                     * Retrieve sql, see "all" for detailed comments
                     * This doesn't handle the "values" side - as that isn't used
                     */
                    if (typeof sql !== "string") {
                        if (typeof sql === "object") {
                            if (!Object.prototype.hasOwnProperty.call(sql, "sql")) {
                                sql = trySQL(this.sql.$select, sql, reject);
                            }

                            if (Object.prototype.hasOwnProperty.call(sql, "sql")) {
                                sql = sql.sql;
                            }
                        }

                        if (typeof sql !== "string") return reject(`Invalid SQL (${typeof sql})`);
                    }

                    return this.Connection.exec(sql, e => (e ? reject(e) : resolve()));
                });
            case "mysql":
                return this.run(sql);
        }
    }

    /**
     * Mirrors SQLite.prepare method
     *
     * Not supported for other drivers
     *
     * @param {string} sql SQL query
     * @param {array} values SQL values
     * @returns {Promise} Pending promise for preparation
     */
    prepare(sql, values) {
        /**
         * Prepare sql/values (see "all" for detailed comments)
         */
        if (typeof sql !== "string") {
            if (typeof sql === "object") {
                if (
                    !(
                        Object.prototype.hasOwnProperty.call(sql, "sql") &&
                        Object.prototype.hasOwnProperty.call(sql, "values")
                    )
                ) {
                    sql = this.sql.$select(sql);
                }

                if (
                    Object.prototype.hasOwnProperty.call(sql, "sql") &&
                    Object.prototype.hasOwnProperty.call(sql, "values")
                ) {
                    values = sql.values;
                    sql = sql.sql;
                }
            }

            if (typeof sql !== "string") throw new Error(`Invalid SQL (${typeof sql})`);
        }

        /**
         * Execute specfic calls for supported drivers
         */
        switch (this.getLanguage()) {
            case "sqlite":
                return this.Connection.prepare(sql, values);
            case "mysql":
                throw new Error(`Unsupported Language: ${this.getLanguage()}`);
        }
    }

    /**
     * objectToTable takes a table name and an object to use as the base,
     *
     * It will attempt to produce a table configuration file (named _<table>.sql) in /tables/
     * This file will map the provided data in "object" against certain database datatypes
     * Currently this is fairly basic - strings go into date/text/varchar, numbers into int/decimal, etc.
     *
     * @param {string} table Table name
     * @param {object} object Object to build table for
     * @returns {Promise} Pending promise from fs.writeFile
     */
    objectToTable(table, object) {
        /**
         * Flatten the provided object, to use as base
         */
        object = flattenObject(object);

        let date;
        let length;

        /**
         * Loop through the object properties to build schema
         */
        Object.keys(object).forEach(property => {
            /**
             * Switch on the typeof data provided
             */
            switch (typeof object[property]) {
                case "string":
                    /**
                     * Test if the string is a date
                     */
                    date = getDate(object[property]);

                    if (date) {
                        /**
                         * If it maches a date, return a datetime part
                         */
                        object[property] = {
                            $column: {
                                $type: "DATETIME"
                            }
                        };
                    } else {
                        /**
                         * If it isn't a date, default to text
                         */
                        length = object[property].length;

                        object[property] = {
                            $column: {
                                $type: "TEXT"
                            }
                        };

                        /**
                         * If the length of the data is less than the varchar max, use varchar instead
                         */
                        if (length <= VARCHAR_MAX_SIZE) {
                            object[property].$column.$type = "VARCHAR";
                            object[property].$column.$size = VARCHAR_MAX_SIZE;
                        }
                    }
                    break;

                case "number":
                    if (object[property] % 1 === 0) {
                        /**
                         * If the number is a whole number, use integer
                         */
                        object[property] = {
                            $column: {
                                $type: "INTEGER"
                            }
                        };
                    } else {
                        /**
                         * If the number is not a whole number, use decimal
                         */
                        object[property] = {
                            $column: {
                                $type: "DECIMAL(25,5)"
                            }
                        };
                    }
                    break;

                case "boolean":
                    /**
                     * If the property is boolean, return a tinyint (size 1)
                     */
                    object[property] = {
                        $column: {
                            $default: "0",
                            $size: 1,
                            $type: "TINYINT"
                        }
                    };
                    break;

                default:
                    /**
                     * Log an output for any properties not easily matched
                     * This means data was not sufficiently provided (i.e. null)
                     */
                    console.log(`Not Assigned: ${property} (${typeof object[property]}, ${object[property]})`);
                    delete object[property];
            }
        });

        /**
         * Write the file to the right directory for tables
         */
        return fs.promises.writeFile(
            path.join(this.files.tables, `_${table}.json`),
            JSON.stringify(
                {
                    $define: object,
                    $table: table
                },
                null,
                4
            )
        );
    }

    close() {
        switch (this.getLanguage()) {
            case "sqlite":
                this.Connection.close();
                break;

            case "mysql":
                this.Connection.end();
                break;

            default:
                throw new Error(`Unsupported Language: ${this.getLanguage()}`);
        }

        this.Connection = false;
    }
};
