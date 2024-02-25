"use strict";

const { program } = require("commander");
const fs = require("fs");
const tmp = require('tmp');
const request = require('request');

const Express = require("express");
const BodyParser = require("body-parser");

const Ruleset = require("./ruleset.js");
const PaperDatabase = require("./paper-database.js");
const PdfAnalyzer = require("./pdf-analyzer.js");
const JobHistory = require("./job-history.js");


program
  .option("-s, --settings <string>", "settings dsec");
program.parse();
const options = program.opts();
let sjaSettingsFile = options.settings;
if(!options.settings) {
    sjaSettingsFile = "/opt/sja/settings.json";
}
const sjaSettings = require(sjaSettingsFile);

const app = Express();
app.use(BodyParser.json());
app.set('x-powered-by', false);

// Load all rulesets
let rulesets = {};
let rulesetsN = 0;
for (const rulesetDir of sjaSettings.rulesetDirs) {
    if (!fs.existsSync(rulesetDir)) {
        console.log(`warning: rulesets directory '${rulesetDir}' does not exist`);
    } else {
        for (const rulesetName of fs.readdirSync(rulesetDir)) {
            let singleRulesetDir = `${rulesetDir}/${rulesetName}`;
            if (rulesetName in rulesets) {
                throw new Error(`cannot load ruleset '${singleRulesetDir}': another ruleset named '${rulesetName}' already exists`);
            }
            rulesets[rulesetName] = new Ruleset(singleRulesetDir);
            rulesetsN++;
        }
    }
}
console.log(`Loaded ${rulesetsN} rulesets`);

let paperDatabase = undefined;
if(sjaSettings.enablePaperDatabase) {
    paperDatabase = new PaperDatabase(sjaSettings.paperDatabaseFile);
}

let pdfAnalyzer = undefined;
if (sjaSettings.pdfAnalyzer.enable) {
    pdfAnalyzer = new PdfAnalyzer(sjaSettings.pdfAnalyzer.binLocation, sjaSettings.pdfAnalyzer.configFile, sjaSettings.pdfAnalyzer.execDir);
}

let jobHistory = undefined;
if(sjaSettings.enableJobHistory) {
    jobHistory = new JobHistory(sjaSettings.jobHistoryFile);
}

/* Endpoints */

app.listen(sjaSettings.port, () => {
    console.log(`Listening at http://localhost:${sjaSettings.port}`);
});

app.get("/", (req, res) => {
    res.json({ "status": "ok" });
});

app.get("/debug", (req, res) => {
    res.json();
});

app.get("/paper", (req, res) => {
    if(!sjaSettings.enablePaperDatabase) {
        res.status(403).json({ "error": "paper database is not enabled" });
        return;
    }

    res.json({
        "papers": paperDatabase.paperDatabase
    });
});

