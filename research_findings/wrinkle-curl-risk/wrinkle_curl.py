import cv2 as cv
import numpy as np
import sys

# LOGGING = False for printing out just page assessments and significant values. True for showing intermediate images as well
# SINGLE_PAGE = False if a full assessment of a front and back is being done
LOGGING = False
SINGLE_PAGE = False

# Threshold values
WC_MIN_COV = 0.6                # Threshold for average ink density (ink drop per pixel)
WC_ASY_BOUND = 0.4              # Threshold for average ink density differences

# Constants for resizing and border sizes
BORDER_WEIGHT = 0.1             # Percentage of the image that a single border side takes up        
RESIZE_WIDTH = 500              # Number of pixels wide that the resized image should be

# OpenCV defined maximum values for hue, saturation, and value
MAX_HUE = 180
MAX_SATURATION = 255
MAX_VALUE = 255

# 0 - UPPER_BLACK_VALUE = Blacks (blacks are dark no matter the saturation)
# UPPER_BLACK_VALUE - UPPER_DARK_VALUE = Dark colors (Dark no matter the saturation)
# UPPER_DARK_VALUE - MAX_VALUE = Vibrant colors (Split between medium and high saturation)
UPPER_BLACK_VALUE = 50
UPPER_DARK_VALUE = 160

# 0 - UPPER_WEAK_SATURATION = Very low saturation (0 ink weight)
# UPPER_WEAK_SATURATION - UPPER_MED_SATURATION = Medium saturation 
# UPPER_MED_SATURATION - MAX_SATURATION = High saturation 
UPPER_WEAK_SATURATION = 80
UPPER_MED_SATURATION = 180

# Constants that define different hues in the colorspace
# These hues will be separated individually among dark, vibrant, and medium saturation. 
LOWER_RED_TWO_HUE = 160
UPPER_RED_TWO_HUE = 180

LOWER_RED_ONE_HUE = 0
UPPER_RED_ONE_HUE = 10

LOWER_ORANGE_YELLOW_HUE = 11
UPPER_ORANGE_YELLOW_HUE = 39

LOWER_GREEN_HUE = 40
UPPER_GREEN_HUE = 70

LOWER_TEAL_HUE = 71
UPPER_TEAL_HUE = 99

LOWER_BLUE_HUE = 100
UPPER_BLUE_HUE = 130

LOWER_PURPLE_PINK_HUE = 131
UPPER_PURPLE_PINK_HUE = 159


# Class to store risk scores and problematic indicators
class RiskResult:
  def __init__(self, wrinkle_score, wrinkle_problematic, curl_score, curl_problematic):
    self.wrinkle_score = wrinkle_score
    self.wrinkle_problematic = wrinkle_problematic    
    self.curl_score = curl_score
    self.curl_problematic = curl_problematic


# Get the number of pixels that fall within the inputted HSV range
def get_ink_coverage(img_hsv, lower_bound, upper_bound, window_name, hue_name):
    mask = cv.inRange(img_hsv, lower_bound, upper_bound)
    coverage = cv.countNonZero(mask)

    if (LOGGING):
        print("Showing mask of hue: ", hue_name)
        cv.imshow(window_name, mask) 
        k = cv.waitKey(0)   

    return coverage

# Get masks of the border and inside areas of the image, inputted image is assumed to be RGB
def return_border_masks(image):
    # Calculate the positions where the top border ends and left border ends. Get percentage of image that the inner rectangle takes up
    rect_pct = 1 - 2 * BORDER_WEIGHT
    border_top = int(image.shape[0] * BORDER_WEIGHT)
    border_left = int(image.shape[1] * BORDER_WEIGHT)
   
   # Get dimensions of the main inner rectangle
    rect_height = int(image.shape[0] * rect_pct)
    rect_width = int(image.shape[1] * rect_pct)
   
   # Create the inner region mask. The borders will be white
    inside_mask = np.full(image.shape, 255, np.uint8)
    inside_mask[border_top:border_top+rect_height,border_left:border_left+rect_width] = image[border_top:border_top+rect_height,border_left:border_left+rect_width]
    
    # Create the border mask. The inside will be white
    border_mask = np.full(image.shape, 255, np.uint8)
    border_mask[:, 0:border_left] = image[:, 0:border_left]
    border_mask[0:border_top, :] = image[0:border_top, :]
    border_mask[:, border_left + rect_width:] = image[:, border_left + rect_width:]
    border_mask[border_top + rect_height:, :] = image[border_top + rect_height:, :]

    if (LOGGING):
        cv.imshow("Border mask", border_mask)
        k = cv.waitKey(0) 

        cv.imshow("Inside mask", inside_mask)
        k = cv.waitKey(0) 

    return inside_mask, border_mask, rect_height, rect_width

