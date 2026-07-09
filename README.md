# GroupGenius AI - Random Group Generator

A premium, modern Single Page Application (SPA) designed to help university teachers and team managers create project teams with balanced sizes and genders from uploaded files.

## Features

1. **Multi-Format Upload Support**:
   - **Excel Sheets (.xlsx, .xls)**: Read rows for Names, Registration Numbers, and optionally Genders.
   - **PDF Attendance Sheets (.pdf)**: Parses text tables and rosters automatically.
   - **Images (.jpg, .jpeg, .png)**: Runs client-side Tesseract.js optical character recognition (OCR) to convert photos of printouts or whiteboards into editable text rosters.
   - **Manual Input**: Paste copy-pasted student names directly with quick comma-separated parsing. Includes a 50-student sample loader for testing.

2. **Roster Review & Editing**:
   - Review all parsed names and registration numbers.
   - Edit, delete, or add entries.
   - Set genders or use bulk tools ("Set all Boys", "Set all Girls", "Auto-Detect Genders").
   - Live tracking of total count, boy/girl balance.

3. **Visual Raffle Theater Mode**:
   - Customize group sizes from 2 to 10 students.
   - Balanced gender sorting algorithm distributes boys and girls evenly across all groups.
   - Displays rolling slot machine style slots that click rapidly through candidate lists, decelerate, and lock in students one-by-one.
   - Powered by Web Audio API synthesizers (clicking ticks, success chime, and completion fanfares) and Canvas Confetti particle celebrations.
   - Adjustable speed options (Slow, Normal, Fast, Insane) and autoplay loops.

4. **Team Modification Dashboard**:
   - Allows dragging and dropping student cards from one team to another on the final dashboard to make minor manual adjustments.
   - Live updates team capacities and balances.

5. **Professional Report Exports**:
   - **Excel (.xlsx)**: Downloads structured spreadsheets with headers, column width adjustments, and spacing ready for project submissions.
   - **PDF Document (.pdf)**: Styled tables with header cards for each team, generated using jsPDF and AutoTable.

---

## File Structure

- [index.html](file:///index.html): Document layout, view blocks, and CDN links.
- [styles.css](file:///styles.css): Glassmorphic dark-theme design system, responsiveness, and keyframe roll animations.
- [app.js](file:///app.js): State management, file format parsers, balanced sorting algorithm, sound synthesizer, and export handlers.

---

## How to Run

Since the application is running completely client-side in the browser:

### Option A: Double-Click opening
You can double-click `index.html` to run it. 
*Note: Due to browser security constraints (CORS policies), some browsers may block the PDF.js web worker file when loaded directly via `file://`. For full PDF parsing functionality, Option B is recommended.*

### Option B: Local Web Server (Recommended)
Run a lightweight server from this project directory. For example, using PowerShell:

```powershell
# If Node.js is installed
npx serve

# Or using Python (built into most machines)
python -m http.server 8000
```
Then navigate to `http://localhost:8000` or `http://localhost:3000` in your web browser.
