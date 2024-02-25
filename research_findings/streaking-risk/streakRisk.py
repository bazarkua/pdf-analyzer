# -*- coding: utf-8 -*-
"""
@author: Lawson Dietz
"""
import cv2
import numpy as np
import os

# Masking values
yellow_top = np.array([45,255,255])
yellow_bot = np.array([25,50,20])
cyan_top = np.array([100,255,255])
cyan_bot = np.array([80,50,20])
magenta_top = np.array([165,255,255])
magenta_bot = np.array([140,50,20])

# PDF Front
image1 = cv2.imread("GBI_ref_4_Adventure_magazineOp_up-1.jpg")
# PDF Back + Flip
image2 = cv2.flip(cv2.imread("GBI_ref_4_Adventure_magazineOp_up-2.jpg"), 1)

# Check image exists
assert image1 is not None, "file could not be read, check with os.path.exists()"
assert image2 is not None, "file could not be read, check with os.path.exists()"

# Count Pixels (Parameters)
img_px_front = image1.shape[0] * image1.shape[1];
img_px_back = image2.shape[0] * image2.shape[1];

# Assume 150 dpi unless otherwise stated
dpi = 150

# Num pixels in half inch
pix_per_area =  (dpi * .5) * (dpi * .5)


# Blur size
size = (5, 5)


# Mask Front 
copy1_f = image1.copy()
copy2_f = image1.copy()
copy3_f = image1.copy()

# Mask Back
copy1_b = image2.copy()
copy2_b = image2.copy()
copy3_b = image2.copy()


# Mask Front 
copy1_f = image1.copy()
copy2_f = image1.copy()

# Mask Back
copy1_b = image2.copy()
copy2_b = image2.copy()


# Convert to HSV
image1 = cv2.cvtColor(image1, cv2.COLOR_BGR2HSV)
image2 = cv2.cvtColor(image2, cv2.COLOR_BGR2HSV)


# ~~~~~~~~~~~~~~~~~~~~~ MASKING ~~~~~~~~~~~~~~~~~~~~~

# In range Yellow
mask1_f = cv2.inRange(image1, yellow_bot, yellow_top)
# In range Magenta
mask2_f = cv2.inRange(image1, magenta_bot, magenta_top)
# In range Cyan
mask3_f = cv2.inRange(image1, cyan_bot, cyan_top)

# In range Yellow
mask1_b = cv2.inRange(image2, yellow_bot, yellow_top)
# In range Magenta
mask2_b = cv2.inRange(image2, magenta_bot, magenta_top)
# In range Cyan
mask3_b = cv2.inRange(image2, cyan_bot, cyan_top)

# Mask Yellow
result1 = cv2.bitwise_and(copy1_f, copy1_f, mask=mask1_f)
# Mask Magenta
result2 = cv2.bitwise_and(copy2_f, copy2_f, mask=mask2_f)
# Mask Cyan
result3 = cv2.bitwise_and(copy3_f, copy3_f, mask=mask3_f)

# Bitwise OR both Masks
result3_f = cv2.bitwise_or(result1, result2)
result3_f = cv2.bitwise_or(result3_f, result3)

# Mask Yellow
result1 = cv2.bitwise_and(copy1_b, copy1_b, mask=mask1_b)
# Mask Magenta
result2 = cv2.bitwise_and(copy2_b, copy2_b, mask=mask2_b)
# Mask Cyan
result3 = cv2.bitwise_and(copy3_f, copy3_f, mask=mask3_f)

# Bitwise OR both Masks
result3_b = cv2.bitwise_or(result1, result2)
result3_b = cv2.bitwise_or(result3_b, result3)

'''
# PDF Front Mask
cv2.namedWindow("GBI_1_MASK", cv2.WINDOW_NORMAL)
cv2.resizeWindow("GBI_1_MASK", 500, 625)
cv2.imshow("GBI_1_MASK", result3_f)

# PDF Back Mask
cv2.namedWindow("GBI_2_MASK", cv2.WINDOW_NORMAL)
cv2.resizeWindow("GBI_2_MASK", 500, 625)
cv2.imshow("GBI_2_MASK", result3_b)
'''

# Combine Front and Back
result3_both = cv2.bitwise_and(result3_b, result3_f)

'''
# PDF Front Back Overlap Mask
cv2.namedWindow("GBI_MASK", cv2.WINDOW_NORMAL)
cv2.resizeWindow("GBI_MASK", 500, 625)
cv2.imshow("GBI_MASK", result3_both)
cv2.imwrite("GBI_MASK.jpg", result3_both)
'''

# ~~~~~~~~~~~~~~~~~~~~~ CONTOURS ~~~~~~~~~~~~~~~~~~~~~


# Convert to Gray
gray = cv2.bitwise_not(cv2.GaussianBlur(cv2.cvtColor(result3_both.copy(), cv2.COLOR_BGR2GRAY), (3, 3), 0))

# Display Edges
cv2.namedWindow("GBI_EDGES", cv2.WINDOW_NORMAL)
cv2.resizeWindow("GBI_EDGES", 500, 625)
cv2.imshow("GBI_EDGES", gray)

cv2.imwrite("GBI_EDGES.jpg", gray)

# Find Contours
contours, hierarchy = cv2.findContours(gray, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)

'''
TESTING CONTOURS WOULD GO HERE
'''

# Draw Conotours
cv2.drawContours(result3_both, contours, -1, (0, 0, 255), 1, cv2.LINE_8, hierarchy)


# ~~~~~~~~~~~~~~~~~~~~~ CONSTRAINTS ~~~~~~~~~~~~~~~~~~~~~

'''
CONSTRAINTS SECTION FROM TESTING CONTOURS WOULD GO HERE
'''

# Display Contours
cv2.namedWindow("GBI_CONTOURS", cv2.WINDOW_NORMAL)
cv2.resizeWindow("GBI_CONTOURS", 500, 625)
cv2.imshow("GBI_CONTOURS", result3_both)
cv2.imwrite("GBI_CONTOURS_RES3.jpg", result3_both)

cv2.waitKey(0)