# Get the average ink densities of the inside mask and border mask and take the difference between the two
def get_border_difference(inside_mask, border_mask, rect_height, rect_width, page_area):
    inside_ink_coverage = get_ink_per_pixel_coverage(inside_mask, float(rect_height * rect_width))
    border_ink_coverage = get_ink_per_pixel_coverage(border_mask, (page_area - float(rect_height * rect_width)))

    print("\nAverage drops of ink per pixel in border: ", border_ink_coverage)
    print("Average drops of ink per pixel in inside: ", inside_ink_coverage)

    return abs(inside_ink_coverage - border_ink_coverage)

# Get the number of pixels in the inputted HSV image that fall within hue ranges that should have an ink density of 0.5 drops per pixel
def get_weight_half_coverage(hsv_img):
    # Light orange and yellow
    half_weight_coverage = get_ink_coverage(hsv_img, np.array([LOWER_ORANGE_YELLOW_HUE, UPPER_WEAK_SATURATION, UPPER_DARK_VALUE]), 
                                            np.array([UPPER_ORANGE_YELLOW_HUE, UPPER_MED_SATURATION, MAX_VALUE]), 
                                            "Masked Light Orange and Yellow", "Light Orange/Yellow")
    # Light teal
    half_weight_coverage += get_ink_coverage(hsv_img, np.array([LOWER_TEAL_HUE, UPPER_WEAK_SATURATION, UPPER_DARK_VALUE]), 
                                             np.array([UPPER_TEAL_HUE, UPPER_MED_SATURATION, MAX_VALUE]), 
                                             "Masked Light Teal", "Light Teal")
    # Light pink and purple
    half_weight_coverage += get_ink_coverage(hsv_img, np.array([LOWER_PURPLE_PINK_HUE, UPPER_WEAK_SATURATION, UPPER_DARK_VALUE]), 
                                             np.array([UPPER_PURPLE_PINK_HUE, UPPER_MED_SATURATION, MAX_VALUE]), 
                                             "Masked Light Pink/Purple", "Light Pink/Purple")

    return float(0.5 * half_weight_coverage)

# Get the number of pixels in the inputted HSV image that fall within hue ranges that should have an ink density of 1 drop per pixel
def get_weight_one_coverage(hsv_img):
    # Black
    one_weight_coverage = get_ink_coverage(hsv_img, np.array([0, 0, 0]), 
                                           np.array([MAX_HUE, MAX_SATURATION, UPPER_BLACK_VALUE]), 
                                           "Masked Black", "Black")
    # Light red(on both sides of the HSV hue spectrum)
    one_weight_coverage += get_ink_coverage(hsv_img, np.array([LOWER_RED_ONE_HUE, UPPER_WEAK_SATURATION, UPPER_DARK_VALUE]), 
                                            np.array([UPPER_RED_ONE_HUE, UPPER_MED_SATURATION, MAX_VALUE]), 
                                            "Masked Light Red One", "Light Red One")
    one_weight_coverage += get_ink_coverage(hsv_img, np.array([LOWER_RED_TWO_HUE, UPPER_WEAK_SATURATION, UPPER_DARK_VALUE]), 
                                            np.array([UPPER_RED_TWO_HUE, UPPER_MED_SATURATION, MAX_VALUE]), 
                                            "Masked Light Red Two", "Light Red Two")
    # Light green
    one_weight_coverage += get_ink_coverage(hsv_img, np.array([LOWER_GREEN_HUE, UPPER_WEAK_SATURATION, UPPER_DARK_VALUE]), 
                                            np.array([UPPER_GREEN_HUE, UPPER_MED_SATURATION, MAX_VALUE]), 
                                            "Masked Light Green", "Light Green")
    # Light blue
    one_weight_coverage += get_ink_coverage(hsv_img, np.array([LOWER_BLUE_HUE, UPPER_WEAK_SATURATION, UPPER_DARK_VALUE]), 
                                            np.array([UPPER_BLUE_HUE, UPPER_MED_SATURATION, MAX_VALUE]), 
                                            "Masked Light Blue", "Light Blue")
    # Vibrant orange and yellow
    one_weight_coverage += get_ink_coverage(hsv_img, np.array([LOWER_ORANGE_YELLOW_HUE, UPPER_MED_SATURATION, UPPER_DARK_VALUE]), 
                                            np.array([UPPER_ORANGE_YELLOW_HUE, MAX_SATURATION, MAX_VALUE]), 
                                            "Masked Vibrant Orange/Yellow", "Vibrant Orange/Yellow")
    # Vibrant teal
    one_weight_coverage += get_ink_coverage(hsv_img, np.array([LOWER_TEAL_HUE, UPPER_MED_SATURATION, UPPER_DARK_VALUE]), 
                                            np.array([UPPER_TEAL_HUE, MAX_SATURATION, MAX_VALUE]), 
                                            "Masked Vibrant Teal", "Vibrant Teal")
    # Vibrant pink and purple
    one_weight_coverage += get_ink_coverage(hsv_img, np.array([LOWER_PURPLE_PINK_HUE, UPPER_MED_SATURATION, UPPER_DARK_VALUE]), 
                                            np.array([UPPER_PURPLE_PINK_HUE, MAX_SATURATION, MAX_VALUE]), 
                                            "Masked Vibrant Pink/Purple", "Vibrant Pink/Purple")

    return float(one_weight_coverage)

