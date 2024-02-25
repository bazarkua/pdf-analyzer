exports.customLookup = function (inputProperties, tableData, tableLookup) {
    // TODO pass in column metadata
    const coverageClassVals = ["light", "medium", "heavy"];

    let coverageClassI = -1;
    let pdfMaxCoverage = inputProperties.pdfMaxCoverage;
    let coverageClassExplanation = "PDF max. coverage is between";
    if (pdfMaxCoverage >= 0 && pdfMaxCoverage <= 0.15) {
        coverageClassI = 0;
        coverageClassExplanation = `${coverageClassExplanation} 0% and 15%`;
    } else if (pdfMaxCoverage > 0.15 && pdfMaxCoverage <= 0.6) {
        coverageClassI = 1;
        coverageClassExplanation = `${coverageClassExplanation} 15% and 60%`;
    } else if (pdfMaxCoverage > 0.6 && pdfMaxCoverage <= 1.0) {
        coverageClassI = 2;
        coverageClassExplanation = `${coverageClassExplanation} 60% and 100%`;
    }

    let mediaWeightClass = undefined;
    let paperWeight = inputProperties.paperWeight;
    let mediaWeightClassExplanation = "Paper weight is";
    if (paperWeight >= 0 && paperWeight <= 45) {
        mediaWeightClass = "veryLow";
        mediaWeightClassExplanation = `${mediaWeightClassExplanation} below 45`;
    } else if (paperWeight > 45 && paperWeight <= 75) {
        mediaWeightClass = "low";
        mediaWeightClassExplanation = `${mediaWeightClassExplanation} between 45 and 75`;
    } else if (paperWeight > 75 && paperWeight <= 150) {
        mediaWeightClass = "medium";
        mediaWeightClassExplanation = `${mediaWeightClassExplanation} between 75 and 150`;
    } else if (paperWeight > 150) {
        mediaWeightClass = "high";
        mediaWeightClassExplanation = `${mediaWeightClassExplanation} above 150`;
    }

    if (inputProperties.opticalDensity >= 0 && inputProperties.opticalDensity < 0.95 && coverageClassI > 0) {
        coverageClassI -= 1;
    }

    return {
        "properties": {
            "coverageClass": coverageClassVals[coverageClassI],
            "mediaWeightClass": mediaWeightClass
        },
        "explanations": {
            "coverageClass": coverageClassExplanation,
            "mediaWeightClass": mediaWeightClassExplanation
        }
    };
}