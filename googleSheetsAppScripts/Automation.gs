/**
 * K&L RECYCLING CRM - AUTOMATION ENGINE
 * Phase 1-3 Automations + AI Advisor
 * December 18, 2025
 */

// ============================================
// PHASE 1: AUTOMATED FOLLOW-UP REMINDERS
// ============================================

/**
 * Send daily morning digest email at 6:30 AM
 * Run this via time-based trigger
 */
function sendDailyDigestEmail() {
  try {
    const userEmail = getCurrentUserEmail();
    const digest = generateDailyDigest();
    
    if (!digest || !digest.html) {
      console.log('No digest content to send');
      return;
    }
    
    const subject = `🌅 Good Morning! Your K&L CRM Priorities - ${formatDate(new Date(), 'MMM dd, yyyy')}`;
    
    GmailApp.sendEmail(
      userEmail,
      subject,
      digest.plainText,
      {
        htmlBody: digest.html,
        name: 'K&L CRM Automation'
      }
    );
    
    console.log(`Daily digest sent to ${userEmail}`);
    logActivity('DAILY_DIGEST_SENT', { recipient: userEmail, taskCount: digest.taskCount });
    
  } catch (error) {
    console.error('Failed to send daily digest:', error);
    logActivity('DAILY_DIGEST_FAILED', { error: error.message });
  }
}

/**
 * Generate daily digest content
 */
