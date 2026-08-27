#!/usr/bin/env python3
"""Generate pixel-art tileset for Orpheus' Descent."""

from PIL import Image, ImageDraw
import os

# Underworld stone/brick palette (from menu-bg.png aesthetic)
COLORS = {
    # Stone colors
    'stone_dark': (45, 35, 30),      # Dark stone
    'stone_mid': (75, 60, 50),       # Mid stone
    'stone_light': (95, 80, 65),     # Light stone highlight
    'stone_deep': (30, 25, 20),      # Deep shadow
    
    # Mortar/cracks
    'mortar': (25, 20, 15),          # Dark mortar between bricks
    'crack': (35, 28, 22),           # Cracks in stone
    
    # Gold/brass for ledges
    'gold_dark': (140, 100, 45),     # Dark gold
    'gold_mid': (200, 160, 80),      # Mid gold
    'gold_light': (230, 200, 120),   # Light gold highlight
    
    # Red/blood for spikes
    'spike_dark': (90, 20, 25),      # Dark red
    'spike_mid': (140, 30, 40),      # Mid red
    'spike_light': (180, 50, 60),    # Light red highlight
    'spike_tip': (200, 80, 90),      # Spike tip
    
    # Background
    'bg': (14, 10, 8),               # Dark background
}

def create_tileset():
    """Create the complete tileset image."""
    # Tileset layout: 16x16 tiles
    # Row 0: Solid block variations (fill, top, bottom, left, right, corners)
    # Row 1: Ledge variations
    # Row 2: Spike variations
    
    tile_size = 16
    tiles_wide = 16
    tiles_high = 8
    
    img_width = tiles_wide * tile_size
    img_height = tiles_high * tile_size
    
    img = Image.new('RGBA', (img_width, img_height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Helper function to set pixel
    def set_pixel(img, x, y, color):
        if 0 <= x < img.width and 0 <= y < img.height:
            img.putpixel((x, y), color if len(color) == 4 else (*color, 255))
    
    # Helper to draw a tile at position
    def tile_xy(tx, ty):
        return tx * tile_size, ty * tile_size
    
    # === SOLID BLOCK TILES ===
    
    # Tile 0,0: Solid fill (interior block)
    tx, ty = 0, 0
    ox, oy = tile_xy(tx, ty)
    for y in range(tile_size):
        for x in range(tile_size):
            # Add some texture variation
            if (x + y) % 7 == 0:
                set_pixel(img, ox + x, oy + y, COLORS['stone_deep'])
            elif (x * 3 + y * 2) % 11 == 0:
                set_pixel(img, ox + x, oy + y, COLORS['stone_light'])
            else:
                set_pixel(img, ox + x, oy + y, COLORS['stone_mid'])
    
    # Tile 1,0: Block with top edge
    tx, ty = 1, 0
    ox, oy = tile_xy(tx, ty)
    for y in range(tile_size):
        for x in range(tile_size):
            if y == 0:
                set_pixel(img, ox + x, oy + y, COLORS['stone_light'])
            elif y == 1:
                set_pixel(img, ox + x, oy + y, COLORS['stone_light'])
            elif y == 2:
                if x % 3 == 0:
                    set_pixel(img, ox + x, oy + y, COLORS['crack'])
                else:
                    set_pixel(img, ox + x, oy + y, COLORS['stone_mid'])
            else:
                if (x + y) % 7 == 0:
                    set_pixel(img, ox + x, oy + y, COLORS['stone_deep'])
                elif (x * 3 + y * 2) % 11 == 0:
                    set_pixel(img, ox + x, oy + y, COLORS['stone_light'])
                else:
                    set_pixel(img, ox + x, oy + y, COLORS['stone_mid'])
    
    # Tile 2,0: Block with bottom edge
    tx, ty = 2, 0
    ox, oy = tile_xy(tx, ty)
    for y in range(tile_size):
        for x in range(tile_size):
            if y >= tile_size - 2:
                set_pixel(img, ox + x, oy + y, COLORS['stone_dark'])
            elif y == tile_size - 3:
                set_pixel(img, ox + x, oy + y, COLORS['mortar'])
            else:
                if (x + y) % 7 == 0:
                    set_pixel(img, ox + x, oy + y, COLORS['stone_deep'])
                elif (x * 3 + y * 2) % 11 == 0:
                    set_pixel(img, ox + x, oy + y, COLORS['stone_light'])
                else:
                    set_pixel(img, ox + x, oy + y, COLORS['stone_mid'])
    
    # Tile 3,0: Block with left edge
    tx, ty = 3, 0
    ox, oy = tile_xy(tx, ty)
    for y in range(tile_size):
        for x in range(tile_size):
            if x == 0:
                set_pixel(img, ox + x, oy + y, COLORS['stone_dark'])
            elif x == 1:
                set_pixel(img, ox + x, oy + y, COLORS['stone_light'])
            else:
                if (x + y) % 7 == 0:
                    set_pixel(img, ox + x, oy + y, COLORS['stone_deep'])
                elif (x * 3 + y * 2) % 11 == 0:
                    set_pixel(img, ox + x, oy + y, COLORS['stone_light'])
                else:
                    set_pixel(img, ox + x, oy + y, COLORS['stone_mid'])
    
    # Tile 4,0: Block with right edge
    tx, ty = 4, 0
    ox, oy = tile_xy(tx, ty)
    for y in range(tile_size):
        for x in range(tile_size):
            if x == tile_size - 1:
                set_pixel(img, ox + x, oy + y, COLORS['stone_deep'])
            elif x == tile_size - 2:
                set_pixel(img, ox + x, oy + y, COLORS['stone_dark'])
            else:
                if (x + y) % 7 == 0:
                    set_pixel(img, ox + x, oy + y, COLORS['stone_deep'])
                elif (x * 3 + y * 2) % 11 == 0:
                    set_pixel(img, ox + x, oy + y, COLORS['stone_light'])
                else:
                    set_pixel(img, ox + x, oy + y, COLORS['stone_mid'])
    
    # Tile 5,0: Top-left corner
    tx, ty = 5, 0
    ox, oy = tile_xy(tx, ty)
    for y in range(tile_size):
        for x in range(tile_size):
            if y <= 1:
                set_pixel(img, ox + x, oy + y, COLORS['stone_light'])
            elif x <= 1:
                set_pixel(img, ox + x, oy + y, COLORS['stone_light'])
            else:
                if (x + y) % 7 == 0:
                    set_pixel(img, ox + x, oy + y, COLORS['stone_deep'])
                elif (x * 3 + y * 2) % 11 == 0:
                    set_pixel(img, ox + x, oy + y, COLORS['stone_light'])
                else:
                    set_pixel(img, ox + x, oy + y, COLORS['stone_mid'])
    
    # Tile 6,0: Top-right corner
    tx, ty = 6, 0
    ox, oy = tile_xy(tx, ty)
    for y in range(tile_size):
        for x in range(tile_size):
            if y <= 1:
                set_pixel(img, ox + x, oy + y, COLORS['stone_light'])
            elif x >= tile_size - 2:
                set_pixel(img, ox + x, oy + y, COLORS['stone_dark'])
            else:
                if (x + y) % 7 == 0:
                    set_pixel(img, ox + x, oy + y, COLORS['stone_deep'])
                elif (x * 3 + y * 2) % 11 == 0:
                    set_pixel(img, ox + x, oy + y, COLORS['stone_light'])
                else:
                    set_pixel(img, ox + x, oy + y, COLORS['stone_mid'])
    
    # Tile 7,0: Bottom-left corner
    tx, ty = 7, 0
    ox, oy = tile_xy(tx, ty)
    for y in range(tile_size):
        for x in range(tile_size):
            if y >= tile_size - 2:
                set_pixel(img, ox + x, oy + y, COLORS['stone_dark'])
            elif x <= 1:
                set_pixel(img, ox + x, oy + y, COLORS['stone_light'])
            else:
                if (x + y) % 7 == 0:
                    set_pixel(img, ox + x, oy + y, COLORS['stone_deep'])
                elif (x * 3 + y * 2) % 11 == 0:
                    set_pixel(img, ox + x, oy + y, COLORS['stone_light'])
                else:
                    set_pixel(img, ox + x, oy + y, COLORS['stone_mid'])
    
    # Tile 8,0: Bottom-right corner
    tx, ty = 8, 0
    ox, oy = tile_xy(tx, ty)
    for y in range(tile_size):
        for x in range(tile_size):
            if y >= tile_size - 2:
                set_pixel(img, ox + x, oy + y, COLORS['stone_dark'])
            elif x >= tile_size - 2:
                set_pixel(img, ox + x, oy + y, COLORS['stone_deep'])
            else:
                if (x + y) % 7 == 0:
                    set_pixel(img, ox + x, oy + y, COLORS['stone_deep'])
                elif (x * 3 + y * 2) % 11 == 0:
                    set_pixel(img, ox + x, oy + y, COLORS['stone_light'])
                else:
                    set_pixel(img, ox + x, oy + y, COLORS['stone_mid'])
    
    # === LEDGE TILES (Row 1) ===
    
    # Tile 0,1: Basic ledge
    tx, ty = 0, 1
    ox, oy = tile_xy(tx, ty)
    ledge_y = tile_size // 2
    for x in range(tile_size):
        # Gold bar
        set_pixel(img, ox + x, oy + ledge_y - 2, COLORS['gold_dark'])
        set_pixel(img, ox + x, oy + ledge_y - 1, COLORS['gold_light'])
        set_pixel(img, ox + x, oy + ledge_y, COLORS['gold_mid'])
        set_pixel(img, ox + x, oy + ledge_y + 1, COLORS['gold_dark'])
    
    # Tile 1,1: Ledge with left cap
    tx, ty = 1, 1
    ox, oy = tile_xy(tx, ty)
    for x in range(tile_size):
        y_offset = ledge_y
        if x <= 2:
            # Bracket on left
            set_pixel(img, ox + x, oy + y_offset - 3, COLORS['gold_dark'])
            set_pixel(img, ox + x, oy + y_offset - 2, COLORS['gold_mid'])
            set_pixel(img, ox + x, oy + y_offset - 1, COLORS['gold_light'])
            set_pixel(img, ox + x, oy + y_offset, COLORS['gold_mid'])
            set_pixel(img, ox + x, oy + y_offset + 1, COLORS['gold_dark'])
            set_pixel(img, ox + x, oy + y_offset + 2, COLORS['gold_dark'])
        else:
            set_pixel(img, ox + x, oy + y_offset - 2, COLORS['gold_dark'])
            set_pixel(img, ox + x, oy + y_offset - 1, COLORS['gold_light'])
            set_pixel(img, ox + x, oy + y_offset, COLORS['gold_mid'])
            set_pixel(img, ox + x, oy + y_offset + 1, COLORS['gold_dark'])
    
    # Tile 2,1: Ledge with right cap
    tx, ty = 2, 1
    ox, oy = tile_xy(tx, ty)
    for x in range(tile_size):
        y_offset = ledge_y
        if x >= tile_size - 3:
            # Bracket on right
            set_pixel(img, ox + x, oy + y_offset - 3, COLORS['gold_dark'])
            set_pixel(img, ox + x, oy + y_offset - 2, COLORS['gold_mid'])
            set_pixel(img, ox + x, oy + y_offset - 1, COLORS['gold_light'])
            set_pixel(img, ox + x, oy + y_offset, COLORS['gold_mid'])
            set_pixel(img, ox + x, oy + y_offset + 1, COLORS['gold_dark'])
            set_pixel(img, ox + x, oy + y_offset + 2, COLORS['gold_dark'])
        else:
            set_pixel(img, ox + x, oy + y_offset - 2, COLORS['gold_dark'])
            set_pixel(img, ox + x, oy + y_offset - 1, COLORS['gold_light'])
            set_pixel(img, ox + x, oy + y_offset, COLORS['gold_mid'])
            set_pixel(img, ox + x, oy + y_offset + 1, COLORS['gold_dark'])
    
    # === SPIKE TILES (Row 2) ===
    
    # Tile 0,2: Basic spike
    tx, ty = 0, 2
    ox, oy = tile_xy(tx, ty)
    spike_base_y = tile_size - 2
    spike_tip_y = 4
    for y in range(tile_size):
        for x in range(tile_size):
            # Triangle spike in center
            if y >= spike_base_y:
                # Base
                if 2 <= x <= 13:
                    set_pixel(img, ox + x, oy + y, COLORS['spike_dark'])
            else:
                # Check if in triangle
                center_x = tile_size / 2
                dist_from_center = abs(x - center_x)
                max_dist_at_y = (spike_base_y - y) * 0.5
                if dist_from_center <= max_dist_at_y:
                    if y <= spike_tip_y + 1:
                        set_pixel(img, ox + x, oy + y, COLORS['spike_tip'])
                    elif y <= spike_tip_y + 4:
                        if x < center_x:
                            set_pixel(img, ox + x, oy + y, COLORS['spike_light'])
                        else:
                            set_pixel(img, ox + x, oy + y, COLORS['spike_mid'])
                    else:
                        if x < center_x:
                            set_pixel(img, ox + x, oy + y, COLORS['spike_mid'])
                        else:
                            set_pixel(img, ox + x, oy + y, COLORS['spike_dark'])
    
    # Tile 1,2: Double spike
    tx, ty = 1, 2
    ox, oy = tile_xy(tx, ty)
    spike_base_y = tile_size - 2
    for y in range(tile_size):
        for x in range(tile_size):
            # Two smaller spikes
            if y >= spike_base_y:
                if 1 <= x <= 14:
                    set_pixel(img, ox + x, oy + y, COLORS['spike_dark'])
            else:
                # Left spike
                center_x1 = 5
                dist1 = abs(x - center_x1)
                max_dist_at_y = (spike_base_y - y) * 0.35
                if dist1 <= max_dist_at_y:
                    if y <= 6:
                        set_pixel(img, ox + x, oy + y, COLORS['spike_tip'])
                    elif x < center_x1:
                        set_pixel(img, ox + x, oy + y, COLORS['spike_light'])
                    else:
                        set_pixel(img, ox + x, oy + y, COLORS['spike_dark'])
                
                # Right spike
                center_x2 = 11
                dist2 = abs(x - center_x2)
                if dist2 <= max_dist_at_y:
                    if y <= 6:
                        set_pixel(img, ox + x, oy + y, COLORS['spike_tip'])
                    elif x < center_x2:
                        set_pixel(img, ox + x, oy + y, COLORS['spike_light'])
                    else:
                        set_pixel(img, ox + x, oy + y, COLORS['spike_dark'])
    
    # Tile 2,2: Short spike variation
    tx, ty = 2, 2
    ox, oy = tile_xy(tx, ty)
    spike_base_y = tile_size - 2
    spike_tip_y = 8
    for y in range(tile_size):
        for x in range(tile_size):
            if y >= spike_base_y:
                if 3 <= x <= 12:
                    set_pixel(img, ox + x, oy + y, COLORS['spike_dark'])
            else:
                center_x = tile_size / 2
                dist_from_center = abs(x - center_x)
                max_dist_at_y = (spike_base_y - y) * 0.4
                if dist_from_center <= max_dist_at_y:
                    if y <= spike_tip_y:
                        set_pixel(img, ox + x, oy + y, COLORS['spike_tip'])
                    elif x < center_x:
                        set_pixel(img, ox + x, oy + y, COLORS['spike_light'])
                    else:
                        set_pixel(img, ox + x, oy + y, COLORS['spike_mid'])
    
    return img

def main():
    """Generate and save the tileset."""
    print("Generating tileset...")
    
    # Create output directory
    os.makedirs('public/art', exist_ok=True)
    
    # Generate tileset
    tileset = create_tileset()
    
    # Save
    output_path = 'public/art/tileset.png'
    tileset.save(output_path)
    print(f"✓ Saved tileset to {output_path}")
    print(f"  Size: {tileset.width}x{tileset.height}")

if __name__ == '__main__':
    main()
