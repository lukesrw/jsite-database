module.exports = class View extends require("../Schema") {
    /**
     * View representation in JSiteDatabase
     * Handles building sql/triggers/etc.
     *
     * @param {object} properties Properties for builing view
     */
    constructor(properties) {
        super(
            Object.assign(properties, {
                main: "$select"
            })
        );

        switch (this.TableBuilder.getLanguage()) {
            case "sqlite":
                this.schema.$ine = true;
                break;

            case "mysql":
                this.schema.$orReplace = true;
                break;
        }

        this.sql = this.TableBuilder.formatSQL(
            `${this.replacePlaceholders(this.TableBuilder.sql.$createView(this.schema))};`
        );
    }
};
