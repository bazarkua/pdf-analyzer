const spawnSync = require('child_process').spawnSync;

class PdfAnalyzer {
    constructor(binLocation, configFile, execDir) {
        this.binLocation = binLocation;
        this.configFile = configFile;
        this.execDir = execDir;
    }

    analyze(file) {
        console.log(file);
        let process = spawnSync(this.binLocation, [file, this.configFile], {
            cwd: this.execDir
        });
        let fullOutput = String(process.stdout);
        console.log(String(process.stderr));
        return JSON.parse(fullOutput);
    }
}

module.exports = PdfAnalyzer;