// script to generate mockup job data

// use file system module to read csv
const fs = require('fs');
// use csv parser to parse csv
// const csv = require('csv-parser')

// Use case 1 or Use case 2?
const myArgs = process.argv.slice(2);
if (myArgs.length != 1) {
    console.log("Incorrect number of arguments! Please run using node job-gen use-case-number");
    return;
}
else if (!(myArgs[0] == 1 || myArgs[0] == 2)) {
    console.log("Valid values for the use case are 1 or 2");
    return;
}

use_case = myArgs[0]

// available press families
const pressFams = ["T24"]
// available quality modes
const qualModes = ["quality", "performance"]
// available press brands
const pressBrand = ["emt", "hnk"]

// store in a random paper object from the database
data = fs.readFileSync('config/paperdb.csv', 'utf-8');

const lines = data.split("\n");
const nbLines = (data.split("\n")).length;
const r = rand_num(0, nbLines - 1);
// this line holds one data object 
const line = lines[r];
// seperate each variable by commas
const info = line.split(",")


// function that generates random data given a min and max value
function rand_num(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

// generate randomized data
var random = rand_num(0, 1)
press_family = pressFams[random];
random = rand_num(0, 2);
quality_mode = qualModes[random];
random = rand_num(0, 2);
press_brand = pressBrand[random];
optical_density = rand_num(50, 100);
pdf_max_cov = rand_num(1, 100);

// USE CASE 1:
if (use_case == 1) {
    // create JSON object
    const inputProperties =
        {
        "qualityMode": quality_mode,
        "opticalDensity": optical_density,
        "pressUnwinderBrand": press_brand,
        "pdfMaxCoverage": pdf_max_cov,
        "manufacturer": info[0], 
        "productName": info[1],
        "weightgsm": info[2],
        "paperType": info[3],
        "paperSubType": info[4],
        "Finish": info[5],
        "usePrimer": info[6],
        "useFixer": info[7].slice(0, -1)
        }
    
    const data = JSON.stringify(inputProperties, null, 4);
    // export to a file
    console.log(data)
}

// USE CASE 2:
else if (use_case == 2) {
    // get speed variable
    speed = rand_num(100, 1000);
    // create JSON object
    const inputProperties =
    {
    "qualityMode": quality_mode,
    "opticalDensity": optical_density,
    "pressUnwinderBrand": press_brand,
    "pdfMaxCoverage": pdf_max_cov,
    "speed": speed
    }
    // export 
    const data = JSON.stringify(inputProperties, null, 4);
    // export to a file
    console.log(data)
}

