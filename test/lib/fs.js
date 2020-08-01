// node modules
const fs = require("fs");
const path = require("path");

/**
 * Unlink entire path recursively
 *
 * @param {string} location Location to delete
 * @param {string} location_orig Location for recursive deletion, do not pass argument
 * @returns {Promise} Pending promise for path deletion
 */
fs.promises.unlinkPath = (location, location_orig) => {
    return new Promise((resolve, reject) => {
        /**
         * Stat the location, check if exists
         */
        return fs.promises
            .stat(location)
            .then(stats => {
                if (stats.isDirectory()) {
                    /**
                     * Requested location does exist - and is directory
                     * Read the directory found, retrieve each file
                     */
                    return fs.promises
                        .readdir(location)
                        .then(files => {
                            /**
                             * Directory contains files, loop and unlinkPath on those recursively
                             */
                            if (files.length) {
                                return Promise.all(
                                    files.map(file => fs.promises.unlinkPath(path.join(location, file), location_orig))
                                );
                            }

                            /**
                             * Directory is empty, run rmdir and then resolve
                             */
                            return fs.promises
                                .rmdir(location)
                                .then(() => resolve())
                                .catch(reject);
                        })
                        .catch(reject);
                }

                /**
                 * Requested location does exist - and is file
                 */
                return fs.promises
                    .unlink(location)
                    .then(() => resolve())
                    .catch(reject);
            })
            /**
             * If we're recursive, return to original path, otherwise resolve
             */
            .then(() => (location_orig ? fs.promises.unlinkPath(location_orig) : resolve()))
            .then(resolve)
            .catch(resolve);
    });
};

module.exports = fs;
