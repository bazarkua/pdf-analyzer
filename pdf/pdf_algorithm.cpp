#include "opencv2/core/core.hpp"
#include <opencv2/highgui/highgui.hpp>
#include <opencv2/opencv.hpp>
#include <vector>
#include <cmath>
#include <iostream>
#include <fstream>
#include <cmath>
#include <numeric>
#include <stdexcept>
#include <chrono>

using namespace std;
using namespace cv;

// HOW jonathan compiles it:
// g++ std=++11 cmyk2.cpp -o cmyk2 `pkg-config --cflags --libs opencv4`
// g++ pdf_algorithm.cpp -o PDF_Analyze `pkg-config --cflags --libs opencv4` `Magick++-config --cppflags --libs`
// export DISPLAY=:0 for my wsl xhost of showing images
// How to add opencv to path (CENTOS WSL)
    // LD_LIBRARY_PATH=/root/opencv/build/lib/
    // export LD_LIBRARY_PATH
    // ldconfig

int imgs_shown = 0;
int flaking_idx = 0, kbuildup_idx = 1, streak_idx = 2, transfer_idx = 3, wrinkle_curl_idx = 4, ghosting_idx =5, coverage_idx=6;
int cur_dpi = 300;     // updates upon reading files
fstream system_log_filestream;
char system_log_filename[] = "pdf_algorithm.log";
auto unix_timestamp_ms = chrono::duration_cast<chrono::milliseconds>(chrono::system_clock::now().time_since_epoch()).count();

// Configurable via external .json config file
float border_weight_pct = 0.1;      // percent of length of the pageborder (0.1 means that border is 20% of height and 20% of length)
int flaking_binary_threshold = 80;  // must be integer within [0,255] threshold value to push values to 0 or 255
int resize_width=500;               // pixel width to shrink/stretch image into, balance between accuracy and computational efficiency
int threshold_to_zero_value = 10;   // must be integer within [0,255] threshold value. pixels below this value will be floored to 0
float downweb_txt_pct_min = 0.5;    // minimum percant of downweb text coverage for it to be considered a downweb text page

// cmyk and white binary threshold values: must be integer within [0,255]. pixel values below this will go to 0, above will go to 255
int c_binary_threshold_value = 90, m_binary_threshold_value=90, y_binary_threshold_value= 90, k_binary_threshold_value= 90, white_binary_threshold_value = 210;
float k_buildup_proportion_max = 0.65;              // percent of low_k coverage, THRESHOLD
int streak_min_hue = 0, streak_min_sat = 220, streak_min_val = 200; // hue 0-175, saturation 0-255, value 0-255
int streak_max_hue = 175, streak_max_sat = 255, streak_max_val = 255;
float streak_proportion_max = 0.0001;               // percent before an area detected as streak risk
float wrinkle_curl_asymmetry_bound = 0.35;          // minimum coverage differince between front/back and edge/non-edge page pairs
float wrinkle_curl_minimum_coverage = 0.6;          // minimum coverage between front/back pages to be problematic to wrinkle/curling
int transfer_risk_binary_threshold_value = 245;     // must be integer within [0,255] threshold value. pixels below will go to 0, above will go to 255
float transfer_bounding_height_min = 0.6;           // a bounded rectangle of more than this will rase the score of transfer risk
float transfer_bounding_width_max = 0.4;            // a bounded rectantgle of less than this will raise the score of transfer risk
float ghosting_solid_fill_pct_min = 0.75;           // minimum percentage of coverage needed after downweb text pages for ghosting to be problematic
int ghosting_downweb_text_pgs_min = 20;             // minimum number of pages for ghosting risk to even be considered
int transfer_risk_min_page_num = 4;                 // minimum number of pages required to evaluate any pages as a transfer risk
bool evaluate_flake_risk = true;
bool evaluate_streak_risk = true;
bool evaluate_kbuildup_risk = true;
bool evaluate_ghosting_risk = true;
bool evaluate_transfer_risk = true;
bool evaluate_wrinkle_curl_risk = true;

struct RiskResult{
    float score;
    bool problematic;
};
struct PageResult{
    struct RiskResult risk[7];
};
/*
exec(): function to run cmd on command line
*/
string exec(const char* cmd) {
    char buffer[128];
    string result = "";
    FILE* pipe = popen(cmd, "r");
    if (!pipe) throw runtime_error("popen() failed!");
    try {
        while (fgets(buffer, sizeof buffer, pipe) != NULL) {
            result += buffer;
        }
    }
    catch (...) {
        pclose(pipe);
        throw;
    }
    pclose(pipe);
    return result;
}
int max_int(int a, int b){
    if (a>b)
        return a;
    return b;
}
float  max(float a, float b){
    if (a>b)
        return a;
    return b;
}

