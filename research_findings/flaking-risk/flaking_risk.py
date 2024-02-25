import cv2
import sys
import numpy as np
from scipy.ndimage import gaussian_filter
from skimage import measure

CMYK_THRESH_ZERO_VALUE = 10
WC_MIN_COV = 0.6
WC_ASY_BOUND = 0.35
BORDER_WEIGHT = 0.1
RESIZE_WIDTH = 500

#LOWER_HSL = np.array([0, 50, 0])
#UPPER_HSL = np.array([180, 255, 255])
#LOWER_BLACK = np.array([0, 0, 0])
#UPPER_BLACK = np.array([180, 255, 128])

LOWER_GREEN = np.array([50, 50, 50])
UPPER_GREEN = np.array([90, 255, 255])

#LOWER_BLUE = np.array([100, 150, 50])
#UPPER_BLUE = np.array([140, 255, 255])
# Adjust these values as needed to capture the blue regions in your images
LOWER_BLUE = np.array([100, 50, 50])
UPPER_BLUE = np.array([140, 255, 255])
LOWER_LIGHT_BLUE = np.array([80, 50, 50])
UPPER_LIGHT_BLUE = np.array([100, 255, 255])

LOWER_RED1 = np.array([0, 160, 80])
UPPER_RED1 = np.array([10, 255, 255])
LOWER_RED2 = np.array([170, 160, 80])
UPPER_RED2 = np.array([180, 255, 255])

class RiskResult:
    def __init__(self, score, is_problematic):
        self.score = score
        self.is_problematic = is_problematic

def flaking_test(image, cmyk_channels):
    img_hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

    # Calculate the coverage of high intensity blue
    blue_mask = cv2.inRange(img_hsv, LOWER_BLUE, UPPER_BLUE)
    high_intensity_blue_coverage = cv2.countNonZero(blue_mask) / (image.shape[0] * image.shape[1])

    secondary_colors_threshold = 220
    secondary_cmyk = []
    secondary_cmyk.append(cv2.inRange(cmyk_channels[0], secondary_colors_threshold, 255))  # Red (Cyan inverted)
    secondary_cmyk.append(cv2.inRange(cmyk_channels[1], secondary_colors_threshold, 255))  # Green (Magenta inverted)

    # Replace the Blue (Yellow inverted) calculation with the high intensity blue coverage
    secondary_cmyk.append(blue_mask)
    
    # Calculate the coverage of secondary colors
    secondary_coverage = [cv2.countNonZero(sc) / (image.shape[0] * image.shape[1]) for sc in secondary_cmyk[:-1]]
    secondary_coverage.append(high_intensity_blue_coverage)

    # Determine if the flaking risk is problematic using the given threshold
    threshold = 0.5 / (image.shape[0] * image.shape[1])
    is_problematic = [coverage > threshold for coverage in secondary_coverage]

    return [RiskResult(coverage, problematic) for coverage, problematic in zip(secondary_coverage, is_problematic)]


def split_to_cmykw(image):
    image_float = image.astype(float) / 255.0
    k = 1 - image_float.max(axis=-1)
    k3 = np.expand_dims(k, axis=-1)

    c = (1 - image_float[..., 0] - k) / (1 - k + 1e-10)
    m = (1 - image_float[..., 1] - k) / (1 - k + 1e-10)
    y = (1 - image_float[..., 2] - k) / (1 - k + 1e-10)

    cmyk = np.concatenate([c[..., np.newaxis], m[..., np.newaxis], y[..., np.newaxis], k3], axis=-1)
    cmykw = (cmyk * 255).astype(np.uint8)

    return cv2.split(cmykw)

def help():
    print("Usage: python flaking_risk.py <image_path>")

def extract_img_and_cmykw(image_path):
    image = cv2.imread(image_path)
    if image is None:
        raise FileNotFoundError("Image not found")

    resized_image = cv2.resize(image, (800, 800))
    return resized_image, split_to_cmykw(resized_image)


