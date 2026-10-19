/**
 * ============================================================================
 * NITIN VR — PORTFOLIO ENQUIRIES GOOGLE APPS SCRIPT BACKEND
 * ============================================================================
 * 
 * Instructions:
 * 1. Open your Google Sheet.
 * 2. Click: Extensions > Apps Script.
 * 3. Delete any default code in Code.gs and paste this entire script.
 * 4. Click "Save" (Ctrl+S / Cmd+S).
 * 5. Click "Deploy" > "New deployment".
 * 6. Select Type: "Web app" (Gear icon > Web app).
 * 7. Set:
 *    - Description: "Portfolio Contact Webhook"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"  <-- CRITICAL!
 * 8. Click "Deploy", authorize permissions ("Advanced" > "Go to ... (unsafe)"),
 *    and copy the generated Web App URL.
 * ============================================================================
 */

// CONFIGURATION
const SHEET_NAME = 'Enquiries';
const HEADERS = ['Timestamp', 'Name', 'Email', 'Subject', 'Description', 'Status', 'User Agent'];
const NOTIFY_OWNER_EMAIL = false; // Change to true if you want an email alert on each submission
const RATE_LIMIT_SECONDS = 10;   // Cooldown per email address to stop spam floods

/**
 * Health check endpoint (GET request)
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'active',
    service: 'Nitin VR Portfolio Webhook',
    timestamp: new Date().toISOString(),
    message: 'Google Apps Script endpoint is online and ready to receive submissions.'
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Main form submission handler (POST request)
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  // Wait up to 30 seconds for lock to avoid race conditions
  if (!lock.tryLock(30000)) {
    return createJsonResponse({
      status: 'error',
      code: 'SERVER_BUSY',
      message: 'Server is busy processing requests. Please retry in a few seconds.'
    });
  }

  try {
    const data = parseIncomingData(e);
    if (!data) {
      return createJsonResponse({
        status: 'error',
        code: 'EMPTY_PAYLOAD',
        message: 'No enquiry data received.'
      });
    }

    // 1. Anti-spam honeypot check
    const honeypot = data._hp_website || data.honeypot || '';
    if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
      return createJsonResponse({
        status: 'error',
        code: 'SPAM_REJECTED',
        message: 'Spam detected and rejected.'
      });
    }

    // 2. Validate fields
    const name = (data.name || '').trim();
    const email = (data.email || '').trim().toLowerCase();
    const subject = (data.subject || '').trim();
    const description = (data.description || '').trim();
    const userAgent = (data.userAgent || 'Unknown').trim();

    if (!name || name.length < 2) {
      return createJsonResponse({ status: 'error', message: 'Name must be at least 2 characters long.' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return createJsonResponse({ status: 'error', message: 'Please provide a valid email address.' });
    }
    if (!subject) {
      return createJsonResponse({ status: 'error', message: 'Subject is required.' });
    }
    if (!description || description.length < 5) {
      return createJsonResponse({ status: 'error', message: 'Description must be at least 5 characters long.' });
    }

    // 3. Rate limiting cooldown per email
    const cache = CacheService.getScriptCache();
    const rateKey = 'rate_' + Utilities.base64EncodeWebSafe(email).slice(0, 30);
    if (cache.get(rateKey)) {
      return createJsonResponse({
        status: 'error',
        message: 'Please wait a few seconds before sending another submission.'
      });
    }
    cache.put(rateKey, 'true', RATE_LIMIT_SECONDS);

    // 4. Access Google Sheet
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) {
      throw new Error('Spreadsheet not found. Make sure this script was opened via Extensions > Apps Script in Google Sheets.');
    }

    let sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.getActiveSheet();
    
    // If sheet is empty or new, populate headers automatically
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
      headerRange.setFontWeight('bold');
      headerRange.setBackground('#000000');
      headerRange.setFontColor('#ffffff');
      headerRange.setHorizontalAlignment('center');
      sheet.setFrozenRows(1);

      sheet.setColumnWidth(1, 180); // Timestamp
      sheet.setColumnWidth(2, 160); // Name
      sheet.setColumnWidth(3, 220); // Email
      sheet.setColumnWidth(4, 240); // Subject
      sheet.setColumnWidth(5, 420); // Description
      sheet.setColumnWidth(6, 100); // Status
      sheet.setColumnWidth(7, 180); // User Agent
    }

    // 5. Prevent formula injection (OWASP)
    function sanitize(val) {
      if (typeof val === 'string' && /^[=+\-@\t\r]/.test(val)) {
        return "'" + val;
      }
      return val;
    }

    const timestamp = new Date().toISOString();
    const newRow = [
      timestamp,
      sanitize(name),
      sanitize(email),
      sanitize(subject),
      sanitize(description),
      'New',
      sanitize(userAgent)
    ];

    sheet.appendRow(newRow);
    SpreadsheetApp.flush();

    // 6. Optional Email notification
    if (NOTIFY_OWNER_EMAIL) {
      try {
        const ownerEmail = Session.getEffectiveUser().getEmail();
        if (ownerEmail) {
          MailApp.sendEmail(
            ownerEmail,
            `[Portfolio Enquiry] ${subject} — from ${name}`,
            `New enquiry received:\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nDescription:\n${description}\n\nTimestamp: ${timestamp}`
          );
        }
      } catch (mailErr) {
        console.warn('Could not send owner notification: ' + mailErr);
      }
    }

    return createJsonResponse({
      status: 'success',
      message: 'Thank you! Your enquiry has been safely received.'
    });

  } catch (err) {
    return createJsonResponse({
      status: 'error',
      message: 'Failed to record enquiry: ' + err.toString()
    });
  } finally {
    lock.releaseLock();
  }
}

function parseIncomingData(e) {
  if (!e) return null;
  if (e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (ignore) {}
  }
  if (e.parameter && Object.keys(e.parameter).length > 0) {
    return e.parameter;
  }
  return null;
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
