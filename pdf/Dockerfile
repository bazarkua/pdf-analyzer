FROM debian:bookworm-slim

RUN echo "deb http://deb.debian.org/debian stretch main" >> /etc/apt/sources.list

RUN apt-get update 
RUN apt-get -y install libopencv-dev
#RUN apt-get -y install libmagick++-dev
RUN apt-get -y install\
    g++\
    pkg-config\
    libssl1.0.2\
    libssl1.0-dev\
    jq
RUN apt-get clean

#COPY ./config/ImageMagick-6-policy.xml /etc/ImageMagick-6/policy.xml
WORKDIR /usr/lib/x86_64-linux-gnu
#RUN ln -s libssl.so.1.0.2 libssl.so.10
#RUN ln -s libcrypto.so.1.0.2 libcrypto.so.10

WORKDIR /app
# Static
COPY ./cmyk2 .
RUN chmod +x ./cmyk2
COPY ./pdfpagesapp .
RUN chmod +x ./pdfpagesapp
COPY ./log4cpp.cfg .
# Source
#COPY ./extras .
#COPY ./*.h .
COPY ./pdf_algorithm_config.json config.json
COPY ./*.cpp .

RUN mkdir build
#RUN g++ cmyk2.cpp -o cmyk2 $(pkg-config --cflags --libs opencv4)
RUN g++ pdf_algorithm.cpp -o ./build/pdf_analyze\
    -DNO_GTK\
    $(pkg-config --cflags --libs opencv4)
    #$(pkg-config --cflags /usr/lib/x86_64-linux-gnu/pkgconfig/ImageMagick++.pc)\
    #$(pkg-config --libs /usr/lib/x86_64-linux-gnu/pkgconfig/ImageMagick++.pc)
RUN chmod +x ./build/pdf_analyze

RUN ln -s /app/build/pdf_analyze /usr/local/bin/sja_pdf_analyze

CMD ["sja_pdf_analyze"]