/**
 * K&L RECYCLING CRM - EMAIL SERVICE
 * Smart Templates & Automation
 * December 18, 2025
 */

/**
 * Send email with template replacement
 */
function sendEmailFromTemplate(cid, templateName, customData = {}) {
  try {
    const templates = getSystemSetting('emailTemplates', DEFAULT_SETTINGS.emailTemplates);
    const template = templates[templateName];
    
    if (!template) {
      throw new Error(`Template "${templateName}" not found`);
    }
    
    const map = buildProspectMap();
    const prospect = map[cid];
    
    if (!prospect || !prospect.email) {
      throw new Error('Prospect not found or missing email');
    }
    
    // Build replacement data
    const replacements = {
      company: prospect.name,
      contactName: prospect.name,
      date: formatDate(new Date(), 'MMMM dd, yyyy'),
      pricingTable: getPricingTableHtml(),
      customMessage: customData.customMessage || 'I wanted to reach out regarding your scrap metal services.',
      competitor: prospect.competitorMentioned || 'your current provider',
      ...customData
    };
    
    // Replace placeholders
    let subject = template.subject;
    let body = template.body;
    
    for (const [key, value] of Object.entries(replacements)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    }
    
    // Send email
    GmailApp.sendEmail(
      prospect.email,
      subject,
      body,
      {
        name: 'K&L Recycling - Kyle',
        htmlBody: body.replace(/\n/g, '<br>')
      }
    );
    
    // Log email sent
    logEmailActivity(cid, subject, prospect.email, templateName);
    
    console.log(`Email sent to ${prospect.email} using template ${templateName}`);
    
    return {
      success: true,
      message: `Email sent to ${prospect.name}`,
      recipient: prospect.email
    };
    
  } catch (error) {
    console.error('Failed to send email:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Auto-send pricing email when outcome is "Send Info"
 * Called automatically from logVisit function
 */
function autoSendPricingEmail(cid) {
  const result = sendEmailFromTemplate(cid, 'pricing');
  
  if (result.success) {
    // Update Prospects sheet to mark email sent
    updateProspectEmailStatus(cid, true);
  }
  
  return result;
}

/**
 * Send win-back campaign to "Has Vendor" prospects
 */
function sendWinBackCampaign(cid, competitor) {
  const customData = {
    competitor: competitor || 'your current provider'
  };
  
  return sendEmailFromTemplate(cid, 'winBack', customData);
}

/**
 * Batch send win-back campaigns to all "Has Vendor" prospects
 * with competitor mentions from 60-90 days ago
 */
function batchSendWinBackCampaigns() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const prospectsSheet = ss.getSheetByName(SHEET_NAMES.prospects);
  
  if (!prospectsSheet) return { success: false, message: 'Prospects sheet not found' };
  
  const data = prospectsSheet.getDataRange().getValues();
  const today = new Date();
  let sentCount = 0;
  let failedCount = 0;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const cid = row[PROSPECTS_COLUMNS.companyId];
    const lastOutcome = row[PROSPECTS_COLUMNS.lastOutcome];
    const daysSinceContact = row[PROSPECTS_COLUMNS.daysSinceLastContact];
    const competitor = row[PROSPECTS_COLUMNS.competitorMentioned];
    const contactStatus = row[PROSPECTS_COLUMNS.contactStatus];
    
    // Target "Has Vendor" prospects with competitor mentions, 60-90 days old
    if (lastOutcome === 'Has Vendor' && 
        competitor && 
        daysSinceContact >= 60 && 
        daysSinceContact <= 90 &&
        contactStatus !== 'Lost') {
      
      const result = sendWinBackCampaign(cid, competitor);
      
      if (result.success) {
        sentCount++;
        // Wait 2 seconds between emails to avoid rate limits
        Utilities.sleep(2000);
      } else {
        failedCount++;
      }
    }
  }
  
  console.log(`Win-back campaigns: ${sentCount} sent, ${failedCount} failed`);
  
  return {
    success: true,
    sentCount,
    failedCount,
    message: `Sent ${sentCount} win-back emails (${failedCount} failed)`
  };
}

/**
 * Update prospect email status
 */
function updateProspectEmailStatus(cid, emailSent) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.prospects);
  
  if (!sheet) return;
  
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][PROSPECTS_COLUMNS.companyId] === cid) {
      // Add a "Last Email Sent" column if needed (you may need to add this to your sheet)
      // For now, we'll just log it
      console.log(`Email status updated for ${cid}: ${emailSent}`);
      break;
    }
  }
}

/**
 * Create and send follow-up email draft for review
 */
function createFollowUpEmailDraft(cid, customMessage = '') {
  try {
    const map = buildProspectMap();
    const prospect = map[cid];
    
    if (!prospect || !prospect.email) {
      return { success: false, message: 'Prospect not found or missing email' };
    }
    
    const templates = getSystemSetting('emailTemplates', DEFAULT_SETTINGS.emailTemplates);
    const template = templates.followUp;
    
    const replacements = {
      company: prospect.name,
      contactName: prospect.name,
      customMessage: customMessage || `I wanted to check in about our roll-off container services for ${prospect.name}. Have you had a chance to think about our proposal?`
    };
    
    let subject = template.subject;
    let body = template.body;
    
    for (const [key, value] of Object.entries(replacements)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    }
    
    // Create draft
    const draft = GmailApp.createDraft(
      prospect.email,
      subject,
      body
    );
    
    const draftUrl = `https://mail.google.com/mail/u/0/#drafts?compose=${draft.getId()}`;
    
    return {
      success: true,
      message: 'Draft created successfully',
      draftUrl,
      recipient: prospect.email
    };
    
  } catch (error) {
    console.error('Failed to create draft:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Track email opens (requires Gmail API and tracking pixels - advanced feature)
 * Placeholder for future implementation
 */
function trackEmailOpens() {
  // TODO: Implement email open tracking
  // This would require:
  // 1. Adding tracking pixel to emails
  // 2. Setting up a web app endpoint to capture opens
  // 3. Updating the Outreach sheet when opens are detected
  console.log('Email open tracking not yet implemented');
}