# Get the number of pixels in the inputted HSV image that fall within hue ranges that should have an ink density of 1.5 drops per pixel
def get_weight_one_half_coverage(hsv_img):
   # Dark orange
   one_half_weight_coverage = get_ink_coverage(hsv_img, np.array([LOWER_ORANGE_YELLOW_HUE, 0, UPPER_BLACK_VALUE]), 
                                               np.array([UPPER_ORANGE_YELLOW_HUE, MAX_SATURATION, UPPER_DARK_VALUE]), 
                                               "Masked Dark Orange/Yellow", "Dark Orange/Yellow")
   # Dark teal
   one_half_weight_coverage += get_ink_coverage(hsv_img, np.array([LOWER_TEAL_HUE, 0, UPPER_BLACK_VALUE]), 
                                                np.array([UPPER_TEAL_HUE, MAX_SATURATION, UPPER_DARK_VALUE]), 
                                                "Masked Dark Teal", "Dark Teal")
    # Dark pink and purple              
   one_half_weight_coverage += get_ink_coverage(hsv_img, np.array([LOWER_PURPLE_PINK_HUE, 0, UPPER_BLACK_VALUE]), 
                                                np.array([UPPER_PURPLE_PINK_HUE, MAX_SATURATION, UPPER_DARK_VALUE]), 
                                                "Masked Dark Pink/Purple", "Dark Pink/Purple")

   return float (1.5 * one_half_weight_coverage)

# Get the number of pixels in the inputted HSV image that fall within hue ranges that should have an ink density of 2 drops per pixel
def get_weight_two_coverage(hsv_img):
   # Dark and Vibrant Red (both sides of the HSV hue spectrum)
   two_weight_coverage = get_ink_coverage(hsv_img, np.array([LOWER_RED_ONE_HUE, UPPER_MED_SATURATION, UPPER_BLACK_VALUE]), 
                                          np.array([UPPER_RED_ONE_HUE, MAX_SATURATION, MAX_VALUE]), 
                                          "Masked Dark and Vibrant Red One", "Dark and Vibrant Red One")
   two_weight_coverage += get_ink_coverage(hsv_img, np.array([LOWER_RED_TWO_HUE, UPPER_MED_SATURATION, UPPER_BLACK_VALUE]), 
                                           np.array([UPPER_RED_TWO_HUE, MAX_SATURATION, MAX_VALUE]), 
                                           "Masked Dark and Vibrant Red Two", "Dark and Vibrant Red Two")
   # Dark and Vibrant Green
   two_weight_coverage += get_ink_coverage(hsv_img, np.array([LOWER_GREEN_HUE, UPPER_MED_SATURATION, UPPER_BLACK_VALUE]), 
                                           np.array([UPPER_GREEN_HUE, MAX_SATURATION, MAX_VALUE]), 
                                           "Masked Dark and Vibrant Green", "Dark and Vibrant Green")
   # Dark and Vibrant Blue
   two_weight_coverage += get_ink_coverage(hsv_img, np.array([LOWER_BLUE_HUE, UPPER_MED_SATURATION, UPPER_BLACK_VALUE]), 
                                           np.array([UPPER_BLUE_HUE, MAX_SATURATION, MAX_VALUE]), 
                                           "Masked Dark and Vibrant Blue", "Dark and Vibrant Blue")

   return float(2 * two_weight_coverage)

