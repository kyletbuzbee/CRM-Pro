/**
 * ═══════════════════════════════════════════════════════════════════════
 * K&L RECYCLING CRM - SIDEBAR API FUNCTIONS - FIXED VERSION
 * ═══════════════════════════════════════════════════════════════════════
 * Handles all client-server communication for the Sidebar UI
 * ✅ Fixed: All dependencies resolved and functions implemented
 * ✅ Added: Missing route optimization, email templates, validation
 */

// ============================================
// CORE API FUNCTIONS
// ============================================

/**
 * Get forecasted tasks for next week
 * ✅ FIXED: Now properly calls getUpcomingTasks()
 */
function getForecastedTasks() {
  try {
    const prospectMap = buildProspectMap();
    const tasks = getUpcomingTasks(prospectMap, 7);
    
    return {
      success: true,
      tasks: tasks.map(t => ({
        company: t.name,
        dueDate: t.date,
        lastOutcome: t.lastOutcome || 'Never Contacted',
        priority: t.priority || 0
      })),
      totalCount: tasks.length
    };
  } catch (error) {
    Utils.logError('getForecastedTasks', error);
    return { success: false, tasks: [], totalCount: 0 };
  }
}

/**
 * Log visit from sidebar - FIXED VERSION
 */
function logVisitFromSidebar(companyName, visitDate, outcome, notes) {
  try {
    const ss = Utils.getSpreadsheet();
    const outreachSheet = ss.getSheetByName(SHEET_NAMES.outreach);
    
    if (!outreachSheet) {
      return { success: false, message: 'Outreach sheet not found' };
    }

    // Find company ID by name
    const prospectsSheet = ss.getSheetByName(SHEET_NAMES.prospects);
    if (!prospectsSheet) {
      return { success: false, message: 'Prospects sheet not found' };
    }
    
    const prospectsData = prospectsSheet.getDataRange().getValues();
    let companyId = null;
    
    for (let i = 1; i < prospectsData.length; i++) {
      const companyCell = prospectsData[i][PROSPECTS_COLUMNS.company];
      if (companyCell && companyCell.toString().trim() === companyName.trim()) {
        companyId = prospectsData[i][PROSPECTS_COLUMNS.companyId];
        break;
      }
    }

    if (!companyId) {
      companyId = Utils.generateId('CID');
    }

    // Get outcome config
    const config = Utils.getOutcomeConfig(outcome);
    const followUpDays = Utils.getFollowUpDaysForOutcome(outcome);
    const nextVisitDate = new Date();
    nextVisitDate.setDate(nextVisitDate.getDate() + followUpDays);

    // Append to Outreach sheet using correct column mapping
    const outreachId = Utils.generateId('OUT');
    const owner = Utils.getCurrentUserEmail();
    
    outreachSheet.appendRow([
      outreachId,                    // 0: Log ID
      companyId,                     // 1: Company ID
      companyName,                   // 2: Company Name
      visitDate || new Date(),       // 3: Visit Date
      notes || '',                   // 4: Notes
      outcome,                       // 5: Outcome
      config.stage,                  // 6: Stage
      config.status,                 // 7: Status
      nextVisitDate,                 // 8: Next Steps Date
      '',                            // 9: Days Since Last Visit (formula)
      '',                            // 10: Next Visit Countdown (formula)
      config.stage,                  // 11: Outcome Category
      `Follow up in ${followUpDays} days`, // 12: Follow Up Action
      owner,                         // 13: Owner
      '',                            // 14: Prospects Match (formula)
      'In-Person',                   // 15: Contact Type
      'FALSE',                       // 16: Email Sent
      'FALSE'                        // 17: Calendar Created
    ]);

    Utils.logActivity('visit_logged', { 
      company: companyName, 
      outcome: outcome,
      companyId: companyId
    });

    return { 
      success: true, 
      message: 'Visit logged successfully',
      nextVisitDate: Utils.formatDate(nextVisitDate),
      followUpDays: followUpDays
    };
  } catch (error) {
    Utils.logError('logVisitFromSidebar', error);
    return { success: false, message: error.toString() };
  }
}