/*
flaking_test(): Evaluate flaking score of provided image
    blur and check non-zero components of image
    compare area of connected non-zero componets to a max area
    store the largest area found from connected components
    store boolean of risk result
*/
void flaking_test(cv::Mat image, string img_name, int Area_max, int blur_sz, struct PageResult& page_result){
    GaussianBlur(image, image, Size(blur_sz, blur_sz), 3.5, 3.5);
    threshold(image, image, flaking_binary_threshold, 255, THRESH_BINARY);
    const int connectivity_4 = 4;
    int cnt = 0;
    Mat labels, stats, centroids;
    int nLabels = connectedComponentsWithStats(image, labels, stats, centroids, connectivity_4, CV_32S);
    float max_area_pct = 0;
    for(int i = 1; i<nLabels; i++){
        if(stats.at<int>(i,CC_STAT_AREA) > Area_max){
            page_result.risk[flaking_idx].problematic = true;
            max_area_pct += (float)stats.at<int>(i,CC_STAT_AREA) / (image.cols*image.rows);
            // cnt++;
            // cout << "       Area of ["<<cnt<<"] is: "<<stats.at<int>(i,CC_STAT_AREA)<<endl;
            // Mat component = Mat(image.size(), CV_8UC1);
            // compare(labels, i, component, CMP_EQ);
            // string component_str = img_name + ": Area " + to_string(cnt);
            // imshow(component_str, component);
            // imgs_shown++;
        }
    }
    page_result.risk[flaking_idx].score += max_area_pct;
}

/*
Split_to_cmyk(): split src image into cmyk components
*/
void Split_to_cmykw(cv::Mat src, std::vector<cv::Mat>& cmykw){
    std::vector<cv::Mat> bgr;
    cv::split(src, bgr);
    for (int i = 0; i < 5; i++)
        cmykw.push_back(cv::Mat(src.size(), CV_8UC1));
    bitwise_and(bgr[0], bgr[1], cmykw[4]);
    bitwise_and(cmykw[4], bgr[2], cmykw[4]);

    for (int i = 0; i < src.rows; i++) {
        for (int j = 0; j < src.cols; j++) {
            float r = (int)bgr[2].at<uchar>(i, j) / 255.;
            float g = (int)bgr[1].at<uchar>(i, j) / 255.;
            float b = (int)bgr[0].at<uchar>(i, j) / 255.;
            float k = std::min(std::min(1- r, 1- g), 1- b);
            cmykw[0].at<uchar>(i, j) = (1 - r - k) / (1 - k) * 255.;
            cmykw[1].at<uchar>(i, j) = (1 - g - k) / (1 - k) * 255.;
            cmykw[2].at<uchar>(i, j) = (1 - b - k) / (1 - k) * 255.;
            cmykw[3].at<uchar>(i, j) = k * 255.;
        }
    }
}

/*
help(): function to be spit out when the program arguments are not correct
*/
void help(int actual_argc = 2) {
    cout << "\033[1;31mERROR:\033[0m";
    cout << " Provided arguments are not correct\n" << endl;
    cout << "How To Use:\n ./PDF_Analyze INPUT_PDF_FILE [CONFIG_FILE]" << endl;
}

/*
extract_img_and_cmyk(): function to prepare and store representation of the image
    read png images and store them as source and cmyk channels
    resize the image and recalculate the dpi
*/
void extract_img_and_cmykw(string img_path,  vector<cv::Mat> &srcs, vector<vector<cv::Mat>> &cmyks){
    cv::Mat src = cv::imread(img_path);
    // cout<<"Height: "<<src.rows<<endl;
    // cout<<"Width: "<<src.cols<<endl;
    std::vector<cv::Mat> cmykw;
    resize(src, src, Size(resize_width, (int)resize_width*((float)src.rows / src.cols)) , INTER_LINEAR);
    // cout<<"Original rows pxl count: "<<src.rows<<"  cols pxl count: "<<src.cols<<endl;
    Split_to_cmykw(src, cmykw);
    srcs.push_back(src);
    cmyks.push_back(cmykw);
}

/*
max_coverage_of(): return the largest coverage percentage between all the cmyk channels
    // High coverage: locations wtih coverage of high cmyk values
*/
float max_coverage_of(vector<cv::Mat> cmykw){
    cv::Mat aggregate_img;
    bitwise_or(cmykw[0], cmykw[1], aggregate_img);
    bitwise_or(cmykw[2], aggregate_img, aggregate_img);
    bitwise_or(cmykw[3], aggregate_img, aggregate_img);
    threshold( aggregate_img, aggregate_img, threshold_to_zero_value, 255, THRESH_TOZERO );
    return (float)countNonZero(aggregate_img) / (aggregate_img.rows*aggregate_img.cols);
}

