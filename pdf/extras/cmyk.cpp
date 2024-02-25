#include "opencv2/core/core.hpp"
#include <opencv2/highgui/highgui.hpp>
#include <opencv2/opencv.hpp>
#include <vector>
#define PI 3.1416
#define min(a, b) (a <b? a: b)
using namespace std;
using namespace cv;


int rgb2cmyk (Mat & image, Mat & cmyk) {
	if (! image.data) {
		cout << "Miss Data" << endl;
		return -1;
	}
	int nl = image.rows;//Number of rows
	int nc = image.cols;//Number of columns
	if (image.isContinuous ()) {//No additional padding pixels
		nc = nc * nl;
		nl = 1;//It is now a 1D array
	}
	//For continuous images, this loop is only executed once
	for (int i = 0; i <nl; i ++) {
		uchar * data = image.ptr <uchar> (i);
		uchar * dataCMYK = cmyk.ptr <uchar> (i);
		for (int j = 0; j <nc; j ++) {
			uchar b = data [3 * j];
			uchar g = data [3 * j + 1];
			uchar r = data [3 * j + 2];
			uchar c = 255-r;
			uchar m = 255-g;
			uchar y = 255-b;
			uchar k = min (min (c, m), y);
			dataCMYK [4 * j] = c-k;
			dataCMYK [4 * j + 1] = m-k;
			dataCMYK [4 * j + 2] = y-k;
			dataCMYK [4 * j + 3] = k;
		}
	}
	return 0;
}
int main () {
	Mat img = imread ("colorful.jpg");
	if (! img.data) {
		cout << "Miss Data" << endl;
		return -1;
	}
	Mat img_cmyk;//, img_hsi;
	Mat img_hsv;
	vector <Mat> vecRgb, vecHsi, vecHls, vecHsv, vecCmyk;
	img_hsv.create (img.rows, img.cols, CV_8UC3);
	Mat img_hls;
	img_hls.create (img.rows, img.cols, CV_8UC3);
	//Generate a 4-channel cmyk image with the same size as the input image
	img_cmyk.create (img.rows, img.cols, CV_8UC4);
	//img_hsi.create (img.rows, img.cols, CV_8UC3);
	rgb2cmyk (img, img_cmyk);
	//rgb2hsi (img, img_hsi);
	cvtColor (img, img_hsv, COLOR_BGR2HSV);
	cvtColor (img, img_hls, COLOR_BGR2HLS);
	split (img_cmyk, vecCmyk);
	//split (img_hsi, vecHsi);
	cout << "pixel (0,0) in RGB" << endl;
	for (int i = 0; i <3; i ++) {
		cout << (int) img.at <Vec3b> (0,0) [i] << "";
	}
	cout << endl << "pixel (0,0) in CMYK" << endl;
	for (int i = 0; i <4; i ++) {
		cout << (int) img_cmyk.at <Vec4b> (0,0) [i] << "";
	}
	int a = min (min (24,32), 16);
	cout << endl << a;
	namedWindow ("RGB_Image");
	namedWindow ("CMYK_Image");
	//namedWindow ("HSV_Image");
	//namedWindow ("HLS_Image");
	namedWindow ("HSI_Image");
	namedWindow ("CMYK_C");
	namedWindow ("CMYK_M");
	namedWindow ("CMYK_Y");
	namedWindow ("CMYK_K");
	imshow ("CMYK_C", vecCmyk [0]);
	imshow ("CMYK_M", vecCmyk [1]);
	imshow ("CMYK_Y", vecCmyk [2]);
	imshow ("CMYK_K", vecCmyk [3]);
	//imshow ("HSI_H", vecHsi [0]);
	//imshow ("HSI_S", vecHsi [1]);
	//imshow ("HSI_I", vecHsi [2]);
	imshow ("RGB_Image", img);
	imshow ("CMYK_Image", img_cmyk);
	//imshow ("HSV_Image", img_hsv);
	//imshow ("HLS_Image", img_hls);
	//imshow ("HSI_Image", img_hsi);
	waitKey ();
	return 0;
}