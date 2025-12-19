/**
 * ═══════════════════════════════════════════════════════════════════════
 * K&L RECYCLING CRM - SIDEBAR API FUNCTIONS
 * ═══════════════════════════════════════════════════════════════════════
 * Handles all client-server communication for the Sidebar UI
 * ✅ Fixed: getForecastedTasks now uses getUpcomingTasks()
 */

/**
 * Get forecasted tasks for next week
 * ✅ FIXED: Now properly calls getUpcomingTasks()
 */
function getForecastedTasks() {
  try {
    const prospectMap = buildProspectMap();
    const tasks = getUpcomingTasks(prospectMap, 7); // ✅ NOW EXISTS!
    
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
 * Log visit from sidebar
 */
function logVisitFromSidebar(companyName, visitDate, outcome, notes) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const outreachSheet = ss.getSheetByName(SHEET_NAMES.outreach);
    
    if (!outreachSheet) {
      return { success: false, message: 'Outreach sheet not found' };
    }

    // Find or create company ID
    const prospectsSheet = ss.getSheetByName(SHEET_NAMES.prospects);
    const prospectsData = prospectsSheet.getDataRange().getValues();
    let companyId = null;
    
    for (let i = 1; i < prospectsData.length; i++) {
      if (prospectsData[i][PROSPECTS_COLUMNS.company] === companyName) {
        companyId = prospectsData[i][PROSPECTS_COLUMNS.companyId];
        break;
      }
    }

    if (!companyId) {
      companyId = generateId('CID');
    }

    // Get outcome config
    const config = getOutcomeConfig(outcome);
    const followUpDays = getFollowUpDaysForOutcome(outcome);
    const nextVisitDate = new Date();
    nextVisitDate.setDate(nextVisitDate.getDate() + followUpDays);

    // Append to Outreach sheet
    const outreachId = generateId('OUT');
    const owner = getCurrentUserEmail();
    
    outreachSheet.appendRow([
      outreachId,
      companyId,
      companyName,
      visitDate || new Date(),
      notes || '',
      outcome,
      config.stage,
      config.status,
      nextVisitDate,
      '', // Days Since Last Visit (formula)
      '', // Next Visit Countdown (formula)
      config.stage,
      `Follow up in ${followUpDays} days`,
      owner,
      '', // Prospects Match (formula)
      'In-Person',
      '', // Email Sent
      ''  // Email Opened
    ]);

    logActivity('visit_logged', { company: companyName, outcome: outcome });

    return { 
      success: true, 
      message: 'Visit logged successfully',
      nextVisitDate: formatDate(nextVisitDate)
    };
  } catch (error) {
    Utils.logError('logVisitFromSidebar', error);
    return { success: false, message: error.toString() };
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
        zip: company.zip
      }
    };
  } catch (error) {
    Utils.logError('getCompanyContext', error);
    return { success: false, message: 'Failed to load company details' };
  }
}

/**
 * Generate optimized route
 */
function generateRoute(zipFilter, maxStops) {
  try {
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
    const limit = parseInt(maxStops) || 10;
    prospects = prospects.slice(0, limit);

    // Simple nearest-neighbor TSP
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

    return {
      success: true,
      route: route.map((p, idx) => ({
        stop: idx + 1,
        cid: p.cid,
        name: p.name,
        address: p.address,
        priority: p.priority,
        lat: p.lat,
        lng: p.lng
      })),
      totalStops: route.length
    };
  } catch (error) {
    Utils.logError('generateRoute', error);
    return { success: false, message: 'Route generation failed' };
  }
}

/**
 * Send email to company
 */
function sendCompanyEmail(cid, template, customMessage) {
  try {
    const map = getProspectMapCached();
    const company = map[cid];
    
    if (!company) {
      return { success: false, message: 'Company not found' };
    }

    if (!company.email || !company.email.includes('@')) {
      return { success: false, message: 'No valid email address' };
    }

    let subject = '';
    let body = '';

    switch (template) {
      case 'pricing':
        subject = 'K&L Recycling - Pricing Information';
        body = `Hi ${company.name},\n\nThank you for your interest! Attached are our current scrap metal prices.\n\nBest regards,\nK&L Recycling`;
        break;
      case 'followup':
        subject = 'K&L Recycling - Follow Up';
        body = `Hi ${company.name},\n\nFollowing up on our recent conversation about recycling services.\n\nBest regards,\nK&L Recycling`;
        break;
      case 'winback':
        subject = 'K&L Recycling - We Miss You!';
        body = `Hi ${company.name},\n\nWe'd love to have you back as a customer. Let's reconnect!\n\nBest regards,\nK&L Recycling`;
        break;
      default:
        return { success: false, message: 'Invalid template' };
    }

    if (customMessage) {
      body += `\n\n${customMessage}`;
    }

    GmailApp.sendEmail(company.email, subject, body);
    
    // Log email in Outreach
    logEmailActivity(cid, subject, company.email, 'Manual');

    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    Utils.logError('sendCompanyEmail', error);
    return { success: false, message: 'Email send failed' };
  }
}

/**
 * Debug prospects data (for troubleshooting)
 */
function debugProspectsData() {
  try {
    const data = getInitialData();
    return {
      success: true,
      companies: data.companies.length,
      tasks: data.tasks.length,
      zips: data.zips.length,
      sample: data.companies.slice(0, 5)
    };
  } catch (error) {
    Utils.logError('debugProspectsData', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * Snooze a prospect (delay next contact)
 */
function snoozeCompany(cid, days) {
  return snoozeProspect(cid, parseInt(days) || 7);
}

/**
 * Get automation status
 */
function getAutomationStatus() {
  return {
    success: true,
    status: 'Active',
    lastRun: new Date().toLocaleString(),
    nextRun: 'Tomorrow 6:00 AM'
  };
}
