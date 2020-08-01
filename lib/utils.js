module.exports = {
    /**
     * flattenObject turns a multi-dimensional object into a single-level object
     * If the top-level property contains a non-JSON encodable property, it will be skipped
     * If any property in the object is an array or function, it will be skipped
     *
     * Joins multiple levels with underscores, so an object like...
     *      {
     *          "one": {
     *              "two": {
     *                  "three": "string",
     *                  "four": "string"
     *              }
     *          }
     *      }
     * ...becomes an object like...
     *      {
     *          "one_two_three": "string",
     *          "one_two_four": "string"
     *      }
     *
     * As a random unrelated utility, it will parse dates into a full date string
     * So if one of the ending "string" values is a date, it will parse into YYYY-MM-DD HH:II:SS
     *
     * @param {object} input Input object
     * @returns {object} Flat object
     */
    flattenObject: input => {
        /**
         * Clone all of the JSON encodable properties of the input object into "clone"
         */
        let clone = {};
        Object.keys(input).forEach(property => {
            try {
                clone[property] = JSON.parse(JSON.stringify(input[property]));
            } catch (ignore) {}
        });

        /**
         * Initialise with is_flat to true, this will indicate that no changes were made
         * Date is created so that we can loop and test matches against getDate
         */
        let is_flat = true;
        let date;

        /**
         * Loop through the clone properties, to flatten the object step-by-step
         */
        Object.keys(clone).forEach(property => {
            if (typeof clone[property] !== "function") {
                /**
                 * If the property is not a function
                 */
                if (Array.isArray(clone[property])) {
                    /**
                     * If the property is an array, delete this from the object
                     */
                    delete clone[property];
                } else if (typeof clone[property] === "object" && clone[property] !== null) {
                    /**
                     * If the property is an object that isn't null
                     */
                    is_flat = false;

                    /**
                     * Loop through the sub-properties of the object, set on clone
                     */
                    Object.keys(clone[property]).forEach(sub_property => {
                        clone[`${property}_${sub_property}`] = clone[property][sub_property];
                    });

                    /**
                     * Delete the original clone property, now other items have been cloned
                     */
                    delete clone[property];
                } else if (typeof clone[property] === "string") {
                    /**
                     * If the property is a string, try date parse
                     */
                    date = module.exports.getDate(clone[property]);
                    if (date) clone[property] = date;
                }
            }
        });

        if (is_flat) {
            /**
             * If the object is flat, create an output object to return
             * This will also put the object in alphabetically sorted form
             */
            let output = {};
            Object.keys(clone)
                .sort()
                .forEach(column => {
                    output[column] = clone[column];
                });

            return output;
        }

        /**
         * If the object is not flat, continue flattening recursively
         */
        return module.exports.flattenObject(clone);
    },

    /**
     * getDate tests an input string for date formats and returns in ISO-8601 format
     *
     * @param {string} input Input string to test
     * @returns {string} Date, in format YYYY-MM-DD HH:II:SS
     */
    getDate: input => {
        /**
         * Regex strings to test against the input string
         */
        let formats = [
            "(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})T(?<hour>\\d{2}):(?<minute>\\d{2}):(?<second>\\d{2})",
            "(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2}) (?<hour>\\d{2}):(?<minute>\\d{2}):(?<second>\\d{2})",
            "(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})"
        ];

        let match;
        let regex;

        formats.some(format => {
            /**
             * Loop through the formats array, create a regex from the input
             * ...then execute the regex against the input string to test
             */
            regex = new RegExp(format, "u");
            match = regex.exec(input);

            /**
             * If no match has been found, return false and stop checking
             */
            if (!match) return false;

            /**
             * If we did get a match, re-build the string from the various parts
             * Uses regex match groups to build the new array, with placeholders if needed
             *
             * If no year is found - set to 1970, if no month is found - set to 01, if no day is found - set to 01
             * If no hour is found - set to 00, if no minute is found - set to 00, if no second is found - set to 00
             */
            match = [
                [match.groups.year || "1970", match.groups.month || "01", match.groups.day || "01"],
                [match.groups.hour || "00", match.groups.minute || "00", match.groups.second || "00"]
            ];
            match = `${match[0].join("-")} ${match[1].join(":")}`;

            return true;
        });

        return match;
    },
    /**
     * Attempt try/catch on json-sql-builder opator
     *
     * @param {function} operator json-sql-builder operator
     * @param {object} sql SQL object to attempt to build
     * @param {function} reject Reject method to use if fails
     * @returns {object} Result of json-sql-builder operator
     */
    trySQL(operator, sql, reject) {
        try {
            return operator(sql);
        } catch (e) {
            return reject(e);
        }
    }
};