/*
bad_edge_coverage_of(): returns the differince in coverage percentage between edge and non-edge
    finds the max coverage between all 4 channels in cmyk
    returns differnt of the max between edge and non-edge portions
*/
float bad_edge_coverage_of(vector<cv::Mat> cmykw){
    std::vector<cv::Mat> cmykw_thresh;
    float rec_sides_pct = 1-2*(border_weight_pct);
    int top = cmykw[0].rows*border_weight_pct;
    int left = cmykw[0].cols*border_weight_pct;
    int height = cmykw[0].rows*rec_sides_pct;
    int width = cmykw[0].cols*rec_sides_pct;

    cv::Mat rec_mask = cv::Mat(cmykw[0].size(), CV_8UC1); //Scalar::all(0);
    cv::Mat border_mask;
    Rect r=Rect(top,left,width,height);  //create a Rect with top-left vertex at (10,20), of width 40 and height 60 pixels.
    rectangle(rec_mask,r,Scalar(255,255,255),FILLED,LINE_8);
    bitwise_not(rec_mask, border_mask);
    float max_border_coverage = 0;
    float max_non_border_coverage = 0;
    for(int i =0; i<4; i++){
        cv::Mat img_border, img_non_border;
        cmykw_thresh.push_back(cv::Mat(cmykw[0].size(), CV_8UC1));
        threshold( cmykw[i], cmykw_thresh[i], threshold_to_zero_value, 255, THRESH_BINARY );
        bitwise_and(cmykw_thresh[i], border_mask, img_border);
        bitwise_and(cmykw_thresh[i], rec_mask, img_non_border);
        // imshow(" img border", img_border);
        // imshow(" img NONborder", img_non_border);
        // cv::waitKey();
        // imgs_shown++;
        float coverage_border = (float)countNonZero(img_border) / ((cmykw[0].rows*cmykw[0].cols) - (height*width));
        float coverage_non_border = (float)countNonZero(img_non_border) / (height*width);
        if(coverage_border > max_border_coverage)
            max_border_coverage = coverage_border;
        if(coverage_non_border > max_non_border_coverage)
            max_non_border_coverage = coverage_non_border;
    }
    return max_border_coverage - max_non_border_coverage;
}

/*
is_downweb_text_pg(): determines if the provided image is an example of downweb text
*/
bool is_downweb_text_pg(cv::Mat src){
    int downweb_text_area = 0;
    Mat small;
    cvtColor(src, small, COLOR_BGR2GRAY);
    // morphological gradient
    Mat grad;
    Mat morphKernel = getStructuringElement(MORPH_ELLIPSE, Size(3, 3));
    morphologyEx(small, grad, MORPH_GRADIENT, morphKernel);
    // binarize
    Mat bw;
    threshold(grad, bw, 0.0, 255.0, THRESH_BINARY | THRESH_OTSU);
    // connect horizontally oriented regions
    Mat connected;
    morphKernel = getStructuringElement(MORPH_RECT, Size(9, 1));
    // removes small black pixels in an object, using rectangularly shaped kernal
    morphologyEx(bw, connected, MORPH_CLOSE, morphKernel);  
    // find contours
    Mat mask = Mat::zeros(bw.size(), CV_8UC1);
    vector<vector<cv::Point>> contours;
    vector<Vec4i> hierarchy;
    findContours(connected, contours, hierarchy, RETR_CCOMP, CHAIN_APPROX_SIMPLE, cv::Point(0, 0));
    // filter contours
    for(int idx = 0; idx >= 0; idx = hierarchy[idx][0])
    {
        if (idx>=contours.size()){
            break;
        }
        Rect rect = boundingRect(contours[idx]);
        Mat maskROI(mask, rect);
        maskROI = Scalar(0, 0, 0);
        // fill the contour
        drawContours(mask, contours, idx, Scalar(255, 255, 255), FILLED);
        // ratio of non-zero pixels in the filled region
        double r = (double)countNonZero(maskROI)/(rect.width*rect.height);
        if (r > .45 && (rect.height > 8 && rect.width > 8) ){
            // area is considered text area in this conditional
            rectangle(src, rect, Scalar(0, 255, 0), 2);
            downweb_text_area += rect.area();
        }
    }

    // imshow("text areas found", src);
    // cv::waitKey(0);
    // if(downweb_text_area < (downweb_txt_pct_min*src.rows*src.cols)){
        // imshow("text areas found", src);
        // cv::waitKey(0);
        // imgs_shown++;
    // }
    return (downweb_text_area > (downweb_txt_pct_min*src.rows*src.cols));
}

