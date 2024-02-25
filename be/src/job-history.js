const fs = require("fs");

class JobHistory {
    constructor(history_path) {
        let file = undefined;
        this.history_path = history_path;
        
        if(!fs.existsSync(history_path)) {
            console.log("warning: no job history found, created new JSON file")
            fs.writeFileSync(history_path, JSON.stringify({}));
        }
        file = fs.readFileSync(`${history_path}`, { flag: "r" });
        this.JobHistory = JSON.parse(file);
        this.newestID = Math.max(...Object.keys (this.JobHistory).map(Number));
        if(Object.keys (this.JobHistory).length == 0){
            this.newestID = 0;
        }
    }

    overwriteFile() {
        fs.writeFileSync(this.history_path, JSON.stringify(this.JobHistory));
    }

    append(dateTime, jobName, rulesetName, inputProperties, outputProperties, explanations) {
        this.newestID += 1;
        let json_entry = {
            "dateTime":dateTime,
            "jobName": jobName,
            "rulesetName": rulesetName,
            "inputProperties": inputProperties,
            "calculatedProperties": outputProperties,
            "propertyExplanations": explanations
        };
        this.JobHistory[`${this.newestID}`] = json_entry;
        this.overwriteFile();
    }

    remove(id) {
        if(!this.JobHistory[`${id}`]) {
            return false;
        }
        delete this.JobHistory[`${id}`];
        this.overwriteFile();
        return true;
    }
}

module.exports = JobHistory;