/**
 * Enhanced logVisit function for form data
 */
function logVisit(form) {
  if (!form || !form.cid || !form.outcome) {
    console.error('logVisit: Missing CID or outcome');
    return { success: false, message: 'Missing company or outcome' };
  }

  const ss = Utils.getSpreadsheet();
  const outreachSheet = ss.getSheetByName(SHEET_NAMES.outreach);
  if (!outreachSheet) return { success: false, message: 'Outreach sheet missing' };

  const canonicalOutcome = canonicalizeOutcome(form.outcome);
  if (!canonicalOutcome) {
    return { success: false, message: 'Invalid outcome' };
  }

  const logic = Utils.normalizeOutcome(canonicalOutcome);
  const now = new Date();
  const prospectMap = getProspectMapCached();
  const companyName = prospectMap[form.cid] ? prospectMap[form.cid].name : 'Unknown';

  try {
    outreachSheet.appendRow([
      Utils.generateId('OUT'),        // Log ID
      form.cid,                       // Company ID
      companyName,                    // Company Name
      now,                           // Visit Date
      form.notes || '',              // Notes
      canonicalOutcome,              // Outcome
      logic.stage,                   // Stage
      logic.status,                  // Status
      form.nextDate || '',           // Next Steps Date
      '', '', '', '', '',            // Formula columns
      form.stage || '',              // Outcome Category
      form.followUpAction || `Follow up in ${Utils.getFollowUpDaysForOutcome(canonicalOutcome)} days`,
      Utils.getCurrentUserEmail(),   // Owner
      '',                            // Prospects Match
      form.contactType || 'In Person', // Contact Type
      form.emailSent ? 'TRUE' : 'FALSE',  // Email Sent
      form.calendarCreated ? 'TRUE' : 'FALSE' // Calendar Created
    ]);

    // Auto-send pricing email if outcome is "Send Info"
    if (canonicalOutcome === 'Send Info' && form.autoSendEmail !== false) {
      autoSendPricingEmail(form.cid);
    }

    if (canonicalOutcome === 'Won') syncWonToAccounts(form.cid);
    syncProspectsFromOutreach();

    return { success: true, message: 'Logged successfully' };
  } catch (e) {
    Utils.logError('logVisit', e);
    return { success: false, message: 'Failed to log visit' };
  }
}

/**
 * Get company context (full details for selected company)
 */
function getCompanyContext(cid) {
  try {
    const map = getProspectMapCached();
    const company = map[cid];
    
    if (!company) {
      return { success: false, message: 'Company not found' };
    }

    return {
      success: true,
      company: {
        cid: company.cid,
        name: company.name,
        address: company.address,
        industry: company.industry,
        lat: company.lat,
        lng: company.lng,
        priority: company.priority,
        lastOutcome: company.lastOutcome,
        email: company.email,
        nextDateTimeDisplay: company.nextDateTimeDisplay,
        zip: company.zip,
        contactName: company.contactName
      }
    };
  } catch (error) {
    Utils.logError('getCompanyContext', error);
    return { success: false, message: 'Failed to load company details' };
  }
}

/**
 * Generate optimized route - ENHANCED VERSION
 */