/*
analyze_img_individually(): parent function to evaluate flaking and k_buildup risks
    calculate proportion of blue, red, and green
    use k and white channel to find low k values
    call functions to evaluate k builduip and flaking risks
*/
void analyze_img_individually(cv::Mat src, vector<cv::Mat> cmykw, struct PageResult& page_result){
    int thresholds [5] = {c_binary_threshold_value, m_binary_threshold_value, y_binary_threshold_value, k_binary_threshold_value, white_binary_threshold_value}; // threshold values for cmykw thresholding, in order
    std::vector<cv::Mat> cmykw_thresh;
    // create binary threshold version of cmyk channels
    for (int i = 0; i<cmykw.size(); i++){
        cmykw_thresh.push_back(cv::Mat(cmykw[i].size(), CV_8UC1));
        threshold( cmykw[i], cmykw_thresh[i], thresholds[i], 255, 0 );
    }
    if (evaluate_kbuildup_risk){
        // K buildup risk
        int img_px_cnt = src.rows * src.cols;
        int k_buildup_max = k_buildup_proportion_max*img_px_cnt;
        Mat low_k, low_k_img;
        bitwise_or(cmykw_thresh[3], cmykw_thresh[4], low_k);
        // img.copyTo(low_k_img, cmykw[4]);
        // cv::imshow("white", low_k_img);
        // low_k_img = Scalar::all(0);
        // img.copyTo(low_k_img, cmykw[3]);
        // cv::imshow("Black", low_k_img);
        // imgs_shown++;
        bitwise_not(low_k, low_k);
        long long int k_buildup_cnt = countNonZero(low_k);
        // cout <<"    Total number of grey pixels: "<<k_buildup_cnt<<". Percent of image is: "<< (float)k_buildup_cnt/(img_px_cnt)<<endl;
        page_result.risk[kbuildup_idx].score = (float)k_buildup_cnt/img_px_cnt;
        if ( k_buildup_cnt > (k_buildup_max)){
            src.copyTo(low_k_img, low_k);
            string res = (k_buildup_cnt > k_buildup_max) ? "    Problematic" : "    Not Problematic";
            // cout << res << endl;
            page_result.risk[kbuildup_idx].problematic = true;
            // cv::imshow("K Buildup Risk", low_k_img);
            // imgs_shown++;
        }
    }
    if(evaluate_flake_risk){
        int max_area = (int) cur_dpi*cur_dpi/4; // area of 0.25 squared inches, for flaking risk
        cv::Mat blue, green, red;
        // define blue, green, and red channels
        bitwise_and(cmykw_thresh[0], cmykw_thresh[1], blue);
        bitwise_and(cmykw_thresh[0], cmykw_thresh[2], green);
        bitwise_and(cmykw_thresh[1], cmykw_thresh[2], red);
        // Flaking Risk
        // cout<< "problematic areas will need to be over: "<<  max_area <<endl;
        flaking_test(blue, "Blue", max_area, 11, page_result); // 11 indicates how much blur to add (higher number 
        flaking_test(green, "Green", max_area, 5, page_result); // blends disconnected flaked parts together more) (must be odd number)
        flaking_test(red, "Red", max_area, 7, page_result);
    }
    page_result.risk[coverage_idx].score =  max_coverage_of(cmykw);
    if (imgs_shown){
        imgs_shown=0;
        cv::imshow("src", src);
        cv::waitKey();
    }
}

/*
streak_risk(): parent function to evaluate streak risk
*/
void streak_risk(Mat front, Mat back, vector<cv::Mat> cmyk_frnt, vector<cv::Mat> cmyk_back, struct PageResult& frnt_pg_result, struct PageResult& back_pg_result){
    // Streak Risk

    // Count pixel
    int img_px_cnt_front = front.rows * front.cols;
    int img_px_cnt_back = back.rows * back.cols;

    // Min areas to be detected
    int min_area = img_px_cnt_front * streak_proportion_max;
    int total_max = streak_proportion_max * img_px_cnt_front * 100;

    Mat output_front, output_back;
    Mat srcs_HSV_front, srcs_HSV_back;
    Mat blur_front, blur_back;

    blur(front, blur_front, Size(5,5));
    blur(back, blur_back, Size(5,5));

    // Convert to HSV colorspace
    cvtColor(blur_front, srcs_HSV_front, COLOR_BGR2HSV);
    cvtColor(blur_back, srcs_HSV_back, COLOR_BGR2HSV);

    inRange(srcs_HSV_front, Scalar(streak_min_hue, streak_min_sat, streak_min_val), Scalar(streak_max_hue, streak_max_sat, streak_max_val), output_front);
    inRange(srcs_HSV_back, Scalar(streak_min_hue, streak_min_sat, streak_min_val), Scalar(streak_max_hue, streak_max_sat, streak_max_val), output_back);

    // imshow("(Streak Risk) Front", output_front);
    // imshow("(Streak Risk) Back", output_back);
    // cv::waitKey(0);

    Mat output_back_flip, overlap;
    flip(output_back, output_back_flip, 1);

    // Look for overlap
    bitwise_and(output_front, output_back_flip, overlap);

    // Find contour
    vector<vector<cv::Point> > contours;
    vector<Vec4i> hierarchy;
    findContours(overlap, contours, hierarchy, RETR_TREE, CHAIN_APPROX_SIMPLE);
    Mat drawing = Mat::zeros( overlap.size(), CV_8UC3 );
    for( size_t i = 0; i< contours.size(); i++ )
    {
        if (contourArea(contours[i]) > min_area){
            drawContours( drawing, contours, (int)i, Scalar(255, 255, 255), FILLED, LINE_8, hierarchy, 0 );
        }
    }
    
    Mat grey_res;
    cvtColor(drawing, grey_res, COLOR_BGR2GRAY);

    // Count area
    long long int streak_cnt = countNonZero(grey_res);
    int example_pdf_dpi = 42;

    // cout << "Total number of streak risk pixels: " << streak_cnt << ". Percent of image is: " << (float)streak_cnt/(img_px_cnt_front) << endl;
    frnt_pg_result.risk[streak_idx].score = (float)streak_cnt/(img_px_cnt_front);
    back_pg_result.risk[streak_idx].score = (float)streak_cnt/(img_px_cnt_back);
    if ((float)streak_cnt/(float)cur_dpi > (float)total_max/(float)example_pdf_dpi){   //  was previously  streak_cnt > total_max
        string res = (streak_cnt > (total_max)) ? "    Problematic" : "    Not Problematic";
        // cout << res << endl;
        frnt_pg_result.risk[streak_idx].problematic = true;
        back_pg_result.risk[streak_idx].problematic = true;
    }
}

