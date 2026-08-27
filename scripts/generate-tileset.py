#!/usr/bin/env python3
"""Generate pixel-art tileset for Orpheus' Descent - proper stone blocks edition."""

from PIL import Image, ImageDraw
import os
import random

# Underworld palette matching menu-bg.png (warm dark stone)
COLORS = {
    # Stone base colors - warm browns from the menu
    'stone_base': (58, 42, 34),          # Primary stone color
    'stone_dark': (45, 32, 26),          # Shadow areas
    'stone_darker': (35, 25, 20),        # Deep shadows
    'stone_light': (75, 58, 46),         # Highlight
    'stone_lighter': (90, 72, 58),       # Bright highlight
    'stone_warm': (68, 50, 40),          # Warm mid-tone
    
    # Mortar and cracks
    'mortar': (28, 20, 16),              # Dark mortar between stones
    'mortar_light': (38, 28, 22),        # Lighter mortar edge
    'crack_dark': (20, 14, 11),          # Deep crack
    'crack_mid': (32, 24, 19),           # Crack highlight
    
    # Brass/gold for ledges - matching menu's golden elements
    'brass_dark': (107, 83, 52),         # Dark brass
    'brass_mid': (180, 147, 94),         # Mid brass
    'brass_light': (212, 180, 131),      # Bright brass
    'brass_bright': (232, 197, 71),      # Highlight (from palette)
    'brass_shadow': (80, 60, 35),        # Deep shadow
    
    # Iron for spikes - dark metal
    'iron_dark': (45, 40, 38),           # Base iron
    'iron_mid': (65, 58, 54),            # Mid iron
    'iron_light': (85, 78, 72),          # Highlight
    'iron_rust': (90, 50, 40),           # Rust tint
    'iron_shadow': (30, 26, 24),         # Deep shadow
}

