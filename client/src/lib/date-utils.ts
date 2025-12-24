/**
 * Utility functions for handling dates in forms
 * Fixes the timezone issue where dates were being saved as one day earlier
 */

/**
 * Converts a date value to the format expected by HTML date inputs (YYYY-MM-DD)
 * Works with Date objects, ISO strings, or date strings
 * @param dateValue - Date string, Date object, or null/undefined
 * @returns String in YYYY-MM-DD format suitable for date inputs
 */
export function dateToInputValue(dateValue: string | Date | null | undefined): string {
    if (!dateValue) return '';

    // If it's a string in YYYY-MM-DD format, return as-is
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
    }

    // If it's an ISO string with time, extract the date part
    if (typeof dateValue === 'string' && dateValue.includes('T')) {
        return dateValue.split('T')[0];
    }

    // If it's a Date object, format it
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;

    // Use local date parts to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

/**
 * Converts an input value (YYYY-MM-DD) to a Date object at local midnight
 * This preserves the exact date selected by the user
 * @param inputValue - Date string from HTML date input (YYYY-MM-DD)
 * @returns Date object at midnight local time, or null if empty
 */
export function inputValueToDate(inputValue: string): Date | null {
    if (!inputValue) return null;

    // Parse the date string components
    const [year, month, day] = inputValue.split('-').map(Number);

    // Create date at midnight local time
    // Using the Date constructor this way avoids timezone conversion
    return new Date(year, month - 1, day);
}
