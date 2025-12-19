/* AI Advisor Logic
  Analyzes your data to find opportunities and warnings
*/

const AIAdvisor = {
  generateWeeklyInsights: function() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const pSheet = ss.getSheetByName(Config.SHEET_NAMES.prospects);
    const oSheet = ss.getSheetByName(Config.SHEET_NAMES.outreach);
    
    if (!pSheet || !oSheet) return { error: "Sheets not found" };
    
    // Get Data (Skipping headers)
    const pData = pSheet.getDataRange().getValues().slice(1); 
    const oData = oSheet.getDataRange().getValues().slice(1);
    
    // --- 1. CALCULATE METRICS ---
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    let visitsThisWeek = 0;
    let winsThisWeek = 0;
    
    // Analyze Outreach (Assuming Col 3 is Date, Col 5 is Outcome - adjust index if needed)
    // Note: In code.gs we map headers dynamically, here we use rough index for speed or mapping
    // Let's rely on mapping logic similar to Code.gs for robustness
    
    // Simple iteration for metrics
    oData.forEach(row => {
      let date = new Date(row[3]); // Visit Date column
      let outcome = row[5];        // Outcome column
      
      if (date >= oneWeekAgo) {
        visitsThisWeek++;
        if (String(outcome).toLowerCase() === 'won') winsThisWeek++;
      }
    });
    
    let conversionRate = visitsThisWeek > 0 ? ((winsThisWeek / visitsThisWeek) * 100).toFixed(1) : 0;
    
    // --- 2. FIND OPPORTUNITIES ---
    const opportunities = [];
    const industryCounts = {};
    
    pData.forEach(row => {
      // Assuming: Col 3=Industry, Col 6=Priority, Col 14=Status
      let industry = row[3];
      let status = row[14];
      
      if (industry) {
        if (!industryCounts[industry]) industryCounts[industry] = { total: 0, hot: 0 };
        industryCounts[industry].total++;
        if (status === 'Hot') industryCounts[industry].hot++;
      }
    });
    
    // Generate Industry Opportunity Text
    Object.keys(industryCounts).forEach(ind => {
      let data = industryCounts[ind];
      if (data.hot >= 2) {
        let val = Config.INDUSTRY_VALUES[ind] || 1000;
        let estRev = data.total * val;
        opportunities.push({
          type: 'industry_cluster',
          message: `🔥 ${ind} Surge: You have ${data.hot} HOT leads in ${ind}. Potential pipeline: $${estRev.toLocaleString()}.`
        });
      }
    });
    
    // --- 3. GENERATE WARNINGS ---
    const warnings = [];
    
    pData.forEach(row => {
      let company = row[2];
      let status = row[14];
      let lastContactStr = row[9]; // Last Outreach Date
      let lastContact = lastContactStr ? new Date(lastContactStr) : null;
      
      if (status === 'Hot' && lastContact) {
        let daysSince = Math.floor((now - lastContact) / (1000 * 60 * 60 * 24));
        if (daysSince > Config.THRESHOLDS.hotLeadCoolingDays) {
          warnings.push({
             type: 'cooling_lead',
             message: `❄️ Risk: ${company} (Hot) hasn't been touched in ${daysSince} days.`
          });
        }
      }
    });
    
    // --- 4. RECOMMENDATIONS ---
    const recommendations = [];
    
    if (warnings.length > 2) {
      recommendations.push({
        priority: 'high',
        action: 'Clean Up Pipeline',
        reason: 'Multiple hot leads are going cold. Call 3 today.'
      });
    }
    
    if (visitsThisWeek < 5) {
      recommendations.push({
        priority: 'medium',
        action: 'Increase Volume',
        reason: 'Low visit count this week. Try the "Route Optimization" tab.'
      });
    }

    return {
      metrics: { visitsThisWeek, winsThisWeek, conversionRate },
      opportunities: opportunities.slice(0, 3),
      warnings: warnings.slice(0, 3),
      recommendations: recommendations
    };
  }
};