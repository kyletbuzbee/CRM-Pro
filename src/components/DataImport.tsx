import React, { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, X, Download, Users, MessageSquare, Database } from 'lucide-react';
import { Prospect, Price, Outreach } from '../types/index';
import { StorageHelper } from '../utils/storage';

interface DataImportProps {
  onDataImported: (prospects: Prospect[], prices: Price[], outreach?: Outreach[]) => void;
}

type ImportType = 'prospects' | 'outreach' | 'mixed';

interface ImportResult {
  success: boolean;
  message: string;
  data?: {
    prospects: Prospect[];
    prices: Price[];
    outreach: Outreach[];
  };
}

export const DataImport: React.FC<DataImportProps> = ({ onDataImported }) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'text/csv' || droppedFile.type === 'application/json' || droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.json')) {
        setFile(droppedFile);
        setImportResult(null);
      } else {
        setImportResult({ success: false, message: 'Please upload a CSV or JSON file.' });
      }
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setImportResult(null);
    }
  };

  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || '';
      });
      return obj;
    });

    return rows;
  };

  const validateProspect = (row: any): Prospect | null => {
    if (!row.company && !row.Company) return null;

    return {
      cid: row.cid || row.CID || `import-${Date.now()}-${Math.random()}`,
      company: row.company || row.Company || 'Unknown',
      address: row.address || row.Address || '',
      industry: row.industry || row.Industry || 'General',
      lat: parseFloat(row.lat || row.Lat) || 0,
      lng: parseFloat(row.lng || row.Lng) || 0,
      priorityScore: parseInt(row.priorityScore || row['Priority Score']) || 0,
      tags: [],
      lastOutcome: row.lastOutcome || row['Last Outcome'] || '',
      lastOutreachDate: row.lastOutreachDate || row['Last Outreach Date'] || '',
      daysSinceContact: 0,
      nextStepDue: row.nextStepDue || row['Next Step Due'] || '',
      contactStatus: row.contactStatus || row['Contact Status'] || 'Never',
      urgencyBand: row.urgencyBand || row['Urgency Band'] || 'Medium',
      closeProbability: parseInt(row.closeProbability || row['Close Probability']) || 50,
      competitorMentioned: row.competitorMentioned || row['Competitor Mentioned'],
      email: row.email || row.Email || '',
      zip: row.zip || row.Zip || ''
    };
  };

  const validatePrice = (row: any): Price | null => {
    if (!row.item && !row.Item) return null;

    return {
      category: row.category || row.Category || 'General',
      item: row.item || row.Item || '',
      min: parseFloat(row.min || row.Min) || 0,
      max: parseFloat(row.max || row.Max) || 0
    };
  };

  const validateOutreach = (row: any): Outreach | null => {
    if (!row.outreachId && !row['Outreach ID'] && !row.cid && !row.CID) return null;

    return {
      outreachId: row.outreachId || row['Outreach ID'] || `LID-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      cid: row.cid || row.CID || row.companyId || row['Company ID'] || '',
      company: row.company || row.Company || '',
      visitDate: row.visitDate || row['Visit Date'] || row.date || row.Date || '',
      notes: row.notes || row.Notes || '',
      outcome: row.outcome || row.Outcome || '',
      stage: row.stage || row.Stage || 'Prospect',
      status: row.status || row.Status || 'Cold',
      nextVisitDate: row.nextVisitDate || row['Next Visit Date'] || row.nextDate || row['Next Date'],
      followUpAction: row.followUpAction || row['Follow Up Action'] || '',
      owner: row.owner || row.Owner || 'Unknown',
      contactType: row.contactType || row['Contact Type'] || 'In Person',
      emailSent: row.emailSent === 'TRUE' || row['Email Sent'] === 'TRUE' || false
    };
  };

  const processFile = async () => {
    if (!file) return;

    setLoading(true);
    setImportResult(null);

    try {
      const text = await file.text();
      let prospects: Prospect[] = [];
      let prices: Price[] = [];
      let outreach: Outreach[] = [];

      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        const jsonData = JSON.parse(text);

        if (Array.isArray(jsonData)) {
          // Assume mixed data, try to categorize
          jsonData.forEach(item => {
            if (item.outreachId || item['Outreach ID']) {
              const outreachItem = validateOutreach(item);
              if (outreachItem) outreach.push(outreachItem);
            } else if (item.company || item.Company) {
              const prospect = validateProspect(item);
              if (prospect) prospects.push(prospect);
            } else if (item.item || item.Item) {
              const price = validatePrice(item);
              if (price) prices.push(price);
            }
          });
        } else {
          if (jsonData.prospects) {
            prospects = jsonData.prospects.map(validateProspect).filter(Boolean) as Prospect[];
          }
          if (jsonData.prices) {
            prices = jsonData.prices.map(validatePrice).filter(Boolean) as Price[];
          }
          if (jsonData.outreach) {
            outreach = jsonData.outreach.map(validateOutreach).filter(Boolean) as Outreach[];
          }
        }
      } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        const rows = parseCSV(text);

        rows.forEach(row => {
          if (row.outreachId || row['Outreach ID']) {
            const outreachItem = validateOutreach(row);
            if (outreachItem) outreach.push(outreachItem);
          } else if (row.company || row.Company) {
            const prospect = validateProspect(row);
            if (prospect) prospects.push(prospect);
          } else if (row.item || row.Item) {
            const price = validatePrice(row);
            if (price) prices.push(price);
          }
        });
      }

      const result: ImportResult = {
        success: true,
        message: `Successfully imported ${prospects.length} prospects, ${prices.length} prices, and ${outreach.length} outreach records.`,
        data: { prospects, prices, outreach }
      };

      setImportResult(result);

    } catch (error) {
      setImportResult({
        success: false,
        message: `Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    if (importResult?.success && importResult.data) {
      StorageHelper.saveProspects(importResult.data.prospects);
      StorageHelper.savePrices(importResult.data.prices);
      onDataImported(importResult.data.prospects, importResult.data.prices, importResult.data.outreach);
      setImportResult({ success: true, message: 'Data imported and saved successfully!' });
    }
  };

  const clearFile = () => {
    setFile(null);
    setImportResult(null);
  };

  const downloadTemplate = () => {
    const csvContent = `company,address,industry,lat,lng,priorityScore,lastOutcome,lastOutreachDate,nextStepDue,contactStatus,urgencyBand,closeProbability,competitorMentioned,email,zip
Tyler Metal Fab,1200 N NW Loop 323,Metal,32.3845,-95.3321,85,Interested,2023-10-20,2023-11-04,Hot,High,75,None,contact@tylermetal.com,75702
,item,category,min,max
Bare Bright,Copper,4.38,4.48
Cans,Aluminum,0.75,0.77`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'crm_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-800">Import CRM Data</h3>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Download size={16} /> Template
          </button>
        </div>

        <div className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-lg font-medium text-slate-700 mb-2">
              {file ? file.name : 'Drop your CSV or JSON file here'}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Supports prospect and pricing data import
            </p>
            <input
              type="file"
              accept=".csv,.json"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#001F3F] text-white rounded-lg hover:bg-[#003D7A] cursor-pointer transition-colors"
            >
              <FileText size={16} /> Browse Files
            </label>
          </div>

          {file && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <FileText className="text-blue-600" size={20} />
                <div>
                  <p className="font-medium text-slate-800">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <button
                onClick={clearFile}
                className="text-gray-400 hover:text-red-500 transition-colors"
                aria-label="Remove file"
                title="Remove file"
              >
                <X size={20} />
              </button>
            </div>
          )}

          {file && !importResult && (
            <button
              onClick={processFile}
              disabled={loading}
              className="w-full bg-[#001F3F] text-white py-3 rounded-xl font-bold hover:bg-[#003D7A] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Processing...' : 'Process File'}
            </button>
          )}

          {importResult && (
            <div className={`p-4 rounded-xl flex items-start gap-3 ${
              importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              {importResult.success ? (
                <CheckCircle className="text-green-600 mt-0.5" size={20} />
              ) : (
                <AlertCircle className="text-red-600 mt-0.5" size={20} />
              )}
              <div className="flex-1">
                <p className={`font-medium ${importResult.success ? 'text-green-800' : 'text-red-800'}`}>
                  {importResult.message}
                </p>
                {importResult.success && importResult.data && (
                  <div className="mt-3 flex gap-3">
                    <button
                      onClick={handleImport}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Import Data
                    </button>
                    <button
                      onClick={() => setImportResult(null)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 p-6 rounded-2xl border border-blue-200">
        <h4 className="font-bold text-blue-900 mb-2">Import Guidelines</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• CSV files should have headers matching the data structure</li>
          <li>• JSON files can contain "prospects" and "prices" arrays</li>
          <li>• Download the template above for the correct format</li>
          <li>• Data will be validated and previewed before import</li>
          <li>• Existing data will be merged with imported data</li>
        </ul>
      </div>
    </div>
  );
};
