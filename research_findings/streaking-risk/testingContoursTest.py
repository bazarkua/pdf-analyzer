# -*- coding: utf-8 -*-
"""
@author: Lawson Dietz
"""

import cv2
import numpy as np
from treelib import Tree

# Create txt file
file = open('testing_test.txt', 'w')

image_name = "ss1.jpg"

# Test image
image = cv2.imread(image_name)

file.write('Image Name: {}\n\n'.format(image_name))

img_px_front = image.shape[0] * image.shape[1];
file.write('Image Pixels: {}\n\n'.format(img_px_front))

# Image DPI
dpi = 120

# Num pixels in half inch
min_area =  (dpi * .5) ** 2
file.write('Min Area: {}\n\n'.format(min_area))


# Aspect ratios, 60
min_dimensions = dpi * .5

# Grayscale
gray = cv2.GaussianBlur(cv2.cvtColor(image, cv2.COLOR_BGR2GRAY), (5,5), cv2.BORDER_DEFAULT)

# Morphological operation to remove more noise
gray = cv2.morphologyEx(gray, cv2.MORPH_CLOSE, np.ones((7,7),np.uint8))

# Threshold value changes depending on testing image vs real image
ret, thresh = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)

cv2.namedWindow("CONTOURS", cv2.WINDOW_NORMAL)
cv2.imshow("CONTOURS", thresh)
cv2.waitKey(0)

# Find contours in the image
contours, hierarchy = cv2.findContours(thresh, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)


# Pixel Value at 0,0 of first contour
# Affects depth of holes in tree, background is assumed to be white, testing image background is white, composite mask test
# is black so need to bitwise_not()
origin = contours[0]
x, y = origin[0][0]
file.write('Pixel value at contour point ({}, {}) is {}\n\n'.format(x, y, image[x][y]))

# NAME: is_composite_area
# DESCRIPTION: verifies if there is a composite area to be calculated from parent array
# PARAMETERS: parent_array, child, parent_idx, child_idx
# RETURNS: True or False
def is_composite_area(parent_array, child, parent_idx, child_idx):
    verify = False
    
    # Loop through parent array
    for i in range(len(parent_array)):
        # If child is in parent_array, do not execute if no child
        if(parent_array[i][0] == child.tag and child_idx != -1):
            
            # Find parent in array and subtract
            for j in range (len(parent_array)):
                
                # If parent_idx subtract to it
                if(parent_array[j][0] == parent_idx):
                    parent_array[j][1] -= parent_array[i][1]
                    verify = True

    return verify

# NAME: not_composite_area
# DESCRIPTION: calculates area from non-composite contour
# PARAMETERS: parent_array, child, parent_idx, contours
# RETURNS: non composite area
def not_composite_area(parent_array, child, parent_idx, contours):
    for i in range(len(parent_array)):
        if(parent_array[i][0] == parent_idx):
            parent_array[i][1] -= cv2.contourArea(contours[child.tag])
        
# NAME: find_tree
# DESCRIPTION: finds hierarchical tree of contours based on parent_array
# PARAMETERS: contours, hierarchy, parent_array
# RETURNS: tree

# PARENT ARRAY
# children[0] = int, idx of parent
# children[1] = float, Area of parent

def find_tree(contours, hierarchy, parent_array, tree):
    file.write("~~~~~~~~~~~~~~~~~~~~~~ Find Tree ~~~~~~~~~~~~~~~~~~~~~~\n\n")

    # Create tree data structure with background as root element
    tree.create_node(0, 0)
    
    # Loop through all contours and fill out parent array
    for i in range(len(contours)):
        
        # Indexes
        child_idx = hierarchy[0][i][2]
        
        # Also add to tree contours that have no holes
        if(child_idx == -1 and hierarchy[0][i][3] == 0):
            tree.create_node(i, i, parent=0)
        
        # If child and not index 0 (background)
        if(child_idx != -1 and i != 0):
            
            # Create Children value array
            children = []
            
            children.append(i)
            children.append(cv2.contourArea(contours[i]))
            
            # Append to parent array
            parent_array.append(children)
    
    file.write('Parent Array: {}\n\n'.format(parent_array))
    
    # Fill in Tree datastructure from parent array
    for i in range(len(parent_array)):
        
        # Index of contour in parent_array
        idx = parent_array[i][0]
        
        # Create parent node
        tree.create_node(idx, idx, parent=hierarchy[0][idx][3])
        
        # Create Child nodes based on parenet node
        for j in range(len(contours)):
            if(hierarchy[0][j][3] == idx and hierarchy[0][j][2] == -1):
                tree.create_node(j, j, parent=idx)

    tree.show()

