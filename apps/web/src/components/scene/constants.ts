import * as THREE from 'three';

/**
 * Camera: a long lens, low to the ground, looking slightly up. It is the angle car photographers
 * use, and it leaves the sky and the palms above the product instead of behind it.
 */
export const CAMERA_FOV = 34;
export const CAMERA_REST = new THREE.Vector3(0, 0.95, 9.2);
export const CAMERA_START = new THREE.Vector3(0, 2.8, 22);
export const CAMERA_LOOK_AT = new THREE.Vector3(0, 1.6, 0);

/** Width of the side menu plus its gutter, in CSS pixels. Mirrors the layout. */
export const SIDE_WIDTH = 408;
/** How far the picture is lifted to clear the dock along the bottom, in CSS pixels. */
export const DOCK_LIFT = 44;
export const DESKTOP_BREAKPOINT = 1024;

export const ACCENT = new THREE.Color('#4ff2cf');

/** Where products stand: on the street, in the middle of the space the interface leaves free. */
export const STAGE_Z = 1.4;
/** Eye level for products that hover instead of standing on the ground. */
export const FLOAT_HEIGHT = 1.5;
