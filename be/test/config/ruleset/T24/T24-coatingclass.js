exports.customLookup = function (inputProperties, tableData, tableLookup) {
    let mediaCoatingClass = undefined;
    let mediaCoatingClassExplanation = undefined;
    if (inputProperties.paperTypeTreatment === "treated" || inputProperties.paperTypeTreatment === "pro") {
        mediaCoatingClass = "inkjetTreatedSurface";
        mediaCoatingClassExplanation = "Paper treatment is '" + inputProperties.paperTypeTreatment +"'";
    } else {
        if (inputProperties.paperTypeCoated === "uncoated") {
            mediaCoatingClass = "mostSurfaces";
            mediaCoatingClassExplanation = "There is no paper treatment and paper is uncoated";
        } else if (inputProperties.paperTypeCoated === "coated") {
            for (const tableRow of tableData) {
                if (tableRow.paperFinish === inputProperties.paperFinish) {
                    mediaCoatingClass = tableRow.mediaCoatingClass;
                    mediaCoatingClassExplanation = "Paper finish is " + inputProperties.paperFinish;
                    break;
                }
            }
        }
    }
    return {
        "properties": { 
            "mediaCoatingClass": mediaCoatingClass 
        },
        "explanations": {
            "mediaCoatingClass": mediaCoatingClassExplanation,
        }
    };
}