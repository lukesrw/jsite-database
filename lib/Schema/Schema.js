/**
 * Node.js modules
 */
const fs = require("fs");
const path = require("path");

/**
 * Npm modules
 */
const Data = require("jsite-data");

/**
 * Constants
 */
const EXT = {
    js: ".js",
    json: ".json"
};

module.exports = class Schema extends Data {
    /**
     * Generic schema container for Table/View, handling generic controls
     *
     * @param {object} properties Properties for building tables/views
     */
    constructor(properties) {
        super(
            {
                TableBuilder: (TableBuilder, is_strict) => {
                    return Data.isInstanceOf(
                        "Table Builder",
                        TableBuilder,
                        "JSiteDatabase",
                        require("../../index.js"),
                        {
                            is_strict
                        }
                    );
                },
                case: (case_cfg, is_strict) => {
                    return Data.isTypeOf("Case Config", case_cfg, "object", { allow_null: true, is_strict });
                },
                main: (main, is_strict) => {
                    return Data.isTypeOf("Main Property", main, "string", { is_strict });
                },
                name: {
                    pre: value => (value ? value.replace(/\.(.+?)$/iu, "") : value),
                    validate: (name, is_strict) => {
                        return Data.isTypeOf("Name", name, "string", { allow_null: true, is_strict });
                    }
                },
                priority: (priority, is_strict) => {
                    return Data.isTypeOf("Priority", priority, "number", { is_strict });
                },
                schema: {
                    pre: schema => {
                        while (typeof schema === "function") schema = schema();

                        return schema;
                    },
                    validate: (schema, is_strict) => {
                        return Data.isTypeOf("Schema", schema, "object", { is_strict });
                    }
                },
                schema_changes: (schema_changes, is_strict) => {
                    return Data.isTypeOf("Changes Schema", schema_changes, "object", { allow_null: true, is_strict });
                },
                schema_history: (schema_history, is_strict) => {
                    return Data.isTypeOf("History Schema", schema_history, "object", { allow_null: true, is_strict });
                },
                sql: (sql, is_strict) => {
                    return Data.isTypeOf("SQL", sql, "string", { allow_null: true, is_strict });
                }
            },
            Object.assign(
                {
                    case: {
                        column: false,
                        table: false
                    },
                    priority: 1000,
                    schema_changes: {},
                    schema_history: {}
                },
                properties
            )
        );

        while (typeof this.schema === "function") this.schema = this.schema(this);

        if (
            typeof this.schema === "object" &&
            !Array.isArray(this.schema) &&
            !Object.prototype.hasOwnProperty.call(this.schema, this.main)
        ) {
            this.schema = {
                [this.main]: this.schema,
                [`$${this.constructor.name.toLowerCase()}`]: this.name
            };
        }

        let priority = 1000;
        if (this.main && this.isValid() && Object.prototype.hasOwnProperty.call(this.schema[this.main], "$priority")) {
            priority = this.schema.$define.$priority;
            delete this.schema.$define.$priority;
        }
        this.priority = priority;
    }

    /**
     * Replace placeholders within a string for SQL statement
     *
     * @param {object} query Query object
     * @returns {string} Query with replaced arguments
     */
    replacePlaceholders(query) {
        if (!Array.isArray(query.values)) {
            query.sql = query.sql.replace(/:param\d/gu, "?");
            query.values = Object.values(query.values).map(item => item.val);
        }

        query.values.forEach(value => {
            query.sql = query.sql.replace("?", value);
        });

        return query.sql;
    }

    /**
     * Determine whether schema is valid and error free
     *
     * @returns {boolean} Whether schema is valid
     */
    isValid() {
        let schema = this.schema;

        return (
            typeof schema === "object" &&
            !Array.isArray(this.schema) &&
            Object.prototype.hasOwnProperty.call(schema, this.main) &&
            Object.prototype.hasOwnProperty.call(schema, `$${this.constructor.name.toLowerCase()}`)
        );
    }

    /**
     * Retrieve priority for this schema in sort
     *
     * @returns {number} Priority for sorting
     */
    getPriority() {
        return this.priority || 1000;
    }

    /**
     * Retireve name of schema
     *
     * @returns {string} Schema (table/view) name
     */
    getName() {
        return this.schema[`$${this.constructor.name.toLowerCase()}`];
    }

    /**
     * Retrieve all of this type of schema, process and prepare for usage
     *
     * @param {JSiteDatabase} TableBuilder Instance of JSiteDatabase
     * @param {string} property Property to set on JSiteDatabase instance
     * @returns {Promise} Pending promise for schema returning
     */
    static getAll(TableBuilder, property) {
        return new Promise((resolve, reject) => {
            if (typeof TableBuilder[property] === "object") return resolve(TableBuilder[property]);

            let files;

            return fs.promises
                .mkdir(path.join(TableBuilder.files.db, property), { recursive: true })
                .then(() => fs.promises.mkdir(TableBuilder.files.sql, { recursive: true }))
                .then(() => fs.promises.readdir(path.join(TableBuilder.files.db, property)))
                .then(_files => {
                    files = _files.filter(file => {
                        return (
                            file.substr(0, 1) !== "_" &&
                            (file.substr(EXT.json.length * -1) === EXT.json ||
                                file.substr(EXT.js.length * -1) === EXT.js)
                        );
                    });

                    return Promise.all(
                        files.map(file => {
                            file = path.join(TableBuilder.files.db, property, file);
                            if (file.substr(EXT.js.length * -1) === EXT.js) return require(file);

                            return fs.promises.readFile(file, "utf8");
                        })
                    );
                })
                .then(data => {
                    let items = [];
                    let item;
                    TableBuilder[property] = [];

                    files.forEach((file, file_i) => {
                        item = data[file_i];
                        try {
                            item = JSON.parse(item);
                        } catch (ignore) {}

                        if (!Array.isArray(item)) item = [item];

                        item.forEach(schema => {
                            schema = new this({
                                TableBuilder,
                                name: file,
                                schema
                            });

                            if (schema.isValid() && items.indexOf(schema.getName()) === -1) {
                                items.push(schema.getName());
                                TableBuilder[property].push(schema);
                            } else if (!schema.isValid()) {
                                throw new Error("Invalid Schema");
                            } else if (items.indexOf(schema.getName()) !== -1) {
                                throw new Error(`Duplicate Schema (${schema.getName()})`);
                            }
                        });
                    });

                    /**
                     * Sort tables according to priority
                     */
                    TableBuilder[property] = TableBuilder[property].sort(
                        (item1, item2) => item1.getPriority() - item2.getPriority()
                    );

                    if (TableBuilder.files.single) {
                        return Promise.all(
                            TableBuilder[property].map(item => {
                                return fs.promises.writeFile(
                                    path.join(path.join(TableBuilder.files.db, property), `${item.getName()}.sql`),
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
};