/*
wrinkle_curl_risk(): parent function to evaluate wrinkle/curl risks
*/
void wrinkle_curl_risk(Mat front, Mat back, vector<cv::Mat> cmyk_frnt, vector<cv::Mat> cmyk_back, struct PageResult& frnt_pg_result, struct PageResult& back_pg_result){
    // wrinkle and curl risk
    float front_cov = max_coverage_of(cmyk_frnt);
    float back_cov = max_coverage_of(cmyk_back);
    frnt_pg_result.risk[wrinkle_curl_idx].score = max(frnt_pg_result.risk[wrinkle_curl_idx].score, abs(front_cov-back_cov));
    back_pg_result.risk[wrinkle_curl_idx].score = max(back_pg_result.risk[wrinkle_curl_idx].score, abs(front_cov-back_cov));
    if(max(front_cov, back_cov)>wrinkle_curl_minimum_coverage && abs(front_cov-back_cov) > wrinkle_curl_asymmetry_bound){
        // cout<<"(Wrinkle and Curl Risk) Page too dense of a coverage (Asymmetric)"<<endl;
        frnt_pg_result.risk[wrinkle_curl_idx].problematic = true;
        back_pg_result.risk[wrinkle_curl_idx].problematic = true;
    }
    float border_to_nonborder_cov_difference = bad_edge_coverage_of(cmyk_frnt);
    frnt_pg_result.risk[wrinkle_curl_idx].score = max(frnt_pg_result.risk[wrinkle_curl_idx].score, border_to_nonborder_cov_difference);
    if(border_to_nonborder_cov_difference > wrinkle_curl_asymmetry_bound){
        // cout<<"(Wrinkle and Curl Risk) Page's Edges too dense of a coverage"<<endl;
        frnt_pg_result.risk[wrinkle_curl_idx].problematic = true;
    }
    border_to_nonborder_cov_difference = bad_edge_coverage_of(cmyk_back);
    back_pg_result.risk[wrinkle_curl_idx].score = max(back_pg_result.risk[wrinkle_curl_idx].score, border_to_nonborder_cov_difference);
    if(border_to_nonborder_cov_difference > wrinkle_curl_asymmetry_bound){
        // cout<<"(Wrinkle and Curl Risk) Page's Edges too dense of a coverage"<<endl;
        back_pg_result.risk[wrinkle_curl_idx].problematic = true;
    }
    return;
}

/*
transfer_risk(): parent function to evaluate transfer risks
*/
void transfer_risk(vector<cv::Mat> srcs, vector<vector<cv::Mat>> cmykws, vector<struct PageResult>& Pages ){
    //Transfer Risk
    int cnt_page = 0;
    float min_ratio = 0.25;

    // Go through each page
    for( int i = 0; i < srcs.size(); i++ ){
        float score = 0;
        //imshow("(Transfer Risk) Original", srcs[i]);
        float height = srcs[i].rows;
        float width = srcs[i].cols;

        // Saturate color
        Mat srcs_HSV;
        cvtColor(srcs[i], srcs_HSV, COLOR_BGR2HSV);
        vector<Mat>  channels;
        split(srcs_HSV, channels);
        channels[1] = channels[1] * 1.5;
        merge(channels, srcs_HSV);
        Mat newhsv;
        cvtColor(srcs_HSV, newhsv, COLOR_HSV2BGR);

        // Apply thresholding
        Mat blur_src, binary, thresh;
        blur(newhsv, blur_src, Size(3,3));
        cvtColor(blur_src, binary, COLOR_BGR2GRAY);
        threshold(binary, thresh, transfer_risk_binary_threshold_value, 255, THRESH_BINARY);


        // Blur
        Mat edges, blurred, median;
        vector<vector<cv::Point> > contours;
        vector<Vec4i> hierarchy;
        GaussianBlur(thresh, median, Size(3, 3), 0);
        blur(median, blurred, Size(1,10));

        // Find contour
        findContours(blurred, contours, hierarchy, RETR_TREE, CHAIN_APPROX_SIMPLE);
        Mat drawing = Mat::zeros( blurred.size(), CV_8UC3 );
        for( size_t i = 0; i < contours.size(); i++ )
        {
            drawContours( drawing, contours, (int)i, Scalar(255, 255, 255), 1, LINE_8, hierarchy, 0 );
        }
        //imshow("(Transfer Risk) Contour", drawing);

        vector<Rect> boundRect( contours.size() );
        Mat drawing2 = Mat::zeros( blurred.size(), CV_8UC3 );
        int cnt_rect = 0;
        for( size_t j = 0; j < contours.size(); j++ ){
            boundRect[j] = boundingRect(contours[j]);
            if( boundRect[j].height > height * transfer_bounding_height_min && boundRect[j].width < width * transfer_bounding_width_max ){
                score += (float)boundRect[j].width/boundRect[j].height;
                rectangle( drawing2, boundRect[j].tl(), boundRect[j].br(), Scalar(255, 255, 255), FILLED );
                cnt_rect++;
            }
        }

        // No downweb stripes
        if(cnt_rect == 0){
            Pages[i].risk[transfer_idx].score = 0;
        }
        else{
            Pages[i].risk[transfer_idx].score = (float)score/cnt_rect;
        }

        if( Pages[i].risk[transfer_idx].score < min_ratio && Pages[i].risk[transfer_idx].score != 0 ){
            cnt_page++;
            Pages[i].risk[transfer_idx].problematic = true;
        }
        // imshow("(Transfer Risk) Result", drawing2);
        // cv::waitKey(0);

    }

    // not repeating
    if( cnt_page < transfer_risk_min_page_num ){
        for( int i = 0; i < srcs.size(); i++ ){
            Pages[i].risk[transfer_idx].problematic = false;
        }
    }
}


