#pragma once

#include <jawsmako/jawsmako.h>
#include <string>
#include <stdio.h>
#include <iostream>
#include <jawsmako/jawsmako.h>
#include <jawsmako/pdfinput.h>
#include "../logging/PwpLogger.h"
#include <jawsmako/pdfoutput.h>
#include "PageProcessor.h"

class RenderPageInfoProcessor : public PageProcessorImp {
private:
    IJawsMakoPtr jawsMako;
    IJawsRendererPtr renderer;

    /// <summary>
    /// Record the highest ink coverage percentage across all pages.
    /// </summary>
    double maxInkCoverage = -1;


public:
    RenderPageInfoProcessor(IPageProcessor &pageProcessor, U8String uniqueId, PdfFile &pdfFile, IJawsMakoPtr jawsMako)
            : PageProcessorImp(pageProcessor, uniqueId, pdfFile) {
        this->jawsMako = jawsMako;
    }

    virtual void configure(std::string config) {
        PageProcessorImp::configure(config);

        if (configRoot["render"].isNull() ||
            configRoot["render"]["enabled"].isNull() ||
            configRoot["render"]["enabled"].asBool() == false ||
            configRoot["render"]["dpi"].isNull() ||
            configRoot["render"]["dpi"].asInt() < 1 ||
            configRoot["render"]["depth"].isNull() ||
            configRoot["render"]["depth"].asInt() < 1 ||
            configRoot["render"]["outputType"].isNull() || configRoot["render"]["outputType"].asString().empty(),
                configRoot["render"]["colorSpace"].isNull() || configRoot["render"]["colorSpace"].asString().empty(),
                configRoot["render"]["destinationFolder"].isNull() ||
                configRoot["render"]["destinationFolder"].asString().empty()) {

            return;
        }
        enabled = true;

        renderer = IJawsRenderer::create(jawsMako);
    }

    virtual void process(IPagePtr page) {
        PageProcessorImp::process(page);

        if (!enabled) {
            return;
        }

        time_t startTime = time(0);

        std::map<std::string, std::string> logParams;

        IDOMFixedPagePtr pageContent = page->getContent();
        IDOMImagePtr renderedImage;

        std::string colorSpace = (configRoot["render"]["colorSpace"]).asString();
        IDOMColorSpacePtr deviceColorSpace;
        if (colorSpace == "Gray") {
            deviceColorSpace = IDOMColorSpaceDeviceGray::create(jawsMako);
        } else if (colorSpace == "CMYK") {
            deviceColorSpace = IDOMColorSpaceDeviceCMYK::create(jawsMako);
        } else if (colorSpace == "CMY") {
            deviceColorSpace = IDOMColorSpaceDeviceCMY::create(jawsMako);
        } else if (colorSpace == "RGB") {
            deviceColorSpace = IDOMColorSpaceDeviceRGB::create(jawsMako);
        } else {
            throw std::invalid_argument("Illegal colorSpace supplied. Must be one of: [Gray, CMYK, CMY, RGB]");
        }

        uint16 dpi = configRoot["render"]["dpi"].asInt();
        uint8 depth = configRoot["render"]["depth"].asInt();
        renderedImage = renderer->render(pageContent, dpi, depth, deviceColorSpace);
        U8String outputfile;
        std::string outputType = (configRoot["render"]["outputType"]).asString();
        if (outputType == "tiff" || outputType == "all") {
            IDOMTIFFImage::encode(jawsMako, renderedImage,
                                  IOutputStream::createToFile(jawsMako, getPageFilename(colorSpace, "tif")));
        }

        if (outputType == "png" || outputType == "all") {
            IDOMPNGImage::encode(jawsMako, renderedImage,
                                 IOutputStream::createToFile(jawsMako, getPageFilename(colorSpace, "png")));
        }

        if (outputType == "jpeg" || outputType == "all") {
            IDOMJPEGImage::encode(jawsMako, renderedImage,
                                  IOutputStream::createToFile(jawsMako, getPageFilename(colorSpace, "jpg")));
        }

        if (outputType != "tiff" && outputType != "png" && outputType != "jpeg" && outputType != "all") {
            throw std::invalid_argument("Illegal outputType supplied. Must be one of: [tiff, png, jpeg, all]");
        }

        IImageFramePtr frame = renderedImage->getImageFrame(jawsMako);

        std::vector<uint8> scanlineBuffer;
        scanlineBuffer.resize(static_cast<size_t>(frame->getRawBytesPerRow()));

        int32 width = frame->getWidth();
        int32 height = frame->getHeight();
        int32 totalWhite = 0;
        int32 totalPics = width * height;

        for (int32 y = 0; y < height; y++) {
            frame->readScanLine(&scanlineBuffer[0], scanlineBuffer.size());
            for (int32 x = 0; x < width; x++) {
                if (scanlineBuffer[x] >= 255)
                    totalWhite++;
            }
        }

        double percent = 0;
        percent = (1 - double(totalWhite) / double(totalPics)) * 100;
        pdfFile.pdfPages[pdfFile.pdfPages.size() - 1].setInkCoverage(percent);


        if (maxInkCoverage < percent) {
            maxInkCoverage = percent;
        }

        pdfFile.addRenderPageTime(startTime, time(0));
    }

    U8String getPageFilename(U8String deviceColorSpace, U8String extension) {
        auto pageNum = pdfFile.pdfPages.size();
        U8String pdfFileSeed;
        pdfFileSeed = pdfFileSeed + removeExtension(getFilename(pdfFile.file.c_str()));
        pdfFileSeed = pdfFileSeed + "_";
        pdfFileSeed = pdfFileSeed + deviceColorSpace;
        pdfFileSeed = pdfFileSeed + "_";
        pdfFileSeed = pdfFileSeed + std::to_string(pageNum);
        pdfFileSeed = pdfFileSeed + ".";
        pdfFileSeed = pdfFileSeed + extension;

        std::string destinationFolder = (configRoot["render"]["destinationFolder"]).asString();
        U8String outputfile(destinationFolder.c_str());
        outputfile = outputfile + "/";
        outputfile = outputfile + pdfFileSeed.c_str();
        return outputfile;
    }

    virtual void finish() {
        PageProcessorImp::finish();

        if (enabled && maxInkCoverage > 0) {
//			pdfFile.setMaxInkCoverage(maxInkCoverage);
        }
    }
};