# Get the overall average ink drop per pixel value for the whole image, using a weighted average
def get_ink_per_pixel_coverage(hsv_img, area):
 
    # get all coverages of different weights

    if (LOGGING):
        print("\nGetting hues with ink density 0.5 drops/pixel...")

    half_weight_coverage = get_weight_half_coverage(hsv_img)

    if (LOGGING):
        print("\nGetting hues with ink density 1 drop/pixel...")

    one_weight_coverage = get_weight_one_coverage(hsv_img)

    if (LOGGING):
        print("\nGetting hues with ink density 2 drops/pixel...")

    two_weight_coverage = get_weight_two_coverage(hsv_img)

    if (LOGGING):
        print("\nGetting hues with ink density 1.5 drops/pixel...")

    one_half_weight_coverage = get_weight_one_half_coverage(hsv_img)

    # Get sum of all coverages and divide by the total area of the image
    total_ink_coverage = one_weight_coverage + two_weight_coverage + half_weight_coverage + one_half_weight_coverage
    overall_coverage = float(total_ink_coverage / area)

    return overall_coverage


# For resizing the image
def resize(img):
    dim = (RESIZE_WIDTH, int(float(RESIZE_WIDTH) *  float(img.shape[0]) / float(img.shape[1])))
    resized = cv.resize(img, dim)
    return resized

# Do a single page assessment of the inputted OpenCV image object
def get_single_page_assessment(img):

    # Resize image
    img = resize(img)

    if (LOGGING):
        cv.imshow("Original Image Resized", img)

    # Convert to HSV color space
    hsvcolorspace = cv.cvtColor(img, cv.COLOR_BGR2HSV)

    if (LOGGING):
        cv.imshow("HSV Converted Image", hsvcolorspace)
        k = cv.waitKey(0) 

    # get page area and get the average ink density
    page_area = float(hsvcolorspace.shape[0] * hsvcolorspace.shape[1])

    total_coverage = get_ink_per_pixel_coverage(hsvcolorspace, page_area)
    print("\nAverage drops of ink per pixel: ", total_coverage)

    # Use the resized RGB image (before converting to hsv) to get the border and non-border masks
    inside_mask, border_mask, rect_height, rect_width = return_border_masks(img)
    inside_hsv = cv.cvtColor(inside_mask, cv.COLOR_BGR2HSV)
    border_hsv = cv.cvtColor(border_mask, cv.COLOR_BGR2HSV)

    if (LOGGING):
        cv.imshow("HSV Converted Inside Mask", inside_hsv)
        k = cv.waitKey(0)
        cv.imshow("HSV Converted Border Mask", border_hsv)
        k = cv.waitKey(0)

    # Get the difference in ink densities between border and non-border areas
    border_difference = get_border_difference(inside_hsv, border_hsv, rect_height, rect_width, page_area)
    print("\nDifference in average drops of ink per pixel for border areas vs inside: ", border_difference, "\n")

    if (border_difference > WC_ASY_BOUND and SINGLE_PAGE == True):
        print("\nCurl Problematic: Border coverage differences are large\n")

    if (total_coverage > WC_MIN_COV):
        print("Wrinkle Problematic: High levels of overall coverage\n")
    
    return total_coverage, border_difference

