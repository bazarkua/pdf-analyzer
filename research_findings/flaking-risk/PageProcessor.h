#pragma once

#include <jawsmako/jawsmako.h>
#include <string>
#include <stdio.h>
#include <iostream>
#include <jawsmako/jawsmako.h>
#include <jawsmako/pdfinput.h>
#include "PdfFile.h"
#include "../logging/PwpLogger.h"
#include "../jsoncpp/include/json/json.h"
#include <jawsmako/pdfoutput.h>

class IPageProcessor {
public:
    virtual void configure(std::string config) = 0;

    virtual void process(IPagePtr page) = 0;

    virtual void finish() = 0;

    virtual ~IPageProcessor() {}
};

class BasicProcessor : public IPageProcessor {

protected:
    U8String uniqueId;
public:
    BasicProcessor(U8String uniqueId) : uniqueId(uniqueId) {
    }

    virtual void configure(std::string config) {

    }

    virtual void process(IPagePtr page) {}

    virtual void finish() {}
};


class PageProcessorImp : public IPageProcessor {
private:
    IPageProcessor &m_pageProcessor;
protected:
    Json::Value configRoot;
    U8String uniqueId;
    PdfFile &pdfFile;

public:
    bool enabled = false;

    PageProcessorImp(IPageProcessor &pageProcessor, U8String uniqueId, PdfFile &pdfFile) : m_pageProcessor(
            pageProcessor), uniqueId(uniqueId), pdfFile(pdfFile) {
    }

    virtual void configure(std::string json) {
        m_pageProcessor.configure(json);

        Json::Reader reader;
        reader.parse(json, configRoot);
    }

    virtual void process(IPagePtr page) {
        m_pageProcessor.process(page);
    }

    virtual void finish() {
        m_pageProcessor.finish();
    }

    std::string getFilename(std::string const &path) {
        return path.substr(path.find_last_of("/\\") + 1);
    }


    std::string removeExtension( std::string const& filename )
    {
        std::string::const_reverse_iterator
                pivot
                = std::find( filename.rbegin(), filename.rend(), '.' );
        return pivot == filename.rend()
               ? filename
               : std::string( filename.begin(), pivot.base() - 1 );
    }
};

