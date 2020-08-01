/*global describe, context, it, before */

// node modules
const path = require("path");

// npm packges (for testing)
const { expect } = require("chai");

// npm packages (in module)
const SQLBuilder = require("json-sql-builder2"); // for testing container init
const sqlite3 = require("sqlite3"); // for testing container ready
const Pool = require("mysql/lib/Pool"); // for testing container ready
const JSiteDatabase = require("../index"); // for testing

// constants
const fs = require("./lib/fs"); // Node.js fs module, with recursive deletion
const ABS = path.resolve(__dirname, "private", "db"); // expected file location
const FILES = require("./data/files.json"); // schema for building tables
const MOCHA_TIMEOUT = 9000; // timeout for the mocha testing
const FACTS = require("./data/facts.json"); // facts to test against
const DATE_TIME = "_date_time"; // suffix for date_time columns
const MYSQL_CONFIG = {
    // mysql config for configuration
    host: "localhost",
    password: "",
    user: "root"
};
const EXT = {
    js: ".js",
    json: ".json",
    sql: ".sql"
};

/**
 * Data for testing table/view schema creation
 */
let names = {
    tables: [
        "tbl1", // tables1.json
        "tbl2", // tables2.json
        "tbl3", // tables2.json
        "tbl4" // tables3.js
    ],
    views: [
        "view1", // view1.json
        "view2", // view2.json
        "view3", // view2.json
        "view4" // view3.js
    ]
};

/**
 * Test against set validations
 *
 * @param {JSiteDatabase} TestDatabase Instance of container
 * @param {string} tests String to check as absolute path
 * @returns {void}
 */
function runContainerTests(TestDatabase, tests) {
    /**
     * Test misc. properties
     */
    it("'format' is empty object", () => expect(TestDatabase.format, "Format").to.deep.equal({}, "No format"));
    it("'mysql' is empty object", () => expect(TestDatabase.mysql).to.deep.equal(tests.mysql));
    it("'sql' is instance of json-sql-builder2", () => expect(TestDatabase.sql).to.be.instanceOf(SQLBuilder));
    it(`'audit' is set to "${tests.audit}"`, () => expect(TestDatabase.audit).to.equal(tests.audit));
    it("'abs' is set at parent (test) directory", () => expect(TestDatabase.abs).to.equal(path.resolve(ABS, "..")));

    /**
     * Test 'files' property
     */
    it("'files' is an object", () => expect(TestDatabase.files).to.be.a("object"));
    it("'files'.'db' is set at db (test/private/db) directory", () => {
        return expect(TestDatabase.files.db).to.equal(tests.abs);
    });
    it("'files'.'tables' is set at tables (test/private/db/tables) directory", () => {
        expect(TestDatabase.files.tables).to.equal(path.join(tests.abs, "tables"));
    });
    it(`'files'.'single' is set to ${tests.single ? "true" : "false"}`, () => {
        expect(TestDatabase.files.single).to.equal(tests.single);
    });

    /**
     * Test 'utils' property
     */
    it("'utils' is an object", () => expect(TestDatabase.utils).to.be.a("object"));
    it("'utils'.'flattenObject' is a function", () => expect(TestDatabase.utils.flattenObject).to.be.a("function"));
    it("'utils'.'getDate' is a function", () => expect(TestDatabase.utils.getDate).to.be.a("function"));
}

/**
 * Run queries following instructions from 'facts'
 *
 * @param {JSiteDatabase} TestDatabase Container instance
 * @param {number} [number=0] Number of test
 * @returns {void}
 */
function runQueries(TestDatabase, number = 0) {
    if (Object.prototype.hasOwnProperty.call(FACTS.inserts, number) && Array.isArray(FACTS.inserts[number])) {
        context("Container Inserts", () => {
            FACTS.inserts[number].forEach((insert, insert_i) => {
                it("Insert row into 'tbl1'", () => {
                    let $columns = JSON.parse(JSON.stringify(insert));
                    Object.keys($columns).forEach(property => {
                        $columns[property] = true;
                    });

                    return TestDatabase.run(
                        TestDatabase.sql.$insert({
                            $columns,
                            $table: "tbl1",
                            $values: Object.values(insert)
                        })
                    ).then(result => expect(result.changes).to.equal(1));
                });

                it(`Select ${insert_i + number + 1} rows from 'tbl1'`, () => {
                    return TestDatabase.get(
                        TestDatabase.sql.$select({
                            $from: "tbl1",
                            count: { $count: "*" }
                        })
                    ).then(result => expect(result.count).to.equal(insert_i + number + 1));
                });
            });

            it("Insert row into 'tbl4' custom table", () => {
                return TestDatabase.run(
                    TestDatabase.sql.$insert({
                        $columns: {
                            column1: true
                        },
                        $table: "tbl4",
                        $values: [`custom ${number + 1}`]
                    })
                ).then(result => expect(result.changes).to.equal(1));
            });

            it("Select 2 rows from 'tbl4' custom table", () => {
                return TestDatabase.get(
                    TestDatabase.sql.$select({
                        $from: "tbl4",
                        count: { $count: "*" }
                    })
                ).then(result => expect(result.count).to.equal(number + 2));
            });
        });
    }

    if (Object.prototype.hasOwnProperty.call(FACTS.updates, number) && Array.isArray(FACTS.updates[number])) {
        context("Container Updates", () => {
            FACTS.updates[number].forEach(update => {
                it("Update row in 'tbl1'", () => {
                    return TestDatabase.run(
                        TestDatabase.sql.$update({
                            $set: update.set,
                            $table: "tbl1",
                            $where: update.where
                        })
                    ).then(result => expect(result.changes).to.equal(1));
                });
            });
        });
    }

    if (Object.prototype.hasOwnProperty.call(FACTS.deletes, number) && Array.isArray(FACTS.deletes[number])) {
        context("Container Delete", () => {
            FACTS.deletes[number].forEach(del => {
                it("Deletes row in 'tbl1'", () => {
                    return TestDatabase.run(
                        TestDatabase.sql.$delete({
                            $from: "tbl1",
                            $where: del
                        })
                    ).then(result => expect(result.changes).to.equal(number + 1));
                });
            });
        });
    }
}