# NAME: calculate_area
# DESCRIPTION: calculates hierarchical area of all parents based on tree starting from bottom up
# PARAMETERS: contours, hierarchy, parent_array

# RETURNS: parent_array

def calculate_area(contours, hierarchy, parent_array, tree):
    
    # 0 Background
    # 1 Area
    # 2 Holes
    # 3 Area
    # 4 Holes
    
    d = tree.depth() - 1 # Subtract 1 because last contour is Hole and we dont want to start at a hole
    
    # Case of no holes within holes
    if d >= 2:
        
        # While not background
        while d > 0:
            
            # Find all nodes at depth d
            for node in tree.all_nodes_itr():
                
                # If node matches depth and if node has children
                if(tree.depth(node) == d and tree.children(node.tag)):
                                        
                    # Find all children
                    for child in tree.children(node.tag):
                            
                        # Set their parent idx to find
                        parent_idx = hierarchy[0][child.tag][3]
                        
                        # Set child idx to find composite area
                        child_idx = hierarchy[0][child.tag][2]
                        
                        verify = is_composite_area(parent_array, child, parent_idx, child_idx)

                         # If base case where composite area is not calculated yet
                        if not verify:
                            not_composite_area(parent_array, child, parent_idx, contours)

            d -= 1
     
            
def verify_contour(contours, parent_array, tree, image):
    file.write("~~~~~~~~~~~~~~~~~~~~~~ Verify Contours ~~~~~~~~~~~~~~~~~~~~~~\n\n")
    
    d = tree.depth() - 1
    
    risky_area = 0
    problematic = False
    
    # While not background
    while d > 0:
        
        # Search through tree
        for node in tree.all_nodes_itr():
            
            # If node matches depth
            if(tree.depth(node) == d):
                
                notComp = True
                
                # Composite Area is in parent array
                for parent in parent_array:
                    if parent[0] == node.tag:
                        notComp = False
                        file.write('Node Tag: {}\n'.format(node.tag))
                        area = parent[1]
                        file.write('Area: {:.5f}\n'.format(area))
                        
                # Not composite area
                if notComp:
                    file.write('Node Tag: {}\n'.format(node.tag))
                    area = cv2.contourArea(contours[node.tag])
                    file.write('Area: {:.5f}\n'.format(area))
                
                # Aspect Ratio
                cnt = contours[node.tag]
                rect = cv2.minAreaRect(cnt)
                file.write('Rect Tuple: {}\n'.format(rect))
                
                width = rect[1][0]
                height = rect[1][1]
                
                # Calculate aspect ratio
                # Need to find range of GOOD aspect ratios vs BAD
                if (width and height) and (width != 0 or height != 0):
                    file.write('Aspect ratio = {:.5f} / {:.5f}\n'.format(width, height))
                else:
                    file.write('Bad Width or Height\n\n')

                    
                res = "Problematic" if width > min_dimensions and height > min_dimensions and area > min_area else "Not Problematic"
                file.write('{}\n\n'.format(res))

                # Draw Boxes on image for testing only
                #rect = cv2.boxPoints(rect)
                #box = np.int0(rect)
                #cv2.drawContours(image, [box], 0, (0,0,255), 2)
                
                if res == "Problematic":
                    risky_area += area
                    problematic = True
            
        d -= 2
        
    return risky_area, problematic


# Create variables
parent_array = []
tree = Tree()

# Find Tree 
find_tree(contours, hierarchy, parent_array, tree)

# Use Tree to calculate area
calculate_area(contours, hierarchy, parent_array, tree)

# Verify contours against constraints
risky_area, problematic = verify_contour(contours, parent_array, tree, image)

print('Problematic: {} \nTotal Pixels (P): {} \nRisky Area (R): {} \nPercent Risk (R / P): {:.5f}'.format(problematic, img_px_front, risky_area, risky_area / img_px_front))
file.write('Problematic: {} \nTotal Pixels (P): {} \nRisky Area (R): {} \nPercent Risk (R / P): {:.5f}'.format(problematic, img_px_front, risky_area, risky_area / img_px_front))

'''
GOES THROUGH ALL CONTOURS AND DISPLAYS ONE BY ONE
# ~ TESTING ~
for i in range(len(contours2)):
    cv2.drawContours(image, contours2, i, (0,255,0), 2, cv2.LINE_8)
    print(cv2.contourArea(contours2[i]))
    cv2.namedWindow("CONTOURS", cv2.WINDOW_NORMAL)
    cv2.imshow("CONTOURS", image)
    cv2.waitKey(0)
'''


cv2.imwrite("image1.jpg", image)

cv2.namedWindow("CONTOURS", cv2.WINDOW_NORMAL)
cv2.imshow("CONTOURS", image)
cv2.waitKey(0)
cv2.destroyAllWindows()

file.close()