function generateRoute(options) {
  try {
    const zipFilter = options.zip || null;
    const maxStops = parseInt(options.maxStops) || 10;
    
    const map = getProspectMapCached();
    let prospects = Object.values(map).filter(p => {
      if (!p) return false;
      if (p.lastOutcome === 'Won' || p.lastOutcome === 'Lost') return false;
      if (zipFilter && p.zip !== zipFilter) return false;
      if (!p.lat || !p.lng || p.lat === 0 || p.lng === 0) return false;
      return true;
    });

    // Sort by priority
    prospects.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // Limit stops
    prospects = prospects.slice(0, maxStops);

    // Simple nearest-neighbor TSP optimization
    const route = [];
    const visited = new Set();
    let current = prospects[0];
    
    if (!current) {
      return { success: false, message: 'No prospects found for route' };
    }

    route.push(current);
    visited.add(current.cid);

    while (route.length < prospects.length) {
      let nearest = null;
      let minDist = Infinity;

      for (let p of prospects) {
        if (visited.has(p.cid)) continue;
        const dist = Utils.calculateDistance(
          current.lat, current.lng,
          p.lat, p.lng
        );
        if (dist < minDist) {
          minDist = dist;
          nearest = p;
        }
      }

      if (!nearest) break;
      route.push(nearest);
      visited.add(nearest.cid);
      current = nearest;
    }

    // Generate Google Maps URL
    const origin = COMPANY_INFO.ADDRESS;
    const destination = route.length > 0 ? route[route.length - 1].address : origin;
    const waypoints = route.slice(0, -1).map(p => p.address);
    
    const mapsUrl = Utils.createMapsUrl(origin, destination, waypoints);

    // Calculate estimated distance and time
    let totalDistance = 0;
    let totalTime = 0;
    
    for (let i = 1; i < route.length; i++) {
      const dist = Utils.calculateDistance(
        route[i-1].lat, route[i-1].lng,
        route[i].lat, route[i].lng
      );
      totalDistance += dist;
      totalTime += (dist / 25) * 60; // Assuming 25 mph average, convert to minutes
    }

    return {
      success: true,
      route: route.map((p, idx) => ({
        stop: idx + 1,
        cid: p.cid,
        name: p.name,
        address: p.address,
        priority: p.priority,
        lat: p.lat,
        lng: p.lng,
        distance: idx > 0 ? Utils.calculateDistance(
          route[idx-1].lat, route[idx-1].lng,
          p.lat, p.lng
        ) : 0
      })),
      totalStops: route.length,
      totalDistance: Math.round(totalDistance * 10) / 10,
      estimatedTime: Math.round(totalTime),
      mapsUrl: mapsUrl
    };
  } catch (error) {
    Utils.logError('generateRoute', error);
    return { success: false, message: 'Route generation failed: ' + error.message };
  }
}

/**
 * Generate route for sidebar (legacy compatibility)
 */
function getCustomRoute(options) {
  return generateRoute(options);
}

/**
 * Send email to company - ENHANCED VERSION
 */
function sendCompanyEmail(cid, template, customMessage) {
  try {
    const map = getProspectMapCached();
    const company = map[cid];
    
    if (!company) {
      return { success: false, message: 'Company not found' };
    }

    if (!company.email || !Utils.isValidEmail(company.email)) {
      return { success: false, message: 'No valid email address for ' + company.name };
    }

    const templateData = EMAIL_TEMPLATES[template];
    if (!templateData) {
      return { success: false, message: 'Invalid email template' };
    }

    // Replace template variables
    let subject = templateData.subject
      .replace('{company}', company.name)
      .replace('{contactName}', company.contactName || company.name)
      .replace('{competitor}', 'your current provider');

    let body = templateData.body
      .replace(/{company}/g, company.name)
      .replace(/{contactName}/g, company.contactName || company.name)
      .replace('{phone}', COMPANY_INFO.PHONE)
      .replace('{email}', COMPANY_INFO.EMAIL)
      .replace('{date}', Utils.formatDate(new Date(), 'MMM dd, yyyy'))
      .replace('{customMessage}', customMessage || '');

    // Add pricing table if needed
    if (template === 'pricing') {
      const pricingTable = getPricingTableHtml();
      body = body.replace('{pricingTable}', pricingTable);
    }

    GmailApp.sendEmail(company.email, subject, body);
    
    // Log email in Outreach
    logEmailActivity(cid, subject, company.email, 'Manual');

    return { success: true, message: 'Email sent successfully to ' + company.email };
  } catch (error) {
    Utils.logError('sendCompanyEmail', error);
    return { success: false, message: 'Email send failed: ' + error.message };
  }
}

/**
 * Create follow-up draft email
 */