const { body, validationResult } = require('express-validator');
app.post("/pdf/analyze", [body("url").isURL()], (req, res) => {
    if(!sjaSettings.pdfAnalyzer.enable) {
        res.status(403).json({ "error": "pdf analyzer is not enabled" });
        return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const tempFile = tmp.fileSync({ 
        postfix: ".pdf"
    });
    const downloadFile = fs.createWriteStream(tempFile.name);
    const fileReq = request.get(req.body.url);

    downloadFile.on('finish', () => {
        downloadFile.close();
        console.log("Downloaded PDF to temporary file: " + tempFile.name);
        
        try {
            let results = pdfAnalyzer.analyze(tempFile.name);

            let wk_cnt = 0;
            let ghosting_cnt = 0;
            let streaking_cnt = 0;
            let lowk_pct = 0.0;
            let flaking_pct = 0.0;
            let transfer_pct = 0.0;
            let max_cov = 0;
            for (let i = 0; i < results.pages_cnt; i++) {
                max_cov = Math.max(max_cov, results.pages[i].coverage);
                flaking_pct = Math.max(flaking_pct, results.pages[i].flaking.riskScore);
                if(results.pages[i].lowKBuildup.risky)
                    lowk_pct += 1;
                if(results.pages[i].ghosting.risky)
                    ghosting_cnt += 1;
                if(results.pages[i].wrinkleCurl.risky)
                    wk_cnt += 1;
                if(results.pages[i].transfer.risky)
                    transfer_pct += 1;
                if(results.pages[i].streaking.risky)
                    streaking_cnt += 1;
            }
            
            lowk_pct = lowk_pct/results.pages_cnt;
            transfer_pct = transfer_pct/results.pages_cnt;
                
            let metrics = {
                pdfMaxCoverage: max_cov,
                lowKBuild: lowk_pct,
                transferRisk: transfer_pct,
                flakingRisk: flaking_pct,
                streakingRisk: streaking_cnt,
                ghostingRisk: ghosting_cnt,
                wcRisk: wk_cnt
            }

            res.json({
                "metrics": metrics
            });
        } catch (e) {
            console.log(e);
            res.status(400).json({ "error": "Failed to parse PDF analyzer output (PDF file is probably invalid)"});
        }
        
    });
    
    // Errors
    fileReq.on('response', (response) => {
        let statusCode = response.statusCode;
        if (statusCode !== 200) {
            console.log(`Failed to download file with status code '${statusCode}'`);
            res.status(400).json({ "error": "HTTP error downloading PDF at URL"});
        }
        fileReq.pipe(downloadFile);
    });

    fileReq.on('error', (err) => {
        console.log(`Failed to save file: '${err.message}'`);
        res.status(400).json({ "error": "file error downloading PDF at URL"});
    });

    downloadFile.on('error', (err) => { // Handle errors
        console.log(`Failed to download file: '${err.message}'`);
        res.status(400).json({ "error": "network error downloading PDF at URL"});
    });
});

app.get("/ruleset", (req, res) => {
    let resRulesets = {};
    for (const [k, v] of Object.entries(rulesets)) {
        resRulesets[k] = {
            "displayName": v.json.displayName
        }
    }
    res.json({
        "rulesets": resRulesets
    });
});

app.get("/ruleset/:name", (req, res) => {
    let name = req.params.name;
    let foundRuleset = rulesets[name];
    if (!foundRuleset) {
        res.status(404).json({ "error": `ruleset with name '${name}' not found` });
        return;
    } else {
        res.json({
            [name]: {
                "displayName": foundRuleset.json.displayName,
                "properties": foundRuleset.json.properties,
                "requiredInputProperties": foundRuleset.requiredInputProperties,
            }
        });
    }
});

function tableLookup(inputProperties, tableData) {
    for (const tableRow of tableData) {
        let found = true;
        for (const [k, v] of Object.entries(inputProperties)) {
            found = tableRow[k] == v;
        }
        if (found) {
            // Return calculated only
            let p = {};
            for (const [k, v] of Object.entries(tableRow)) {
                if (!(k in inputProperties)) {
                    p[k] = v;
                }
            }
            return p;
        }
    }
    // TODO allow more specific exception for errors
}

app.post("/ruleset/:rulesetName/job", function (req, res) {
    let rulesetName = req.params.rulesetName;
    let ruleset = rulesets[rulesetName];
    if (!ruleset) {
        res.status(404).json({ "error": `ruleset with name '${rulesetName}' not found` });
        return;
    }

    let inputProperties = req.body.inputProperties;
    let outputProperties = {};
    let propertyExplanations = {};

    // Validate required properties
    let allProperties = {};
    for (const k of ruleset.requiredInputProperties) {
        let inputProperty = inputProperties[k];
        if(inputProperty === undefined) {
            res.status(400).json({ "error": `missing required inputProperty '${k}'` });
            return;
        }
        allProperties[k] = inputProperty;
    }
    // TODO remove
    for (const k of ruleset.allOutputProperties) {
        allProperties[k] = null;
    }

    for (const table of ruleset.json.tables) {
        // Pass only the input properties for the table
        let tableInputProperties = {};
        for (const k of table.inputProperties) {
            tableInputProperties[k] = allProperties[k];
        }

        let lookup = table.logic.customLookup(tableInputProperties, table.data, tableLookup);
        // Did the lookup return a row
        if (!lookup.properties) {
            let propString = table.inputProperties.join(", ");
            res.status(400).json({ "error": `values for '${propString}' not found in table '${table.name}'` });
            return;
        }
        // Merge into all dict
        for (const [k, v] of Object.entries(lookup.properties)) {
            allProperties[k] = outputProperties[k] = ruleset.castToPropertyType(k, v);
        }
        // Merge explanations (optional)
        if(lookup.explanations) {
            for (const [k, v] of Object.entries(lookup.explanations)) {
                propertyExplanations[k] = v;
            }
        }
    }
    
    let jobID = 0;
    let jobDateTime = `${new Date().toJSON().slice(0, 10)} ${new Date().toJSON().slice(11, 19)} GMT`;
    if(sjaSettings.enableJobHistory) {
        jobHistory.append(jobDateTime, req.body.jobName, rulesetName, inputProperties,outputProperties, propertyExplanations);
        jobID = jobHistory.newestID;
    }
    res.send({
        "jobID": jobID,
        "dateTime": jobDateTime,
        "jobName": req.body.jobName,
        "rulesetName": rulesetName,
        "inputProperties": inputProperties,
        "calculatedProperties": outputProperties,
        "propertyExplanations": propertyExplanations
    });
});

app.get("/history", (req, res) => {
    if(!sjaSettings.enableJobHistory) {
        res.status(403).json({ "error": "job history is not enabled" });
        return;
    }

    res.json({
        "history": jobHistory.JobHistory
    });
});

app.get("/history/:identifier", (req, res) => {
    if(!sjaSettings.enableJobHistory) {
        res.status(403).json({ "error": "job history is not enabled" });
        return;
    }
    let id = req.params.identifier;
    let foundJob = jobHistory.JobHistory[`${id}`];
    if (!foundJob) {
        res.status(404).json({ "error": `job with id '${id}' not found` });
        return;
    } else {
        res.json({
            [id]: foundJob
        });
    }
});

app.delete("/history/:identifier", (req, res) => {
    if(!sjaSettings.enableJobHistory) {
        res.status(403).json({ "error": "job history is not enabled" });
        return;
    }
    let id = req.params.identifier;
    let response = jobHistory.remove(id);
    if (!response) {
        res.status(404).json({ "error": `job with id '${id}' not found` });
        return;
    } else {
        res.status(200).json({ "success": `job with id '${id}' deleted` });
    }
});

app.options('/*', (_, res) => {
    res.sendStatus(200);
});