def create_tileset():
    """Create the complete tileset image with proper stone blocks."""
    tile_size = 16
    tiles_wide = 16
    tiles_high = 8
    
    img_width = tiles_wide * tile_size
    img_height = tiles_high * tile_size
    
    img = Image.new('RGBA', (img_width, img_height), (0, 0, 0, 0))
    
    def set_pixel(img, x, y, color):
        """Set a single pixel with bounds checking."""
        if 0 <= x < img.width and 0 <= y < img.height:
            img.putpixel((x, y), color if len(color) == 4 else (*color, 255))
    
    def fill_rect(img, x, y, w, h, color):
        """Fill a rectangle with a color."""
        for py in range(y, y + h):
            for px in range(x, x + w):
                set_pixel(img, px, py, color)
    
    def draw_stone_block(img, ox, oy, has_top=False, has_bottom=False, 
                         has_left=False, has_right=False):
        """Draw a 16x16 stone block with proper texture."""
        # Base fill with slight variation
        for y in range(16):
            for x in range(16):
                # Create stone texture with subtle variation
                noise = ((x * 7 + y * 13) % 11) - 5
                if (x + y) % 8 == 0:
                    base = COLORS['stone_warm']
                elif (x * 3 + y * 5) % 13 == 0:
                    base = COLORS['stone_dark']
                else:
                    base = COLORS['stone_base']
                
                # Apply slight noise
                r = max(0, min(255, base[0] + noise))
                g = max(0, min(255, base[1] + noise))
                b = max(0, min(255, base[2] + noise))
                set_pixel(img, ox + x, oy + y, (r, g, b))
        
        # Add stone grain/cracks
        for y in range(2, 14):
            if y % 5 == 2:
                for x in range(2, 14):
                    if (x + y) % 3 == 0:
                        set_pixel(img, ox + x, oy + y, COLORS['crack_mid'])
        
        # Mortar lines between blocks (when not an edge)
        if not has_top:
            # Top edge highlight
            for x in range(16):
                set_pixel(img, ox + x, oy, COLORS['stone_lighter'])
                set_pixel(img, ox + x, oy + 1, COLORS['stone_light'])
        
        if not has_bottom:
            # Bottom mortar/shadow
            for x in range(16):
                set_pixel(img, ox + x, oy + 15, COLORS['mortar'])
                set_pixel(img, ox + x, oy + 14, COLORS['stone_dark'])
        
        if not has_left:
            # Left edge highlight
            for y in range(16):
                set_pixel(img, ox, oy + y, COLORS['stone_light'])
                set_pixel(img, ox + 1, oy + y, COLORS['stone_light'])
        
        if not has_right:
            # Right edge shadow
            for y in range(16):
                set_pixel(img, ox + 15, oy + y, COLORS['stone_darker'])
                set_pixel(img, ox + 14, oy + y, COLORS['stone_dark'])
        
        # Corner details
        if not has_top and not has_left:
            # Top-left corner - extra highlight
            set_pixel(img, ox, oy, COLORS['stone_lighter'])
            set_pixel(img, ox + 1, oy, COLORS['stone_lighter'])
            set_pixel(img, ox, oy + 1, COLORS['stone_lighter'])
        
        if not has_top and not has_right:
            # Top-right corner
            set_pixel(img, ox + 15, oy, COLORS['stone_light'])
            set_pixel(img, ox + 14, oy, COLORS['stone_light'])
        
        if not has_bottom and not has_left:
            # Bottom-left corner
            set_pixel(img, ox, oy + 15, COLORS['mortar'])
            set_pixel(img, ox + 1, oy + 15, COLORS['mortar'])
        
        if not has_bottom and not has_right:
            # Bottom-right corner - deepest shadow
            set_pixel(img, ox + 15, oy + 15, COLORS['crack_dark'])
            set_pixel(img, ox + 14, oy + 15, COLORS['mortar'])
            set_pixel(img, ox + 15, oy + 14, COLORS['mortar'])
    
    def draw_brass_ledge(img, ox, oy, has_left_cap=False, has_right_cap=False):
        """Draw a carved brass ledge."""
        # Brass sill with architectural profile
        base_y = 7
        
        # Main brass bar
        for y in range(base_y - 2, base_y + 3):
            for x in range(16):
                if y == base_y - 2:
                    set_pixel(img, ox + x, oy + y, COLORS['brass_shadow'])
                elif y == base_y - 1:
                    set_pixel(img, ox + x, oy + y, COLORS['brass_light'])
                elif y == base_y:
                    set_pixel(img, ox + x, oy + y, COLORS['brass_bright'])
                elif y == base_y + 1:
                    set_pixel(img, ox + x, oy + y, COLORS['brass_mid'])
                else:
                    set_pixel(img, ox + x, oy + y, COLORS['brass_dark'])
        
        # Add decorative details
        if has_left_cap:
            # Left bracket
            for y in range(base_y - 3, base_y + 4):
                for x in range(0, 3):
                    if y < base_y:
                        set_pixel(img, ox + x, oy + y, COLORS['brass_mid'])
                    else:
                        set_pixel(img, ox + x, oy + y, COLORS['brass_dark'])
            # Highlight
            set_pixel(img, ox + 1, oy + base_y - 2, COLORS['brass_bright'])
        
        if has_right_cap:
            # Right bracket
            for y in range(base_y - 3, base_y + 4):
                for x in range(13, 16):
                    if y < base_y:
                        set_pixel(img, ox + x, oy + y, COLORS['brass_mid'])
                    else:
                        set_pixel(img, ox + x, oy + y, COLORS['brass_dark'])
            # Shadow
            set_pixel(img, ox + 14, oy + base_y + 2, COLORS['brass_shadow'])
    
    def draw_iron_spike(img, ox, oy, variant=0):
        """Draw an iron spike."""
        base_y = 14
        
        # Base plate
        for y in range(base_y, 16):
            for x in range(2, 14):
                if y == base_y:
                    set_pixel(img, ox + x, oy + y, COLORS['iron_mid'])
                else:
                    set_pixel(img, ox + x, oy + y, COLORS['iron_dark'])
        
        if variant == 0:
            # Single tall spike
            spike_points = [
                (8, 3), (7, 5), (8, 5), (9, 5),
                (6, 7), (7, 7), (8, 7), (9, 7), (10, 7),
                (5, 9), (6, 9), (7, 9), (8, 9), (9, 9), (10, 9), (11, 9),
                (4, 11), (5, 11), (6, 11), (7, 11), (8, 11), (9, 11), (10, 11), (11, 11), (12, 11),
            ]
            for x, y in spike_points:
                if y < 8:
                    set_pixel(img, ox + x, oy + y, COLORS['iron_light'])
                elif y < 10:
                    if x < 8:
                        set_pixel(img, ox + x, oy + y, COLORS['iron_mid'])
                    else:
                        set_pixel(img, ox + x, oy + y, COLORS['iron_dark'])
                else:
                    set_pixel(img, ox + x, oy + y, COLORS['iron_dark'])
            # Tip highlight
            set_pixel(img, ox + 8, oy + 3, COLORS['iron_light'])
            # Rust stain
            set_pixel(img, ox + 6, oy + 12, COLORS['iron_rust'])
            set_pixel(img, ox + 10, oy + 12, COLORS['iron_rust'])
        
        elif variant == 1:
            # Double spike
            for spike_x in [5, 11]:
                spike_points = [
                    (spike_x, 5), (spike_x - 1, 7), (spike_x, 7), (spike_x + 1, 7),
                    (spike_x - 2, 9), (spike_x - 1, 9), (spike_x, 9), (spike_x + 1, 9), (spike_x + 2, 9),
                    (spike_x - 2, 11), (spike_x - 1, 11), (spike_x, 11), (spike_x + 1, 11), (spike_x + 2, 11),
                ]
                for x, y in spike_points:
                    if 0 <= x < 16:
                        if y < 9:
                            set_pixel(img, ox + x, oy + y, COLORS['iron_mid'])
                        else:
                            set_pixel(img, ox + x, oy + y, COLORS['iron_dark'])
                set_pixel(img, ox + spike_x, oy + 5, COLORS['iron_light'])
        
        else:
            # Triple short spikes
            for spike_x in [4, 8, 12]:
                for y_off in range(6, 13):
                    width = max(0, 3 - (y_off - 6) // 2)
                    for x_off in range(-width, width + 1):
                        x = spike_x + x_off
                        if 0 <= x < 16:
                            if y_off < 8:
                                set_pixel(img, ox + x, oy + y_off, COLORS['iron_light'])
                            else:
                                set_pixel(img, ox + x, oy + y_off, COLORS['iron_dark'])
    
    # === SOLID BLOCK TILES ===
    # Row 0: Different neighbor configurations
    
    # Tile 0,0: Fill tile (surrounded by other blocks)
    draw_stone_block(img, 0, 0, has_top=True, has_bottom=True, has_left=True, has_right=True)
    
    # Tile 1,0: Top edge exposed
    draw_stone_block(img, 16, 0, has_top=False, has_bottom=True, has_left=True, has_right=True)
    
    # Tile 2,0: Bottom edge exposed
    draw_stone_block(img, 32, 0, has_top=True, has_bottom=False, has_left=True, has_right=True)
    
    # Tile 3,0: Left edge exposed
    draw_stone_block(img, 48, 0, has_top=True, has_bottom=True, has_left=False, has_right=True)
    
    # Tile 4,0: Right edge exposed
    draw_stone_block(img, 64, 0, has_top=True, has_bottom=True, has_left=True, has_right=False)
    
    # Tile 5,0: Top-left corner
    draw_stone_block(img, 80, 0, has_top=False, has_bottom=True, has_left=False, has_right=True)
    
    # Tile 6,0: Top-right corner
    draw_stone_block(img, 96, 0, has_top=False, has_bottom=True, has_left=True, has_right=False)
    
    # Tile 7,0: Bottom-left corner
    draw_stone_block(img, 112, 0, has_top=True, has_bottom=False, has_left=False, has_right=True)
    
    # Tile 8,0: Bottom-right corner
    draw_stone_block(img, 128, 0, has_top=True, has_bottom=False, has_left=True, has_right=False)
    
    # === LEDGE TILES (Row 1) ===
    
    # Tile 0,1: Basic ledge (middle)
    draw_brass_ledge(img, 0, 16, has_left_cap=False, has_right_cap=False)
    
    # Tile 1,1: Ledge with left end cap
    draw_brass_ledge(img, 16, 16, has_left_cap=True, has_right_cap=False)
    
    # Tile 2,1: Ledge with right end cap
    draw_brass_ledge(img, 32, 16, has_left_cap=False, has_right_cap=True)
    
    # === SPIKE TILES (Row 2) ===
    
    # Tile 0,2: Single tall spike
    draw_iron_spike(img, 0, 32, variant=0)
    
    # Tile 1,2: Double spikes
    draw_iron_spike(img, 16, 32, variant=1)
    
    # Tile 2,2: Triple short spikes
    draw_iron_spike(img, 32, 32, variant=2)
    
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