function createFollowUpDraft(cid, subject, sendImmediately = false) {
  try {
    const map = getProspectMapCached();
    const company = map[cid];
    
    if (!company) {
      return { success: false, message: 'Company not found' };
    }

    if (!company.email || !Utils.isValidEmail(company.email)) {
      return { success: false, message: 'No valid email address' };
    }

    const body = `Hi ${company.contactName || company.name},

I wanted to follow up on our recent conversation about K&L Recycling's services for ${company.name}.

{customMessage}

Would you have 10 minutes this week to discuss how we can help streamline your scrap metal disposal?

Best regards,
Kyle
K&L Recycling
${COMPANY_INFO.PHONE}`;

    if (sendImmediately) {
      GmailApp.sendEmail(company.email, subject, body);
      return { success: true, message: 'Email sent successfully' };
    } else {
      // Create draft
      const draft = GmailApp.createDraft(company.email, subject, body);
      const url = `https://mail.google.com/mail/u/0/#drafts?compose=${draft.getId()}`;
      return { success: true, message: 'Draft created', url: url };
    }
  } catch (error) {
    Utils.logError('createFollowUpDraft', error);
    return { success: false, message: 'Draft creation failed: ' + error.message };
  }
}

/**
 * Log email activity
 */
function logEmailActivity(cid, subject, email, type) {
  try {
    const ss = Utils.getSpreadsheet();
    const emailLogSheet = ss.getSheetByName(SHEET_NAMES.emailLog);
    
    if (!emailLogSheet) {
      // Create email log sheet if it doesn't exist
      const sheet = ss.insertSheet(SHEET_NAMES.emailLog);
      sheet.appendRow(['Timestamp', 'Company ID', 'Company Name', 'Email', 'Subject', 'Type']);
      emailLogSheet = sheet;
    }
    
    const map = getProspectMapCached();
    const company = map[cid];
    const companyName = company ? company.name : 'Unknown';
    
    emailLogSheet.appendRow([
      new Date(),
      cid,
      companyName,
      email,
      subject,
      type
    ]);
    
    Utils.logActivity('email_logged', { 
      company: companyName, 
      email: email, 
      subject: subject,
      type: type
    });
  } catch (error) {
    Utils.logError('logEmailActivity', error);
  }
}

/**
 * Get pricing table as formatted HTML
 */
function getPricingTableHtml() {
  try {
    const ss = Utils.getSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.currentPrices);
    
    if (!sheet) {
      return '<p>Pricing information not available. Contact us for current rates.</p>';
    }
    
    const data = sheet.getDataRange().getValues();
    
    if (data.length < 2) {
      return '<p>No pricing data available. Contact us for current rates.</p>';
    }
    
    let html = '<table style="border-collapse: collapse; width: 100%; margin: 10px 0;">';
    html += '<thead><tr style="background: #001F3F; color: white;">';
    html += '<th style="padding: 8px; border: 1px solid #ddd;">Material</th>';
    html += '<th style="padding: 8px; border: 1px solid #ddd;">Price Range</th>';
    html += '</tr></thead><tbody>';
    
    let currentCategory = '';
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const category = row[PRICING_COLUMNS.category] || '';
      const item = row[PRICING_COLUMNS.item] || '';
      const minPrice = row[PRICING_COLUMNS.minPrice] || '';
      const maxPrice = row[PRICING_COLUMNS.maxPrice] || '';
      
      // Category header
      if (category && category !== currentCategory) {
        html += `<tr style="background: #f0f0f0; font-weight: bold;">`;
        html += `<td colspan="2" style="padding: 8px; border: 1px solid #ddd;">${category}</td>`;
        html += '</tr>';
        currentCategory = category;
      }
      
      // Item row
      if (item) {
        const priceRange = maxPrice ? `$${minPrice} - $${maxPrice}/lb` : `$${minPrice}/lb`;
        html += '<tr>';
        html += `<td style="padding: 8px; border: 1px solid #ddd;">${item}</td>`;
        html += `<td style="padding: 8px; border: 1px solid #ddd;">${priceRange}</td>`;
        html += '</tr>';
      }
    }
    
    html += '</tbody>