function generateDailyDigest() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const prospectsSheet = ss.getSheetByName(SHEET_NAMES.prospects);
  const outreachSheet = ss.getSheetByName(SHEET_NAMES.outreach);
  
  if (!prospectsSheet || !outreachSheet) {
    return null;
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTime = today.getTime();
  
  // Get prospects data
  const prospectsData = prospectsSheet.getDataRange().getValues();
  const headers = prospectsData[0];
  
  // Parse overdue tasks
  const overdueTasks = [];
  const dueTodayTasks = [];
  const hotLeads = [];
  
  for (let i = 1; i < prospectsData.length; i++) {
    const row = prospectsData[i];
    const company = row[PROSPECTS_COLUMNS.company];
    const nextStepsDue = row[PROSPECTS_COLUMNS.nextStepsDue];
    const lastOutcome = row[PROSPECTS_COLUMNS.lastOutcome];
    const contactStatus = row[PROSPECTS_COLUMNS.contactStatus];
    const priorityScore = row[PROSPECTS_COLUMNS.priorityScore];
    const daysSinceContact = row[PROSPECTS_COLUMNS.daysSinceLastContact];
    
    if (!company) continue;
    
    // Skip Won/Lost/Not Interested
    if (['Won', 'Lost', 'Not Interested'].includes(lastOutcome)) continue;
    
    // Check for overdue tasks
    if (nextStepsDue) {
      const dueDate = parseDate(nextStepsDue);
      if (dueDate && dueDate.getTime() < todayTime) {
        const daysOverdue = Math.floor((todayTime - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        overdueTasks.push({
          company,
          lastOutcome,
          daysOverdue,
          priority: priorityScore || 0
        });
      } else if (dueDate && dueDate.getTime() === todayTime) {
        dueTodayTasks.push({
          company,
          lastOutcome,
          priority: priorityScore || 0
        });
      }
    }
    
    // Check for hot leads needing attention
    if (contactStatus === 'Hot' && daysSinceContact >= 5) {
      hotLeads.push({
        company,
        lastOutcome,
        daysSinceContact,
        priority: priorityScore || 0
      });
    }
  }
  
  // Sort by priority
  overdueTasks.sort((a, b) => b.priority - a.priority);
  dueTodayTasks.sort((a, b) => b.priority - a.priority);
  hotLeads.sort((a, b) => b.priority - a.priority);
  
  // Generate suggested route
  const routeSuggestion = generateQuickRoute();
  
  // Build HTML email
  const html = buildDigestHtml({
    overdueTasks: overdueTasks.slice(0, 5),
    dueTodayTasks: dueTodayTasks.slice(0, 5),
    hotLeads: hotLeads.slice(0, 5),
    routeSuggestion
  });
  
  const plainText = buildDigestPlainText({
    overdueTasks: overdueTasks.slice(0, 5),
    dueTodayTasks: dueTodayTasks.slice(0, 5),
    hotLeads: hotLeads.slice(0, 5)
  });
  
  return {
    html,
    plainText,
    taskCount: overdueTasks.length + dueTodayTasks.length + hotLeads.length
  };
}

/**
 * Build HTML for daily digest email
 */
function buildDigestHtml(data) {
  const { overdueTasks, dueTodayTasks, hotLeads, routeSuggestion } = data;
  
  let html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px; }
    .header { background: linear-gradient(135deg, #001F3F 0%, #003D7A 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .section { background: white; margin: 15px 0; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .section-title { font-size: 18px; font-weight: bold; color: #001F3F; margin-bottom: 15px; border-bottom: 2px solid #001F3F; padding-bottom: 8px; }
    .task-item { padding: 12px; margin: 8px 0; background: #f8f9fa; border-left: 4px solid #DC3545; border-radius: 4px; }
    .task-item.hot { border-left-color: #FFC107; }
    .task-item.due { border-left-color: #17A2B8; }
    .company-name { font-weight: bold; color: #001F3F; }
    .outcome { color: #6C757D; font-size: 14px; }
    .priority { background: #001F3F; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
    .route-link { display: inline-block; background: #28A745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 10px; }
    .footer { text-align: center; color: #6C757D; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 24px;">🌅 Good Morning!</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Your K&L CRM Priorities - ${formatDate(new Date(), 'MMMM dd, yyyy')}</p>
    </div>
`;

  // Overdue Section
  if (overdueTasks.length > 0) {
    html += `
    <div class="section">
      <div class="section-title">🚨 OVERDUE (${overdueTasks.length})</div>
`;
    overdueTasks.forEach(task => {
      html += `
      <div class="task-item">
        <span class="company-name">${task.company}</span>
        <span class="priority">Priority: ${task.priority}</span><br>
        <span class="outcome">${task.lastOutcome} • ${task.daysOverdue} days overdue</span>
      </div>
`;
    });
    html += `</div>`;
  }
  
  // Due Today Section
  if (dueTodayTasks.length > 0) {
    html += `
    <div class="section">
      <div class="section-title">📅 DUE TODAY (${dueTodayTasks.length})</div>
`;
    dueTodayTasks.forEach(task => {
      html += `
      <div class="task-item due">
        <span class="company-name">${task.company}</span>
        <span class="priority">Priority: ${task.priority}</span><br>
        <span class="outcome">${task.lastOutcome}</span>
      </div>
`;
    });
    html += `</div>`;
  }
  
  // Hot Leads Section
  if (hotLeads.length > 0) {
    html += `
    <div class="section">
      <div class="section-title">🔥 HOT LEADS COOLING (${hotLeads.length})</div>
`;
    hotLeads.forEach(task => {
      html += `
      <div class="task-item hot">
        <span class="company-name">${task.company}</span>
        <span class="priority">Priority: ${task.priority}</span><br>
        <span class="outcome">${task.lastOutcome} • ${task.daysSinceContact} days since contact</span>
      </div>
`;
    });
    html += `</div>`;
  }
  
  // Route Suggestion
  if (routeSuggestion) {
    html += `
    <div class="section">
      <div class="section-title">📍 SUGGESTED ROUTE</div>
      <p><strong>${routeSuggestion.stopCount} stops</strong> • ${routeSuggestion.distance} miles • ${routeSuggestion.estimatedTime}</p>
      <a href="${routeSuggestion.mapUrl}" class="route-link" target="_blank">🗺️ View Optimized Route</a>
    </div>
`;
  }
  
  html += `
    <div class="footer">
      <p>Generated by K&L CRM Automation System<br>
      <a href="https://docs.google.com/spreadsheets/d/${SpreadsheetApp.getActiveSpreadsheet().getId()}" style="color: #001F3F;">Open CRM</a></p>
    </div>
  </div>
</body>
</html>
`;
  
  return html;
}

/**
 * Build plain text version of digest
 */
function buildDigestPlainText(data) {
  const { overdueTasks, dueTodayTasks, hotLeads } = data;
  
  let text = `Good Morning! Your K&L CRM Priorities - ${formatDate(new Date(), 'MMM dd, yyyy')}\n\n`;
  
  if (overdueTasks.length > 0) {
    text += `🚨 OVERDUE (${overdueTasks.length}):\n`;
    overdueTasks.forEach((task, i) => {
      text += `${i + 1}. ${task.company} - ${task.lastOutcome} (${task.daysOverdue} days overdue)\n`;
    });
    text += '\n';
  }
  
  if (dueTodayTasks.length > 0) {
    text += `📅 DUE TODAY (${dueTodayTasks.length}):\n`;
    dueTodayTasks.forEach((task, i) => {
      text += `${i + 1}. ${task.company} - ${task.lastOutcome}\n`;
    });
    text += '\n';
  }
  
  if (hotLeads.length > 0) {
    text += `🔥 HOT LEADS COOLING (${hotLeads.length}):\n`;
    hotLeads.forEach((task, i) => {
      text += `${i + 1}. ${task.company} - ${task.lastOutcome} (${task.daysSinceContact} days)\n`;
    });
  }
  
  return text;
}

/**
 * Generate quick route for top prospects
 */
function generateQuickRoute() {
  try {
    const map = buildProspectMap();
    const prospects = Object.values(map);
    
    // Filter to high-priority, non-won prospects with coordinates
    const validProspects = prospects.filter(p => 
      p.lat && p.lng && 
      p.priority >= 70 &&
      p.lastOutcome !== 'Won' &&
      p.lastOutcome !== 'Lost' &&
      p.lastOutcome !== 'Not Interested'
    );
    
    if (validProspects.length === 0) {
      return null;
    }
    
    // Sort by priority and take top 10
    validProspects.sort((a, b) => b.priority - a.priority);
    const topProspects = validProspects.slice(0, 10);
    
    // Build Google Maps URL
    const origin = '4134 Chandler Hwy, Tyler, TX 75702';
    const destination = topProspects[topProspects.length - 1].address;
    const waypoints = topProspects.slice(0, -1).map(p => p.address).join('|');
    
    const mapUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&waypoints=${encodeURIComponent(waypoints)}&travelmode=driving`;
    
    // Estimate distance (rough calculation)
    const avgMilesPerStop = 3.5;
    const totalDistance = Math.round(topProspects.length * avgMilesPerStop);
    const estimatedTime = `${Math.round(topProspects.length * 20 / 60 * 10) / 10} hours`;
    
    return {
      stopCount: topProspects.length,
      distance: totalDistance,
      estimatedTime,
      mapUrl
    };
    
  } catch (error) {
    console.error('Failed to generate quick route:', error);
    return null;
  }
}

// ============================================
// PHASE 1: NIGHTLY SCORE RECALCULATION
// ============================================

/**
 * Nightly batch job - recalculate all scores and update data
 * Run at 11:00 PM via time-based trigger
 */
function nightlyBatchJob() {
  const startTime = new Date();
  console.log('Starting nightly batch job...');
  
  try {
    // 1. Recalculate all prospect priorities
    recalculateAllPriorities();
    
    // 2. Update "Days Since Last Contact"
    updateDaysSinceContact();
    
    // 3. Auto-advance stages for stale prospects
    autoAdvanceStages();
    
    // 4. Detect and flag competitor mentions
    flagCompetitorMentions();
    
    // 5. Generate next day's tasks
    generateNextDayTasks();
    
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`Nightly batch job completed in ${duration}s`);
    logActivity('NIGHTLY_BATCH_COMPLETED', { durationSeconds: duration });
    
    return { success: true, duration };
    
  } catch (error) {
    console.error('Nightly batch job failed:', error);
    logActivity('NIGHTLY_BATCH_FAILED', { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Recalculate priorities for all prospects
 */
function recalculateAllPriorities() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.prospects);
  
  if (!sheet) return;
  
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return;
  
  const map = buildProspectMap();
  let updatedCount = 0;
  
  for (let i = 1; i < data.length; i++) {
    const cid = data[i][PROSPECTS_COLUMNS.companyId];
    if (!cid) continue;
    
    const prospect = map[cid];
    if (!prospect) continue;
    
    const newPriority = calculateDynamicPriority(prospect);
    const oldPriority = data[i][PROSPECTS_COLUMNS.priorityScore] || 0;
    
    if (newPriority !== oldPriority) {
      sheet.getRange(i + 1, PROSPECTS_COLUMNS.priorityScore + 1).setValue(newPriority);
      updatedCount++;
    }
  }
  
  console.log(`Updated priorities for ${updatedCount} prospects`);
}

/**
 * Update "Days Since Last Contact" for all prospects
 */
function updateDaysSinceContact() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.prospects);
  
  if (!sheet) return;
  
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return;
  
  const today = new Date();
  let updatedCount = 0;
  
  for (let i = 1; i < data.length; i++) {
    const lastOutreachDate = data[i][PROSPECTS_COLUMNS.lastOutreachDate];
    
    if (lastOutreachDate) {
      const daysSince = daysBetween(lastOutreachDate, today);
      sheet.getRange(i + 1, PROSPECTS_COLUMNS.daysSinceLastContact + 1).setValue(daysSince);
      updatedCount++;
    }
  }
  
  console.log(`Updated days since contact for ${updatedCount} prospects`);
}

/**
 * Auto-advance stages for stale prospects
 */
function autoAdvanceStages() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.prospects);
  
  if (!sheet) return;
  
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return;
  
  let advancedCount = 0;
  
  for (let i = 1; i < data.length; i++) {
    const contactStatus = data[i][PROSPECTS_COLUMNS.contactStatus];
    const daysSinceContact = data[i][PROSPECTS_COLUMNS.daysSinceLastContact];
    
    // Cool down hot leads after 14 days
    if (contactStatus === 'Hot' && daysSinceContact > 14) {
      sheet.getRange(i + 1, PROSPECTS_COLUMNS.contactStatus + 1).setValue('Warm');
      advancedCount++;
    }
    
    // Move warm leads to cold after 60 days
    if (contactStatus === 'Warm' && daysSinceContact > 60) {
      sheet.getRange(i + 1, PROSPECTS_COLUMNS.contactStatus + 1).setValue('Cold');
      advancedCount++;
    }
  }
  
  console.log(`Auto-advanced ${advancedCount} prospects`);
}

/**
 * Flag competitor mentions in outreach notes
 */
function flagCompetitorMentions() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const outreachSheet = ss.getSheetByName(SHEET_NAMES.outreach);
  const prospectsSheet = ss.getSheetByName(SHEET_NAMES.prospects);
  
  if (!outreachSheet || !prospectsSheet) return;
  
  const outreachData = outreachSheet.getDataRange().getValues();
  let flaggedCount = 0;
  
  for (let i = 1; i < outreachData.length; i++) {
    const cid = outreachData[i][OUTREACH_COLUMNS.companyId];
    const notes = outreachData[i][OUTREACH_COLUMNS.notes];
    
    if (!notes) continue;
    
    const competitor = detectCompetitor(notes);
    
    if (competitor) {
      // Update Prospects sheet with competitor info
      const prospectsData = prospectsSheet.getDataRange().getValues();
      for (let j = 1; j < prospectsData.length; j++) {
        if (prospectsData[j][PROSPECTS_COLUMNS.companyId] === cid) {
          prospectsSheet.getRange(j + 1, PROSPECTS_COLUMNS.competitorMentioned + 1).setValue(competitor);
          flaggedCount++;
          break;
        }
      }
    }
  }
  
  console.log(`Flagged ${flaggedCount} competitor mentions`);
}

/**
 * Generate task list for next day
 */
function generateNextDayTasks() {
  // This prepares cached data for faster morning load
  const map = buildProspectMap();
  const tasks = getTasksListInternal(map, null);
  
  console.log(`Generated ${tasks.length} tasks for tomorrow`);
  return tasks;
}

// ============================================
// SETUP TRIGGERS
// ============================================

/**
 * Setup all automation triggers
 * Run this once manually to initialize
 */
function setupAutomationTriggers() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (['sendDailyDigestEmail', 'nightlyBatchJob', 'weeklyAIAdvisor'].includes(trigger.getHandlerFunction())) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Daily digest at 6:30 AM
  ScriptApp.newTrigger('sendDailyDigestEmail')
    .timeBased()
    .atHour(6)
    .nearMinute(30)
    .everyDays(1)
    .create();
  
  // Nightly batch job at 11:00 PM
  ScriptApp.newTrigger('nightlyBatchJob')
    .timeBased()
    .atHour(23)
    .nearMinute(0)
    .everyDays(1)
    .create();
  
  // Weekly AI advisor on Monday at 8:00 AM
  ScriptApp.newTrigger('weeklyAIAdvisor')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(8)
    .nearMinute(0)
    .create();
  
  console.log('✅ All automation triggers set up successfully');
  
  return {
    success: true,
    message: 'Automation triggers configured:\n' +
             '• Daily Digest: 6:30 AM\n' +
             '• Nightly Batch: 11:00 PM\n' +
             '• Weekly AI Advisor: Mondays 8:00 AM'
  };
}
