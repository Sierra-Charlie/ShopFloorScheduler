// Centralized timeline configuration using user's configurable start time
export const PX_PER_HOUR = 60;
export const HOURS_PER_DAY = 9;
export const GAP_PX = 8;
export const LEFT_GUTTER_PX = 256; // assembler column width

// Parse user's configurable start time to get actual work day start
export function parseStartTime(startDate: string, startTime: string): Date {
  // Parse date in local timezone to avoid UTC offset issues
  const [year, month, day] = startDate.split('-').map(Number);
  const baseDate = new Date(year, month - 1, day);
  
  // Parse time (e.g., "08:00" -> hour: 8, minute: 0)
  const [hour, minute] = startTime.split(':').map(Number);
  
  baseDate.setHours(hour, minute, 0, 0);
  return baseDate;
}

// Get current time in Central Time Zone  
export function getCurrentTimeCT(): Date {
  return new Date();
}

// Convert hours/minutes since start time to pixels
export function timeToPixels(hoursOffset: number): number {
  return LEFT_GUTTER_PX + (hoursOffset * PX_PER_HOUR);
}

// Convert pixels to hours since start time  
export function pixelsToHours(pixels: number): number {
  return Math.max(0, (pixels - LEFT_GUTTER_PX) / PX_PER_HOUR);
}

// Calculate card pixel range using consistent coordinate space
export function cardPixelRange(position: number, duration: number, hoursPerDay = HOURS_PER_DAY): { start: number; end: number } {
  const dayOffset = Math.floor(position / hoursPerDay);
  const hourOffset = position % hoursPerDay;
  
  // Calculate start position with left gutter included
  const start = LEFT_GUTTER_PX + dayOffset * (hoursPerDay * PX_PER_HOUR) + hourOffset * PX_PER_HOUR;
  const end = start + (duration * PX_PER_HOUR);
  
  return { start, end };
}

// Calculate business days from start date (matches existing logic)
export function getBusinessDay(startDateStr: string, dayOffset: number): Date {
  const [year, month, day] = startDateStr.split('-').map(Number);
  const start = new Date(year, month - 1, day);
  
  if (dayOffset === 0) {
    return start;
  }
  
  let current = new Date(start);
  let businessDaysAdded = 0;
  
  while (businessDaysAdded < dayOffset) {
    current.setDate(current.getDate() + 1);
    // Monday = 1, Friday = 5, Saturday = 6, Sunday = 0
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      businessDaysAdded++;
    }
  }
  
  return current;
}

// Add work hours respecting business days and work hours (matches existing logic)
export function addWorkHours(startTime: Date, hoursToAdd: number, workDayStartHour: number, workDayHours: number): Date {
  let currentTime = new Date(startTime);
  let remainingHours = hoursToAdd;
  
  while (remainingHours > 0) {
    // How many hours left in current work day?
    const currentHour = currentTime.getHours() + (currentTime.getMinutes() / 60);
    const hoursLeftInDay = Math.max(0, (workDayStartHour + workDayHours) - currentHour);
    
    if (hoursLeftInDay >= remainingHours) {
      // Remaining hours fit in current day
      currentTime.setHours(
        currentTime.getHours() + Math.floor(remainingHours),
        currentTime.getMinutes() + ((remainingHours % 1) * 60)
      );
      remainingHours = 0;
    } else {
      // Move to next business day
      remainingHours -= hoursLeftInDay;
      
      // Find next business day
      do {
        currentTime.setDate(currentTime.getDate() + 1);
      } while (currentTime.getDay() === 0 || currentTime.getDay() === 6); // Skip weekends
      
      // Start at beginning of work day
      currentTime.setHours(workDayStartHour, 0, 0, 0);
    }
  }
  
  return currentTime;
}