/*
ghosting_risk(): parent function to evaluate ghosting risks
*/
void ghosting_risk(vector<cv::Mat> srcs, vector<vector<cv::Mat>> cmykws, vector<struct PageResult>& Pages ){
    

    // ghosting risk
    int downweb_text_cnt = 0;
    if(srcs.size() < ghosting_downweb_text_pgs_min)
        return;
    for(int i=0; i<srcs.size(); i++){
        // cout << bool(i==srcs.size() -1) <<endl;
        if(is_downweb_text_pg(srcs[i]))
            downweb_text_cnt++;
        else{
            // cout<<"downweb txt count is: "<<downweb_text_cnt <<endl;
            if(downweb_text_cnt > ghosting_downweb_text_pgs_min){
                Pages[i].risk[ghosting_idx].score = max_coverage_of(cmykws[i]);
                if(max_coverage_of(cmykws[i])>ghosting_solid_fill_pct_min){
                    // cout<<"Ghosting Risk"<<endl;
                    Pages[i].risk[ghosting_idx].problematic = true;
                }
            }
            downweb_text_cnt = 0;
        }
    }
}

/*
    analysis(): parent function to call all the risks
*/
void analysis(vector<cv::Mat> srcs,  vector<vector<cv::Mat>> cmykws, vector<struct PageResult>& Pages){

    for(int i =0; i<srcs.size(); i++)
        analyze_img_individually(srcs[i], cmykws[i], Pages[i]);
    auto cur_time_ms = chrono::duration_cast<chrono::milliseconds>(chrono::system_clock::now().time_since_epoch()).count();
    system_log_filestream <<"\t" << cur_time_ms <<":\t Flaking/K-buildup/coverage risks (all checked on each page sequentially) complete"<<endl;
    system_log_filestream<<"\t\t"<< "Duration(ms): "<<cur_time_ms - unix_timestamp_ms <<endl;
    unix_timestamp_ms = cur_time_ms;

    // cout<<"\n"<<endl;
    // cout<<"front and back analysis (streak risk, transfer risk, Wrinkle and curl)"<<endl;
    if(evaluate_streak_risk){
        for(int i =0; i+1<srcs.size(); i+=2)
            streak_risk(srcs[i], srcs[i+1], cmykws[i], cmykws[i+1], Pages[i], Pages[i+1]);
        auto cur_time_ms = chrono::duration_cast<chrono::milliseconds>(chrono::system_clock::now().time_since_epoch()).count();
        system_log_filestream <<"\t" << cur_time_ms <<":\t streak risk complete. Duration(ms): "<<cur_time_ms - unix_timestamp_ms <<endl;
        unix_timestamp_ms = cur_time_ms;
    }
    if(evaluate_wrinkle_curl_risk){
        for(int i =0; i+1<srcs.size(); i+=2)
            wrinkle_curl_risk(srcs[i], srcs[i+1], cmykws[i], cmykws[i+1], Pages[i], Pages[i+1]);
        auto cur_time_ms = chrono::duration_cast<chrono::milliseconds>(chrono::system_clock::now().time_since_epoch()).count();
        system_log_filestream <<"\t" << cur_time_ms <<":\t wrinkle and curl risk complete. Duration(ms): "<<cur_time_ms - unix_timestamp_ms <<endl;
        unix_timestamp_ms = cur_time_ms;
    }
    
    // cout<<"\n"<<endl;
    // cout<<"Jobwide analysis (Ghosting and Transfer risk)"<<endl;
    if(evaluate_transfer_risk){
        transfer_risk(srcs, cmykws, Pages);
        auto cur_time_ms = chrono::duration_cast<chrono::milliseconds>(chrono::system_clock::now().time_since_epoch()).count();
        system_log_filestream <<"\t" << cur_time_ms <<":\t transfer risk complete. Duration(ms): "<<cur_time_ms - unix_timestamp_ms <<endl;
        unix_timestamp_ms = cur_time_ms;
    }
    if(evaluate_ghosting_risk){
        ghosting_risk(srcs, cmykws, Pages);
        auto cur_time_ms = chrono::duration_cast<chrono::milliseconds>(chrono::system_clock::now().time_since_epoch()).count();
        system_log_filestream <<"\t" << cur_time_ms <<":\t ghosting risk complete. Duration(ms): "<<cur_time_ms - unix_timestamp_ms <<endl;
        unix_timestamp_ms = cur_time_ms;
    }
    // cout<<"Jobwide analysis complete"<<endl;
}

/*
replaceAll: find and replace substring with another substring
*/
void replaceAll( string &s, const string &search, const string &replace ) {
    for( size_t pos = 0; ; pos += replace.length() ) {
        // Locate the substring to replace
        pos = s.find( search, pos );
        if( pos == string::npos ) break;
        // Replace by erasing and inserting
        s.erase( pos, search.length() );
        s.insert( pos, replace );
    }
}

