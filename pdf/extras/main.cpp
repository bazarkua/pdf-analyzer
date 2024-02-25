#include <opencv2/highgui.hpp>
#include <opencv2/core/utility.hpp>
#include "opencv2/imgproc.hpp"
#include "opencv2/imgcodecs.hpp"
#include <iostream>
// compile with: g++ main.cpp -o output `pkg-config --cflags --libs opencv4`
int main(int argc, char** argv) {

    cv::Mat image;
    image = cv::imread("rgb.jpg", cv::IMREAD_COLOR); // sample.jpeg

    if (!image.data) {
        std::cout << "Could not open or find the image" << std::endl;
        return -1;
    }

    cv::namedWindow("Display window", cv::WINDOW_AUTOSIZE);
    cv::imshow("Display window", image);

    cv::waitKey(0);
    return 0;
}
