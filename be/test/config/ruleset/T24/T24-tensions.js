exports.customLookup = function (inputProperties, tableData, tableLookup) {
    let settings = tableLookup(inputProperties, tableData);
    let settingsExplanation = {};
    for (let [k, v] of Object.entries(settings)) {
        settingsExplanation[k] = "coverageClass is not heavy";
    }
    if (inputProperties.coverageClass === "heavy") {
        for (let [k, v] of Object.entries(settings)) {
            settings[k] = v -= 0.25;
            settingsExplanation[k] = "coverageClass is heavy";
        }
    }
    return {
        "properties": settings,
        "explanations": settingsExplanation
    };
}