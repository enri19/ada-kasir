/**
 * Layout utility functions for safe area handling
 */

/**
 * Get safe footer padding that ensures minimum spacing
 * @param bottomInset - The safe area bottom inset
 * @returns Minimum of 16 or the safe area inset, whichever is larger
 */
export function getSafeFooterPadding(bottomInset: number) {
  return Math.max(bottomInset, 16);
}

/**
 * Get scroll view bottom padding that accounts for footer height and safe area
 * @param bottomInset - The safe area bottom inset
 * @param footerHeight - The height of the footer (default: 96)
 * @returns Footer height plus minimum safe area padding
 */
export function getScrollBottomPadding(bottomInset: number, footerHeight = 96) {
  return footerHeight + Math.max(bottomInset, 24);
}