def compute_risk(image_path):
    image = cv2.imread(image_path)
    resized_image = cv2.resize(image, (RESIZE_WIDTH, int(image.shape[0] * (RESIZE_WIDTH / image.shape[1]))))
    img_hsv = cv2.cvtColor(resized_image, cv2.COLOR_BGR2HSV)

    inside_mask, border_mask = return_border_masks(img_hsv)
    border_diff = get_border_difference(inside_mask, border_mask)

    red_coverage = get_red_coverage(img_hsv)
    green_coverage = get_green_coverage(img_hsv)
    blue_coverage = get_blue_coverage(img_hsv)
    
    red_blue_overlap, red_green_overlap, green_blue_overlap = get_color_overlaps(img_hsv)

    # Adjust risk score computation here to incorporate color overlaps
    risk_score = (border_diff * WC_MIN_COV) + (red_coverage * WC_ASY_BOUND) - (green_coverage * WC_ASY_BOUND) + (blue_coverage * WC_ASY_BOUND)
    risk_score += red_blue_overlap + red_green_overlap + green_blue_overlap

    problematic = risk_score >= 0.5

    return RiskResult(risk_score, problematic)

def return_border_masks(image):
    rect_pct = 1 - 2 * BORDER_WEIGHT
    border_top = int(image.shape[0] * BORDER_WEIGHT)
    border_left = int(image.shape[1] * BORDER_WEIGHT)

    rect_height = int(image.shape[0] * rect_pct)
    rect_sides = int(image.shape[1] * rect_pct)

    inside_mask = np.zeros(image.shape, np.uint8)
    inside_mask[border_top:border_top + rect_height, border_left:border_left + rect_sides] = image[
                                                                                               border_top:border_top + rect_height,
                                                                                               border_left:border_left + rect_sides]

    border_mask = np.zeros(image.shape, np.uint8)
    border_mask[:, 0:border_left] = image[:, 0:border_left]
    border_mask[0:border_top, :] = image[0:border_top, :]
    border_mask[:, border_left + rect_sides:] = image[:, border_left + rect_sides:]
    border_mask[border_top + rect_height:, :] = image[border_top + rect_height:, :]

    return inside_mask, border_mask


def get_border_difference(inside_mask, border_mask):
    ret, inside_thresh = cv2.threshold(inside_mask, CMYK_THRESH_ZERO_VALUE, 255, cv2.THRESH_BINARY)
    ret, border_thresh = cv2.threshold(border_mask, CMYK_THRESH_ZERO_VALUE, 255, cv2.THRESH_BINARY)

    inside_result = cv2.bitwise_and(inside_thresh, inside_mask, mask=None)
    border_result = cv2.bitwise_and(border_thresh, border_mask, mask=None)

    inside_coverage = float(cv2.countNonZero(inside_result) / (inside_result.shape[0] * inside_result.shape[1]))
    border_coverage = float(cv2.countNonZero(border_thresh) / (border_mask.shape[0] * border_mask.shape[1]))

    return border_coverage - inside_coverage

def get_red_coverage(img_hsv):
    red_mask_one = cv2.inRange(img_hsv, LOWER_RED1, UPPER_RED1)
    red_mask_two = cv2.inRange(img_hsv, LOWER_RED2, UPPER_RED2)

    red_mask = red_mask_one + red_mask_two
    red_coverage = float(cv2.countNonZero(red_mask) / (red_mask.shape[0] * red_mask.shape[1]))

    return red_coverage

def get_green_coverage(img_hsv):
    green_mask = cv2.inRange(img_hsv, LOWER_GREEN, UPPER_GREEN)
    green_coverage = float(cv2.countNonZero(green_mask) / (green_mask.shape[0] * green_mask.shape[1]))

    return green_coverage

