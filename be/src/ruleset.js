const fs = require("fs");
const { parse } = require("csv-parse/sync");


const defaultLogic = {
    "customLookup": function (inputProperties, tableData, tableLookup) {
        return {
            "properties": tableLookup(inputProperties, tableData, tableLookup),
            "explanations": {}
        };
    }
}

class Ruleset {
    constructor(rulesetPath) {
        let _this = this;
        this.rulesetPath = rulesetPath;
        this.metaJson = JSON.parse(
            fs.readFileSync(
                `${rulesetPath}/ruleset.json`,
                { flag: "r" }
            )
        );
        this.parsedJson = {}

        this.parsedJson["displayName"] = this.metaJson.displayName;
        this.parsedJson["properties"] = this.metaJson.properties;

        this.parsedJson["tables"] = [];
        // TODO *,{} properties
        this.allOutputProperties = [];
        this.allInputProperties = [];
        for (const table of this.metaJson.tables) {
            this._parseTable(table);
        }
        // Any inputs that are not calculated as intermediary outputs
        this.requiredInputProperties = this.allInputProperties.filter(p => !this.allOutputProperties.includes(p));
    }

    get json() {
        return this.parsedJson;
    }

    _parseTable(table) {
        let parsedTable = {
            "displayName": table.displayName,
            "inputProperties": table.inputProperties,
            "outputProperties": table.outputProperties
        };
        parsedTable["data"] = [];
        if (table.file) {
            parsedTable.data = parse(
                fs.readFileSync(`${this.rulesetPath}/${table.file}`),
                { columns: true }
            );
        }
        parsedTable["logic"] = {
            "customLookup": defaultLogic.customLookup
        };
        if (table.logic) {
            let parsedLogic = require(`${this.rulesetPath}/${table.logic}`);
            if (parsedLogic.customLookup) {
                parsedTable.logic.customLookup = parsedLogic.customLookup;
            } else if (!parsedTable.data && parsedTable.data.length !== 0) {
                throw new Error(`table '${displayName}' specifies no customLookup or CSV table`);
            }
        }

        this.allOutputProperties = this.allOutputProperties.concat(parsedTable.outputProperties);
        this.allInputProperties = this.allInputProperties.concat(parsedTable.inputProperties);

        this.parsedJson.tables.push(parsedTable);
    }

    // Ensure that value is of the correct type for the property
    castToPropertyType(propertyName, value) {
        let castValue = value;
        if (this.json.properties[propertyName].type === "number") {
            castValue = Number(value);
        }
        return castValue;
    }

}

module.exports = Ruleset;