# Do a full risk assessment for an inputted front and back image file names 
def get_double_sided_page_assessment(front_img_path, back_img_path):
    # Setting up variables to store results
    front_result = RiskResult(0.0, False, 0.0, False)
    back_result = RiskResult(0.0, False, 0.0, False)

    # Read in front and back images to OpenCV
    front = cv.imread(front_img_path)
    back = cv.imread(back_img_path)
    back = cv.flip(back, 1)

    # Get single page assessments of both pages
    print("\n--- FRONT PAGE ASSESSMENT ---")
    front_coverage, front_border_diff = get_single_page_assessment(front)

    print("\n--- BACK PAGE ASSESSMENT ---")
    back_coverage, back_border_diff = get_single_page_assessment(back)

    # The wrinkle risk is dependent on the overall ink coverage. Curl risk is dependent on coverage differences
    front_result.wrinkle_score = front_coverage
    back_result.wrinkle_score = back_coverage
    front_result.curl_score = back_result.curl_score = abs(front_coverage - back_coverage)

    print("\n--- RISK ASSESSMENT ---")
    # Check if there is wrinkle risk (if at least one of the pages has high coverage)
    if (front_coverage > WC_MIN_COV or back_coverage > WC_MIN_COV):
        front_result.wrinkle_problematic = back_result.wrinkle_problematic = True
        print("\nWrinkle Problematic: Front or Back coverage is high")  
         
    # Check if there is curl risk
    # If at least one page has high coverage and there is a large difference between front and back coverages 
    # Or if there is a large difference in border to non-border coverages in either front or back pages
    if (max(front_coverage, back_coverage) > WC_MIN_COV and abs(front_coverage - back_coverage) > WC_ASY_BOUND):
        front_result.curl_problematic = back_result.curl_problematic = True
        print("\nCurl Problematic: Front or Back coverage is significant and Front/Back coverage differences are large")

    front_result.curl_score = max(front_result.curl_score, front_border_diff)
    back_result.curl_score = max(back_result.curl_score, back_border_diff)

    if (front_border_diff > WC_ASY_BOUND or back_border_diff > WC_ASY_BOUND):
        front_result.curl_problematic = back_result.curl_problematic = True
        print("\nCurl Problematic: Front or Back border coverage differences are large")

    if (front_result.wrinkle_problematic == False and back_result.wrinkle_problematic == False and front_result.curl_problematic == False and back_result.curl_problematic == False):
        print("\nFront and back pages are not problematic for wrinkling and curling")

    print("\n")
    return front_result, back_result


# Troubleshooting for if the user uses the program incorrectly
if (len(sys.argv) < 2 or len(sys.argv) > 3):
   print("\nHow to run:                   python ./wrinkle_curl.py <input_image_file_path>")
   print("How to run from Windows:      py ./wrinkle_curl.py <input_image_file_path>")
   print("Or:                           py ./wrinkle_curl.py <front_image_file_path> <back_image_file_path> ")
   print("Example:                      py ./wrinkle_curl.py ./test_images/saturation_color_space.png\n")
   quit()

# If a single image is inputted, run in single page mode. If two images inputted, run in double page mode
if (len(sys.argv) == 2):
    print("IMAGE ASSESSED: ", sys.argv[1], "\n")
    img = cv.imread(sys.argv[1])
    SINGLE_PAGE = True
    total_coverage, border_difference = get_single_page_assessment(img)
elif(len(sys.argv) == 3):
    print("FRONT IMAGE ASSESSED: ", sys.argv[1])
    print("BACK IMAGE ASSESSED: ", sys.argv[2], "\n")
    front_result, back_result = get_double_sided_page_assessment(sys.argv[1], sys.argv[2])



# For calibrating saturation and lightness values with ./test_images/saturation_color_space.png

# get_ink_coverage(hsvcolorspace, np.array([0, 0, 0]), np.array([MAX_HUE, MAX_SATURATION, UPPER_BLACK_VALUE]))
# get_ink_coverage(hsvcolorspace, np.array([0, 0, UPPER_BLACK_VALUE]), np.array([MAX_HUE, MAX_SATURATION, UPPER_DARK_VALUE]))
# get_ink_coverage(hsvcolorspace, np.array([0, UPPER_MED_SATURATION, UPPER_DARK_VALUE]), np.array([MAX_HUE, MAX_SATURATION, MAX_VALUE]))
# get_ink_coverage(hsvcolorspace, np.array([0, UPPER_WEAK_SATURATION, UPPER_DARK_VALUE]), np.array([MAX_HUE, UPPER_MED_SATURATION, MAX_VALUE]))
# get_ink_coverage(hsvcolorspace, np.array([0, 0, UPPER_DARK_VALUE]), np.array([MAX_HUE, UPPER_WEAK_SATURATION, MAX_VALUE]))