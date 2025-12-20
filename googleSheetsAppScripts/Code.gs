/* K&L Recycling CRM - Unified Backend v3.2
  Connects the React App to your Spreadsheet Data & Intelligence Engine
*/

function doGet(e) {
  const action = e.parameter.action;
  
  try {
    // 1. AI Insights (The "Gold Mine" Logic)
    if (action === "getInsights") {
      // Check if AIAdvisor is loaded
      if (typeof AIAdvisor !== 'undefined') {
        const insights = AIAdvisor.generateWeeklyInsights();
        return response({ status: "success", data: insights });
      } else {
        return response({ status: "success", data: null, message: "AI Module missing" });
      }
    }

    // 2. Prospects List
    else if (action === "getProspects") {
      return getSheetData(Config.SHEET_NAMES.prospects);
    }
    
    // 3. Pricing
    else if (action === "getPricing") {
      return getSheetData(Config.SHEET_NAMES.currentPrices);
    }
    
    return response({ status: "error", message: "Invalid Action" });
    
  } catch (error) {
    return response({ status: "error", message: error.toString() });
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // ... existing logVisit logic ...
    if (data.action === "logVisit") {
      return apiLogVisit(data.payload); // Make sure this calls your renamed function
    }

    // ✅ ADD THIS BLOCK: Handle Bulk Import
    if (data.action === "syncProspects") {
      return importProspects(data.payload);
    }

    return response({ status: "error", message: "Unknown action" });
  } catch (err) {
    return response({ status: "error", message: err.toString() });
  }
}

// --- HELPERS ---

function getSheetData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return response({ error: `Sheet '${sheetName}' not found` });

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return response([]); // Return empty if only header exists

  const headers = data[0];
  const rows = data.slice(1);

  const result = rows.map(row => {
    let obj = {};
    headers.forEach((header, i) => {
      // Normalize headers
      let key = header.toString().toLowerCase().trim()
        .replace(/ /g, "_")
        .replace(/[\(\)\.]/g, "");
      
      // Map specific keys for Frontend compatibility
      if (key === "company_id" || key === "id") key = "cid";
      if (key === "latitude") key = "lat";
      if (key === "longitude") key = "lng";
      if (key === "priority_score") key = "priorityScore";
      if (key === "contact_status") key = "contactStatus";
      if (key === "last_outcome") key = "lastOutcome";
      if (key === "last_outreach_date") key = "lastOutreachDate";
      if (key === "next_steps_due") key = "nextStepDue";
      if (key === "urgency_band") key = "urgencyBand";
      if (key === "competitor_mentioned") key = "competitorMentioned";
      if (key === "min_price" || key === "min_") key = "min";
      if (key === "max_price" || key === "max_") key = "max";
      
      // Handle Date Objects
      if (row[i] instanceof Date) {
        obj[key] = Utilities.formatDate(row[i], Session.getScriptTimeZone(), "yyyy-MM-dd");
      } else {
        obj[key] = row[i];
      }
    });
    return obj;
  });

  return response(result);
}

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ✅ ADD THIS HELPER FUNCTION AT THE BOTTOM
function importProspects(prospects) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(Config.SHEET_NAMES.prospects);
  if (!sheet) return response({ error: "Prospects sheet not found" });

  // 1. Get Headers to map columns dynamically
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // 2. Prepare rows
  const newRows = prospects.map(p => {
    return headers.map(header => {
      // Convert "Company ID" header to "cid" key logic
      let key = header.toString().toLowerCase().trim()
        .replace(/ /g, "_").replace(/[\(\)\.]/g, "");

      if (key === "company_id" || key === "id") key = "cid";
      if (key === "latitude") key = "lat";
      if (key === "longitude") key = "lng";
      if (key === "priority_score") key = "priorityScore";
      if (key === "contact_status") key = "contactStatus";
      if (key === "last_outcome") key = "lastOutcome";
      if (key === "last_outreach_date") key = "lastOutreachDate";
      if (key === "next_steps_due") key = "nextStepDue";

      return p[key] || ""; // Fill matched data or empty
    });
  });

  // 3. Append to bottom (Safe Mode) - Or clear and replace if you prefer
  if (newRows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
  }

  return response({ status: "success", count: newRows.length });
}