def get_blue_coverage(img_hsv):
    blue_mask = cv2.inRange(img_hsv, LOWER_BLUE, UPPER_BLUE)
    light_blue_mask = cv2.inRange(img_hsv, LOWER_LIGHT_BLUE, UPPER_LIGHT_BLUE)
    combined_blue_mask = cv2.bitwise_or(blue_mask, light_blue_mask)
    
    blue_coverage = float(cv2.countNonZero(combined_blue_mask) / (combined_blue_mask.shape[0] * combined_blue_mask.shape[1]))

    return blue_coverage


def get_color_overlaps(img_hsv):
    # compute color masks
    red_mask_one = cv2.inRange(img_hsv, LOWER_RED1, UPPER_RED1)
    red_mask_two = cv2.inRange(img_hsv, LOWER_RED2, UPPER_RED2)
    red_mask = red_mask_one + red_mask_two

    green_mask = cv2.inRange(img_hsv, LOWER_GREEN, UPPER_GREEN)

    blue_mask = cv2.inRange(img_hsv, LOWER_BLUE, UPPER_BLUE)
    light_blue_mask = cv2.inRange(img_hsv, LOWER_LIGHT_BLUE, UPPER_LIGHT_BLUE)
    combined_blue_mask = cv2.bitwise_or(blue_mask, light_blue_mask)

    # calculate overlaps using bitwise operations
    red_blue_overlap = cv2.bitwise_and(red_mask, combined_blue_mask)
    red_green_overlap = cv2.bitwise_and(red_mask, green_mask)
    green_blue_overlap = cv2.bitwise_and(green_mask, combined_blue_mask)

    # compute coverage of each overlap
    red_blue_coverage = float(cv2.countNonZero(red_blue_overlap) / (red_blue_overlap.shape[0] * red_blue_overlap.shape[1]))
    red_green_coverage = float(cv2.countNonZero(red_green_overlap) / (red_green_overlap.shape[0] * red_green_overlap.shape[1]))
    green_blue_coverage = float(cv2.countNonZero(green_blue_overlap) / (green_blue_overlap.shape[0] * green_blue_overlap.shape[1]))

    return red_blue_coverage, red_green_coverage, green_blue_coverage

def show_color_overlap(image_path):
    # Load the image
    image = cv2.imread(image_path)
    img_hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

    # Create the masks for each color
    red_mask1 = cv2.inRange(img_hsv, LOWER_RED1, UPPER_RED1)
    red_mask2 = cv2.inRange(img_hsv, LOWER_RED2, UPPER_RED2)
    red_mask = cv2.bitwise_or(red_mask1, red_mask2)

    green_mask = cv2.inRange(img_hsv, LOWER_GREEN, UPPER_GREEN)

    blue_mask = cv2.inRange(img_hsv, LOWER_BLUE, UPPER_BLUE)
    light_blue_mask = cv2.inRange(img_hsv, LOWER_LIGHT_BLUE, UPPER_LIGHT_BLUE)
    blue_mask = cv2.bitwise_or(blue_mask, light_blue_mask)

    # Combine the masks together
    combined_mask = cv2.bitwise_or(red_mask, green_mask)
    combined_mask = cv2.bitwise_or(combined_mask, blue_mask)

    # Create the color overlap image by applying the combined mask
    color_overlap_image = cv2.bitwise_and(image, image, mask=combined_mask)

    # Display the original and color overlap images
    cv2.imshow("Original Image", image)
    cv2.imshow("Color Overlap Image", color_overlap_image)

def show_high_intensity_green(image_path):
    image = cv2.imread(image_path)
    img_hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

    green_mask = cv2.inRange(img_hsv, LOWER_GREEN, UPPER_GREEN)
    green_image = cv2.bitwise_and(image, image, mask=green_mask)
    cv2.imshow("Original Image - Green", image)
    cv2.imshow("High Intensity Green Image", green_image)
    show_green_mask(image_path)

