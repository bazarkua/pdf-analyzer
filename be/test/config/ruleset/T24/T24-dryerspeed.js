exports.customLookup = function (inputProperties, tableData, tableLookup) {
    let settings = tableLookup(inputProperties, tableData);

    return {
        "properties": settings,
        "explanations": {
            "dryerPower": "Dryer power explanation",
            "targetSpeed": "Target speed explanation"
        }
    };
}