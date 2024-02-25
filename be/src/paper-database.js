const fs = require("fs");
const { parse } = require("csv-parse/sync");

class PaperDatabase {
    constructor(csvFile) {
        this.csvFile = csvFile;
        this.paperDatabase = parse(
            fs.readFileSync(csvFile),
            { columns: true }
        );
    }
}

module.exports = PaperDatabase;