/* K&L Recycling CRM - Unified Backend v3.0
  Connects the React App to your Spreadsheet Data & Intelligence Engine
*/

function doGet(e) {
  const action = e.parameter.action;
  
  try {
    // 1. AI Insights (The "Gold Mine" Logic)
    if (action === "getInsights") {
      const insights = AIAdvisor.generateWeeklyInsights();
      return response({ status: "success", data: insights });
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
    
    if (data.action === "logVisit") {
      const result = logVisit(data.payload);
      return result;
    }
    
    return response({ status: "error", message: "Unknown action" });
  } catch (err) {
    return response({ status: "error", message: err.toString() });
  }
}

// --- HELPERS ---

function getSheetData(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return response({ error: `Sheet '${sheetName}' not found` });

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  const result = rows.map(row => {
    let obj = {};
    headers.forEach((header, i) => {
      // Normalize headers: "Company ID" -> "cid", "Priority Score" -> "priorityScore"
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
      
      obj[key] = row[i];
    });
    return obj;
  });

  return response(result);
}

function logVisit(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(Config.SHEET_NAMES.outreach);
  if (!sheet) return response({ error: "Outreach sheet missing" });
  
  const newId = "LID-" + Math.floor(Math.random() * 1000000);
  
  // Appends: ID, CID, Company, Date, Notes, Outcome, Stage, Status
  sheet.appendRow([
    newId,
    payload.cid,
    payload.company,
    new Date(),
    payload.notes,
    payload.outcome,
    "Nurture",
    "Warm",
    payload.nextVisitDate || ""
  ]);
  
  return response({ status: "success", id: newId });
}

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}