def show_high_intensity_blue(image_path):
    image = cv2.imread(image_path)
    img_hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

    blue_mask = cv2.inRange(img_hsv, LOWER_BLUE, UPPER_BLUE)
    light_blue_mask = cv2.inRange(img_hsv, LOWER_LIGHT_BLUE, UPPER_LIGHT_BLUE)
    combined_blue_mask = cv2.bitwise_or(blue_mask, light_blue_mask)

    blue_image = cv2.bitwise_and(image, image, mask=combined_blue_mask)
    cv2.imshow("Original Image - Blue", image)
    cv2.imshow("High Intensity Blue Image", blue_image)
    show_blue_mask(image_path)

def show_high_intensity_red(image_path):
    image = cv2.imread(image_path)
    img_hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

    red_mask1 = cv2.inRange(img_hsv, LOWER_RED1, UPPER_RED1)
    red_mask2 = cv2.inRange(img_hsv, LOWER_RED2, UPPER_RED2)
    red_mask = cv2.bitwise_or(red_mask1, red_mask2)
    red_image = cv2.bitwise_and(image, image, mask=red_mask)
    cv2.imshow("Original Image - Red", image)
    cv2.imshow("High Intensity Red Image", red_image)
    show_red_mask(image_path)

def show_red_mask(image_path):
    image = cv2.imread(image_path)
    img_hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

    red_mask1 = cv2.inRange(img_hsv, LOWER_RED1, UPPER_RED1)
    red_mask2 = cv2.inRange(img_hsv, LOWER_RED2, UPPER_RED2)
    red_mask = cv2.bitwise_or(red_mask1, red_mask2)
    cv2.imshow("Red Mask", red_mask)

def show_green_mask(image_path):
    image = cv2.imread(image_path)
    img_hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

    green_mask = cv2.inRange(img_hsv, LOWER_GREEN, UPPER_GREEN)
    cv2.imshow("Green Mask", green_mask)

def show_blue_mask(image_path):
    image = cv2.imread(image_path)
    img_hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)

    blue_mask = cv2.inRange(img_hsv, LOWER_BLUE, UPPER_BLUE)
    light_blue_mask = cv2.inRange(img_hsv, LOWER_LIGHT_BLUE, UPPER_LIGHT_BLUE)
    combined_blue_mask = cv2.bitwise_or(blue_mask, light_blue_mask)
    
    cv2.imshow("Blue Mask", combined_blue_mask)


def main():
    if len(sys.argv) != 2:
        help()
        return

    image_path = sys.argv[1]
    image, cmyk_channels = extract_img_and_cmykw(image_path)
    flaking_risks = flaking_test(image, cmyk_channels)

    color_names = ["Red", "Green", "Blue"]
    max_score = 0
    for i, (color, risk) in enumerate(zip(color_names, flaking_risks)):
        print(f"{color} flaking risk score: {risk.score:.4f}")
        print(f"Is {color} flaking problematic?", risk.is_problematic)

        if risk.score > max_score:
            max_score = risk.score

    print("Flaking risk confidence: {:.4f}".format(max_score))

    if max_score < 0.015:
        risk_classification = "Low"
    elif 0.015 <= max_score < 0.035:
        risk_classification = "Moderate"
    else:
        risk_classification = "High"

    print("Flaking risk classification:", risk_classification)
    
    # Call the high intensity color functions
    show_high_intensity_red(image_path)
    # Wait for any key press and close the windows
    cv2.waitKey(0)
    cv2.destroyAllWindows()

    show_high_intensity_green(image_path)
    # Wait for any key press and close the windows
    cv2.waitKey(0)
    cv2.destroyAllWindows()

    show_high_intensity_blue(image_path)
    # Wait for any key press and close the windows
    cv2.waitKey(0)
    cv2.destroyAllWindows()

    # Call the color overlap function
    show_color_overlap(image_path)
    # Wait for any key press and close the windows
    cv2.waitKey(0)
    cv2.destroyAllWindows()

# Call main function
if __name__ == "__main__":
    main()