/**
 * Run set tests for arguments
 *
 * @param {string} title Title of the tests
 * @param {object} args Options to pass to JSiteDatabase
 * @returns {void}
 */
function runTest(title, args = {}) {
    let tests = {
        abs: ABS,
        audit: Object.prototype.hasOwnProperty.call(args, "audit") ? args.audit : "row",
        mysql: Object.prototype.hasOwnProperty.call(args, "mysql") ? args.mysql : {},
        single: Object.prototype.hasOwnProperty.call(args, "files") ? args.files : {}
    };

    if (Object.prototype.hasOwnProperty.call(args, "files") && Object.prototype.hasOwnProperty.call(args.files, "db")) {
        tests.abs = args.files.db;
    }
    tests.single = Object.prototype.hasOwnProperty.call(tests.single, "single") && tests.single.single;

    describe(`JSiteDatabase (${title} - ${tests.abs})`, () => {
        let Database = new JSiteDatabase(args);

        context("Container Init", () => {
            it("'Connection' is false", () => expect(Database.Connection).to.equal(false));
            it("'tables' is undefined", () => expect(Database.tables).to.equal(false));
            it("'views' is undefined", () => expect(Database.views).to.equal(false));
            runContainerTests(Database, tests);
        });

        describe(`JSiteDatabase (${title}) - readying`, function describeBlock() {
            this.timeout(MOCHA_TIMEOUT);

            before(function beforeCall() {
                return fs.promises
                    .unlinkPath(tests.abs)
                    .then(() => Database.ready())
                    .then(() => {
                        return Database.all(
                            `${names.tables
                                .map(table => {
                                    return `DROP TABLE IF EXISTS ${table}; DROP TABLE IF EXISTS ${table}__history; DROP TABLE IF EXISTS ${table}__changes`;
                                })
                                .join("; ")}; DROP TABLE IF EXISTS tbl4;`
                        );
                    })
                    .then(() => {
                        Database.close();

                        return Promise.all(
                            FILES.map(table => {
                                if (typeof table.content !== "string") {
                                    table.content = JSON.stringify(table.content, null, 4);
                                }
                                if (table.file[table.file.length - 1].substr(EXT.js.length * -1) === EXT.js) {
                                    table.content = `/*eslint-disable*/${table.content}`;
                                }

                                return fs.promises.writeFile(path.join(tests.abs, ...table.file), table.content);
                            })
                        );
                    })
                    .then(() => Database.ready())
                    .catch(e => {
                        /**
                         * Skip the database if it's busy (SQLite locked), or refusing connection (MySQL no server)
                         * Allows usage of SQL during tests without failing, or MySQL when server not running
                         * ...though tests should be re-run after servers aren't busy and open...
                         */
                        if (e.code === "EBUSY" || e.code === "ECONNREFUSED") return this.skip();

                        console.trace();
                        console.log(e);
                        process.exit();
                    });
            });

            context("Container Ready", () => {
                switch (Database.getLanguage()) {
                    case "mysql":
                        it("'Connection' is instance of MySQL Pool", () => {
                            return expect(Database.Connection).to.be.instanceOf(Pool);
                        });
                        break;

                    case "sqlite":
                        it("'Connection' is instance of sqlite3.Database", () => {
                            return expect(Database.Connection).to.be.instanceOf(sqlite3.Database);
                        });
                        break;
                }

                it("'tables' is an array", () => expect(Database.tables).to.be.a("array"));
                it(`'tables' has a length of ${names.tables.length}`, () => {
                    expect(Database.tables).to.be.lengthOf(names.tables.length, "names.tables.length");
                });
                it("'tables' is in priority order", () => {
                    expect(Database.tables.map(table => table.schema.$table)).to.deep.equal(
                        Database.tables
                            .sort((table1, table2) => (table1.priority || 1000) - (table2.priority || 1000))
                            .map(table => table.schema.$table)
                    );
                });

                it("'views' is an array", () => expect(Database.views).to.be.a("array"));
                it(`'views' has a length of ${names.views.length}`, () => {
                    return expect(Database.views).to.be.lengthOf(names.views.length);
                });
                it("'views' is in priority order", () => {
                    expect(Database.views.map(view => view.schema.$view)).to.deep.equal(
                        Database.views
                            .sort((view1, view2) => (view1.priority || 1000) - (view2.priority || 1000))
                            .map(view => view.schema.$view)
                    );
                });

                it(`'files' => 'single' has ${tests.single ? "" : "not "}made individual files`, () => {
                    return fs.promises.readdir(path.join(tests.abs, "tables")).then(files => {
                        return expect(
                            files.filter(name => name.substr(EXT.sql.length * -1) === EXT.sql).length
                        ).to.equal(tests.single ? names.tables.length : 0);
                    });
                });

                runContainerTests(Database, tests);
            });

            describe(`JSiteDatabase (${title} - queries)`, () => {
                runQueries(Database);
                runQueries(Database, 1);
            });

            describe(`JSiteDatabase (${title}) - audits`, () => {
                context("Container Auditing (row)", () => {
                    let results;

                    before(function beforeCall() {
                        if (tests.audit !== "row" && tests.audit !== "all") return this.skip();

                        return Database.all(Database.sql.$select({ $from: "tbl1__history" })).then(cache => {
                            results = cache;
                        });
                    });

                    Object.keys(FACTS.audit.row).forEach(column => {
                        it(`Inspect ${column} property of audit`, () => {
                            let actual = "";

                            results.forEach(result => {
                                if (Object.prototype.hasOwnProperty.call(result, column)) actual += result[column];
                            });

                            return expect(actual).to.equal(FACTS.audit.row[column]);
                        });
                    });
                });

                context("Container Auditing (column)", () => {
                    let results;

                    before(function beforeCall() {
                        if (tests.audit !== "column" && tests.audit !== "all") return this.skip();

                        return Database.all(Database.sql.$select({ $from: "tbl1__changes" })).then(cache => {
                            results = cache;
                        });
                    });

                    Object.keys(FACTS.audit.column).forEach(column => {
                        it(`Inspect ${column} property of audit`, () => {
                            let actual = "";

                            results.forEach(result => {
                                if (result.field.substr(DATE_TIME.length * -1) === DATE_TIME) return true;
                                if (Object.prototype.hasOwnProperty.call(result, column)) actual += result[column];
                            });

                            return expect(actual).to.equal(FACTS.audit.column[column]);
                        });
                    });
                });

                context("Container Closing", () => {
                    it("'Connection' is false after disconnect", () => {
                        Database.close();

                        return expect(Database.Connection).to.equal(false);
                    });
                    it("'tables' is an array", () => expect(Database.tables).to.be.a("array"));
                    it(`'tables' has a length of ${names.tables.length}`, () => {
                        expect(Database.tables).to.be.lengthOf(names.tables.length);
                    });
                    runContainerTests(Database, tests);
                });

                context("Container Utilities", () => {
                    if (Object.prototype.hasOwnProperty.call(FACTS, "utils")) {
                        if (
                            Object.prototype.hasOwnProperty.call(FACTS.utils, "flattenObject") &&
                            Array.isArray(FACTS.utils.flattenObject)
                        ) {
                            FACTS.utils.flattenObject.forEach((test, test_i) => {
                                it(`'flattenObject' utility test ${test_i + 1}`, () => {
                                    expect(Database.utils.flattenObject(test[0])).to.deep.equal(test[1]);
                                });
                            });
                        }

                        if (
                            Object.prototype.hasOwnProperty.call(FACTS.utils, "getDate") &&
                            Array.isArray(FACTS.utils.getDate)
                        ) {
                            FACTS.utils.getDate.forEach((test, test_i) => {
                                it(`'getDate' utility test ${test_i + 1}`, () => {
                                    expect(Database.utils.getDate(test[0])).to.equal(test[1]);
                                });
                            });
                        }
                    }
                });
            });
        });
    });
}

console.clear();

runTest("sqlite, row", {
    files: {
        db: path.join(__dirname, "private", "db", "1"),
        single: true
    }
});

runTest("sqlite, column", {
    audit: "column",
    files: {
        db: path.join(__dirname, "private", "db", "2")
    }
});

runTest("sqlite, all", {
    audit: "all",
    files: {
        db: path.join(__dirname, "private", "db", "3"),
        single: true
    }
});

runTest("mysql, row", {
    files: {
        db: path.join(__dirname, "private", "mysql", "1")
    },
    mysql: Object.assign(MYSQL_CONFIG, { database: "jsite-database-1" }),
    sql: {
        language: "mysql"
    }
});

runTest("mysql, column", {
    audit: "column",
    files: {
        db: path.join(__dirname, "private", "mysql", "2"),
        single: true
    },
    mysql: Object.assign(MYSQL_CONFIG, { database: "jsite-database-2" }),
    sql: {
        language: "mysql"
    }
});

runTest("mysql, all", {
    audit: "all",
    files: {
        db: path.join(__dirname, "private", "mysql", "3")
    },
    mysql: Object.assign(MYSQL_CONFIG, { database: "jsite-database-3" }),
    sql: {
        language: "mysql"
    }
});