int assign_or_default(int default_param, int provided_param){   return provided_param==-1 ? default_param : provided_param;}
float assign_or_default(float default_param, float provided_param){    return provided_param==-1 ? default_param : provided_param; }
string eval_default_bool_param(string param){ return param[0] =='-' ? "true" :  param; }

/*
    extract_config_parameters: function to extract parameters from optional json config file
        if file is not provided, this is never ran
        if a parameter is not present in the config file, then the default value remains (NEVER INPUT NONNEGATIVE VALUE)
*/
void extract_config_parameters(char* file_path){
    string file = file_path;
    string cmd = "jq ' if has(\"buffer\") then .buffer else -1 end' ";
    // must seperate by type
    string int_type_config_values[17]= {"resize_width","flaking_binary_threshold","threshold_to_zero_value",
                "c_binary_threshold_value","m_binary_threshold_value","y_binary_threshold_value",
                "k_binary_threshold_value","white_binary_threshold_value","streak_min_hue","streak_max_hue","streak_min_sat",
                "streak_max_sat","streak_min_val","streak_max_val","transfer_risk_binary_threshold_value","ghosting_downweb_text_pgs_min","transfer_risk_min_page_num"};

    string float_type_config_values[9]={"border_weight_pct","downweb_txt_pct_min","k_buildup_proportion_max","streak_proportion_max",
                "wrinkle_curl_asymmetry_bound","wrinkle_curl_minimum_coverage","transfer_bounding_height_min",
                "transfer_bounding_width_max","ghosting_solid_fill_pct_min"};

    string bool_type_config_values[6]={"evaluate_flake_risk","evaluate_streak_risk","evaluate_kbuildup_risk","evaluate_ghosting_risk","evaluate_transfer_risk","evaluate_wrinkle_curl_risk"};

    int i = 0;
    // cout<<"about to iterate through vars"<<endl;
    for (auto& var : {&resize_width,&flaking_binary_threshold,&threshold_to_zero_value, &c_binary_threshold_value,&m_binary_threshold_value,
                &y_binary_threshold_value,&k_binary_threshold_value,&white_binary_threshold_value, &streak_min_hue, &streak_max_hue, &streak_min_sat,
                &streak_max_sat,&streak_min_val,&streak_max_val,&transfer_risk_binary_threshold_value,&ghosting_downweb_text_pgs_min,&transfer_risk_min_page_num}) {
        if (!i)
            replaceAll(cmd, "buffer", int_type_config_values[0]);
        else
            replaceAll(cmd, int_type_config_values[i-1], int_type_config_values[i]);
        string command = cmd+file;
        *var = assign_or_default(*var,stoi(exec(command.c_str())));
        i++;
    }
    i =0;
    for(auto& var: {&border_weight_pct,&downweb_txt_pct_min,&k_buildup_proportion_max,&streak_proportion_max,
                &wrinkle_curl_asymmetry_bound,&wrinkle_curl_minimum_coverage,&transfer_bounding_height_min, &transfer_bounding_width_max,&ghosting_solid_fill_pct_min}){
        if (!i)
            replaceAll(cmd, int_type_config_values[16], float_type_config_values[0]);
        else
            replaceAll(cmd, float_type_config_values[i-1], float_type_config_values[i]);
        string command = cmd+file;
        *var = assign_or_default(*var, stof(exec(command.c_str())));
        i++;
    }
    i = 0;
    for(auto& var: {&evaluate_flake_risk, &evaluate_streak_risk,&evaluate_kbuildup_risk,&evaluate_ghosting_risk,&evaluate_transfer_risk,&evaluate_wrinkle_curl_risk}){
        if (!i)
            replaceAll(cmd, float_type_config_values[8], bool_type_config_values[0]);
        else
            replaceAll(cmd, bool_type_config_values[i-1], bool_type_config_values[i]);
        string command = cmd+file;
        istringstream is(eval_default_bool_param(exec(command.c_str())));
        is >> boolalpha >> *var;
        i++;
    }
}

string bool_eval(bool bolean_val){ return (bolean_val) ? "true": "false";}

string print_chosen_risks(){
    string risk_names[6]={"flake","streak","kbuildup","ghosting","transfer","wrinkle and curl"};
    string output = "";
    int i =0;
    bool no_previous_risk = true;
    for(auto& var: {&evaluate_flake_risk, &evaluate_streak_risk,&evaluate_kbuildup_risk,&evaluate_ghosting_risk,&evaluate_transfer_risk,&evaluate_wrinkle_curl_risk}){
        if(*var){
            if(no_previous_risk){
                no_previous_risk = false;
                output = risk_names[i];
            }
            else
                output = output + ", "+risk_names[i];
        }
        i++;
    }
    return no_previous_risk ? "None": output;
}

// Function to return 'true' if ANY page has this specific risk as present 
string risk_ever_present(vector<struct PageResult> Pages, int riskid){
    for (int i =0; i<Pages.size(); i++){
        if (Pages[i].risk[riskid].problematic)
            return "true";
    }
    return "false";
}

