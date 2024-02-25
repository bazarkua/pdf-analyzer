#include <iostream>
#include "PdfProcessor.h"
#include <string>
#include <boost/filesystem.hpp>

static void show_usage(std::string name)
{
    std::cerr << "Usage: " << name << " <option(s)>" << std::endl << std::endl
              << "Options:\n" << std::endl
              << "\t-h,--help\t\tShow this help message" << std::endl
              << "\t--source SOURCE\t\t(Required) Specify the source PDF to render." << std::endl
              << "\t--destination DEST\t(Optional) Specify the destination folder where to output the rendered pages. Default is current folder." << std::endl
              << "\t--dpi DPI\t\t\t(Optional) Specify the dpi to render at. Typically 300 or 600. Default is 300." << std::endl
              << "\t--depth DEPTH\t\t(Optional) Specify the bit depth to render at. Valid options: 8 or 16 (bit). Default is 8." << std::endl
              << "\t--format FORMAT\t\t(Optional) Specify the output format. Valid options: tiff, png, jpeg, or all. Default is tiff." << std::endl
              << "\t--color COLOR\t\t(Optional) Specify the color space to render. Valid options: Gray, CMYK, CMY, or RGB. Default is CMYK."
              << std::endl
              << std::endl;
}

static std::string getFilename(std::string const &path) {
    return path.substr(path.find_last_of("/\\") + 1);
}

static std::string removeExtension(std::string const& filename )
{
    std::string::const_reverse_iterator
            pivot
            = std::find( filename.rbegin(), filename.rend(), '.' );
    return pivot == filename.rend()
           ? filename
           : std::string( filename.begin(), pivot.base() - 1 );
}

static std::string getFilename(std::string const& file, std::string const& destinationFolder, std::string const& extension) {

    std::string pdfFileSeed;
    pdfFileSeed = pdfFileSeed + destinationFolder;
    pdfFileSeed = pdfFileSeed + "/";
    pdfFileSeed = pdfFileSeed + removeExtension(getFilename(file.c_str()));
    pdfFileSeed = pdfFileSeed + ".";
    pdfFileSeed = pdfFileSeed + extension;

    return pdfFileSeed;
}


int main(int argc, char **argv) {
    std::cout << "Running the app..." << std::endl;

    std::string sourceFile = ""; ///home/abernosk/git/capstone-pdf-lib/Mako-brochure.pdf";
    std::string destinationFolder = ".";
    std::string dpi = "300";
    std::string depth = "8";
    std::string outputFormat = "tiff";
    std::string colorSpace = "CMYK";

    if(argc < 3){
        show_usage(argv[0]);
        return 1;
    }

    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];

        if ((arg == "-h") || (arg == "--help")) {
            show_usage(argv[0]);
            return 0;
        } else if ((arg == "-source") || (arg == "--source")) {
            if (i + 1 < argc) {
                i++;
                sourceFile = argv[i];
            } else {
                std::cerr << "--source option requires one argument." << std::endl;
                return 1;
            }
        } else if ((arg == "-destination") || (arg == "--destination")) {
            if (i + 1 < argc) {
                i++;
                destinationFolder = argv[i];
            } else {
                std::cerr << "--destination option requires one argument. Leave off trailing slash!!!" << std::endl;
                return 1;
            }
        } else if ((arg == "-dpi") || (arg == "--dpi")) {
            if (i + 1 < argc) {
                i++;
                dpi = argv[i];
            } else {
                std::cerr << "--dpi option requires one argument." << std::endl;
                return 1;
            }
        } else if ((arg == "-depth") || (arg == "--depth")) {
            if (i + 1 < argc) {
                i++;
                depth = argv[i];
            } else {
                std::cerr << "--depth option requires one argument." << std::endl;
                return 1;
            }
        } else if ((arg == "-format") || (arg == "--format")) {
            if (i + 1 < argc) {
                i++;
                outputFormat = argv[i];
            } else {
                std::cerr << "--format option requires one argument." << std::endl;
                return 1;
            }
        } else if ((arg == "-color") || (arg == "--color")) {
            if (i + 1 < argc) {
                i++;
                colorSpace = argv[i];
            } else {
                std::cerr << "--color option requires one argument." << std::endl;
                return 1;
            }
        }
    }

    if (sourceFile == "") {
        std::cerr << "--source option requires one argument." << std::endl;
        show_usage(argv[0]);
        return 1;
    }
    if (!boost::filesystem::exists(sourceFile)) {
        std::cerr << "Can not continue because source file was not set or doesn't exist. Source: " << sourceFile
                  << std::endl;
        return 1;
    }

    if (destinationFolder != ".") {
        boost::filesystem::create_directories(destinationFolder);
    }

    if (!boost::filesystem::exists(destinationFolder)) {
        std::cerr
                << "Can not continue because destination folder doesn't exist or could not be created. Destination folder: "
                << destinationFolder << std::endl;
        return 1;
    }

    U8String sourceFileAsU8String(sourceFile.begin(), sourceFile.end());
    U8String destinationFolderAsU8String(destinationFolder.begin(), destinationFolder.end());
    U8String dpiAsU8String(dpi.begin(), dpi.end());
    U8String depthAsU8String(depth.begin(), depth.end());
    U8String outputFormatAsU8String(outputFormat.begin(), outputFormat.end());
    U8String colorSpaceAsU8String(colorSpace.begin(), colorSpace.end());

    U8String json = "{\n"
                  " \"sourcePdfFilename\": \"" + sourceFileAsU8String + "\",\n"
                  " \"dimensionsUnit\" : \"inches\",\n"
                  " \"render\" : {\n"
                  "    \"destinationFolder\": \"" + destinationFolderAsU8String + "\",\n"
                  "    \"enabled\": true,\n"
                  "    \"dpi\" : " + dpiAsU8String + ",\n"
                  "    \"depth\" : " + depthAsU8String + ",\n"
                  "    \"outputType\" : \"" + outputFormatAsU8String + "\",\n"
                  "    \"colorSpace\" : \"" +colorSpaceAsU8String+"\"\n"
                  "    }\n"
                  "}\n";

    std::cout << std::endl << std::endl << "Passing this into the processing engine:" << std::endl << std::endl <<  json << std::endl;

    PdfProcessor pdfProcessor;
    pdfProcessor.init();
    PdfFile pdfFile = pdfProcessor.ProcessFile(json, "capstone");

    std::cout << std::endl << "Writing out the JSON results to: " << getFilename(sourceFile, destinationFolder, "json") << std::endl;
    std::ofstream file(getFilename(sourceFile, destinationFolder, "json"));
    file << pdfFile.ToJson();

    pdfProcessor.uninit();

    return 0;
}