int main(int argc, char** argv) {
    if (argc < 2) {
        help(argc);
        return 1;
    }
    // Start filestream to system logs
    system_log_filestream.open(system_log_filename, fstream::out | fstream::app);
    if(!system_log_filestream)
        system_log_filestream.open(system_log_filename,  fstream::out | fstream::trunc);
    system_log_filestream << unix_timestamp_ms << ":\tStart of new job"<<endl;;

    // Declare objects for processing pdf/images
    vector<vector<cv::Mat>> cmykws;
    vector<cv::Mat> srcs;
    string pdf_file = argv[1];
    if (argc >=3)
        extract_config_parameters(argv[2]);
    unix_timestamp_ms = chrono::duration_cast<chrono::milliseconds>(chrono::system_clock::now().time_since_epoch()).count();
    system_log_filestream <<"\t" << unix_timestamp_ms <<":\t Following risks will evaulate: "<<print_chosen_risks()<<endl;

    string base_filename = pdf_file.substr(pdf_file.find_last_of("/\\") + 1);
    // string rm_cmd = "rm *.jpg"; // NOT NECESSARY IF THERE ARE NO JPEGS THAT THIS CODE DOESNT REMOVE
    // string buffer = exec(rm_cmd.c_str());
    string move_file_cmd = "cp " + pdf_file + " .";
    string get_new_name_cmd = "readlink -f "+base_filename;
    string pdf_alg_cmd = "./pdfpagesapp --source " + pdf_file +" --color RGB --format jpeg";
    string pg_cnt_cmd = "ls | grep .jpg | wc -l";
    string rm_png_cmd = "rm *.jpg";
    string rm_cmd = "rm *.pdf";

    // call command to copy file over to main directory
    system_log_filestream <<"\t\t about to move file to cur directory\n"<<endl;
    exec(move_file_cmd.c_str());
    system_log_filestream <<"\t\t about to get new name\n"<<endl;
    pdf_file = exec(get_new_name_cmd.c_str());
    size_t lastindex = pdf_file.find_last_of(".");
    string rawname = pdf_file.substr(0, lastindex);
    string json_output = rawname + ".json";
    string rm_json_cmd = "rm "+json_output;
    string jq_width_cmd = "cat " + json_output + " | jq -r .pageSummary.maxWidth";
    // run pdf_alg to convert pdf to jpg
    system_log_filestream <<"\t\t about to convert pdf to jpg\n"<<endl;
    exec(pdf_alg_cmd.c_str());
    system_log_filestream <<"\t\t about to get pgcnt\n"<<endl;
    int pgcnt = stoi(exec(pg_cnt_cmd.c_str())); // GET PAGE COUNT
    system_log_filestream <<"\t\t about to parse json to get width\n"<<endl;
    float W_mm = stof(exec(jq_width_cmd.c_str())); // GET WIDTH (mm)
    
    // Gets real Image DPI as cur_dpi, real width is W_mm/25.4
    for(int i =0; i<pgcnt; i++){
        string jpeg_file_name = rawname+"_RGB_"+to_string(i+1)+".jpg";
        extract_img_and_cmykw(jpeg_file_name, srcs, cmykws);
        cur_dpi = (int)srcs[i].cols*25.4/W_mm;
    }
 
    // Create Object to Contain the results
    struct PageResult pg;
    for(int i =0; i<7; i++){
        pg.risk[i].problematic = false;
        pg.risk[i].score = 0;
    }
    vector<struct PageResult> Pages;
    for(int i =0; i<srcs.size(); i++)
        Pages.push_back(pg);
    
    auto cur_ms = chrono::duration_cast<chrono::milliseconds>(chrono::system_clock::now().time_since_epoch()).count();
    system_log_filestream <<"\t" << cur_ms <<":\t PDF Images coppied. Duration(ms): "<<cur_ms - unix_timestamp_ms<<endl;
    unix_timestamp_ms = cur_ms;

    // choose which risk to analyze based on user input
    analysis(srcs, cmykws, Pages);
    //Print results
    string risks [6] = {"flaking", "lowKBuildup", "streaking", "transfer", "wrinkleCurl", "ghosting"};
    // OLD OUTPUT: RISK OF EVERY PAGE
    cout<<"{\"pages_cnt\": "<<Pages.size()<<","<<endl;
    cout<<"\"pages\":["<<endl;
    for(int i =0; i<Pages.size(); i++){
        cout <<"{ \"page number\": "<<i+1<<" ,";
        for(int j = 0; j<6; j++){
            cout<<"\""<<risks[j]<<"\": {";
            cout<<"\"riskScore\": "<<Pages[i].risk[j].score<<",";
            cout<<"\"risky\":" <<bool_eval(Pages[i].risk[j].problematic)<<"},";
        }
        cout<<"\"coverage\": "<<Pages[i].risk[coverage_idx].score<<"}";
        if(i != Pages.size()-1)
            cout<<",";
        cout<<endl;
    }
    cout<<"]"<<endl;
    cout<<"}"<<endl;
    
    string res = exec(rm_cmd.c_str());
    res = exec(rm_json_cmd.c_str());
    res = exec(rm_png_cmd.c_str());
    // if (imgs_shown)
    //     cv::waitKey();
    system_log_filestream <<"\t" << chrono::duration_cast<chrono::milliseconds>(chrono::system_clock::now().time_since_epoch()).count() <<":\t output returned, job complete\n"<<endl;
    system_log_filestream.close();
    return 0;
}
