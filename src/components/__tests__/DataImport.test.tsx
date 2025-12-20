import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataImport } from '../DataImport';

// Mock the StorageHelper
jest.mock('../../utils/storage', () => ({
  StorageHelper: {
    saveProspects: jest.fn(),
    savePrices: jest.fn(),
  },
}));

// Mock GoogleSheetsService
jest.mock('../../services/googleSheetsService', () => ({
  GoogleSheetsService: {
    syncProspects: jest.fn().mockResolvedValue({ success: true }),
  },
}));

describe('DataImport Component', () => {
  const mockOnDataImported = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock File.prototype.text for jsdom compatibility
    File.prototype.text = jest.fn();
  });

  it('renders the import component correctly', () => {
    render(<DataImport onDataImported={mockOnDataImported} />);

    expect(screen.getByText('Import CRM Data')).toBeInTheDocument();
    expect(screen.getByText('Drop your CSV or JSON file here')).toBeInTheDocument();
    expect(screen.getByText('Template')).toBeInTheDocument();
  });

  it('handles file drop correctly', () => {
    render(<DataImport onDataImported={mockOnDataImported} />);

    const dropZone = screen.getByText('Drop your CSV or JSON file here').closest('div');

    // Create a mock file
    const file = new File(['test content'], 'test.csv', { type: 'text/csv' });

    // Mock dataTransfer
    const dataTransfer = {
      files: [file],
    };

    fireEvent.drop(dropZone!, {
      dataTransfer,
    });

    // Check that the file name appears in the file display area
    expect(screen.getAllByText('test.csv')).toHaveLength(2); // One in drop zone, one in file display
  });

  it('parses CSV with quoted commas correctly', async () => {
    render(<DataImport onDataImported={mockOnDataImported} />);

    const csvContent = `company,address,industry
Tyler Metal Fab,"1200 N NW Loop 323, Tyler, TX",Metal
ABC Manufacturing,"456 Industrial Blvd, Suite 100, Dallas, TX",Manufacturing`;

    const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
    (file.text as jest.Mock).mockResolvedValue(csvContent);

    // Get the file input and trigger change
    const fileInput = screen.getByTestId ? screen.getByTestId('file-input') : document.getElementById('file-upload') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Click process file
    const processButton = screen.getByText('Process File');
    fireEvent.click(processButton);

    await waitFor(() => {
      expect(screen.getByText(/Successfully imported 2 prospects/)).toBeInTheDocument();
    });

    // Check that addresses with commas are parsed correctly
    const importButton = screen.getByText('Import Data');
    fireEvent.click(importButton);

    await waitFor(() => {
      expect(mockOnDataImported).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            company: 'Tyler Metal Fab',
            address: '1200 N NW Loop 323, Tyler, TX',
            industry: 'Metal',
          }),
          expect.objectContaining({
            company: 'ABC Manufacturing',
            address: '456 Industrial Blvd, Suite 100, Dallas, TX',
            industry: 'Manufacturing',
          }),
        ]),
        [],
        []
      );
    });
  });

  it('handles import completion and shows success message', async () => {
    render(<DataImport onDataImported={mockOnDataImported} />);

    const csvContent = `company,address,industry
Test Company,123 Test St,Test Industry`;

    const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
    (file.text as jest.Mock).mockResolvedValue(csvContent);

    // Upload and process file
    const fileInput = screen.getByTestId('file-input');
    fireEvent.change(fileInput, { target: { files: [file] } });

    const processButton = screen.getByText('Process File');
    fireEvent.click(processButton);

    await waitFor(() => {
      expect(screen.getByText('Import Data')).toBeInTheDocument();
    });

    // Click import
    const importButton = screen.getByText('Import Data');
    fireEvent.click(importButton);

    await waitFor(() => {
      expect(screen.getByText('Data imported and saved successfully!')).toBeInTheDocument();
    });
  });

  it('handles import errors gracefully', async () => {
    // Mock onDataImported to reject
    mockOnDataImported.mockRejectedValueOnce(new Error('Import failed'));

    render(<DataImport onDataImported={mockOnDataImported} />);

    const csvContent = `company,address,industry
Test Company,123 Test St,Test Industry`;

    const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
    (file.text as jest.Mock).mockResolvedValue(csvContent);

    // Upload and process file
    const fileInput = screen.getByTestId('file-input');
    fireEvent.change(fileInput, { target: { files: [file] } });

    const processButton = screen.getByText('Process File');
    fireEvent.click(processButton);

    await waitFor(() => {
      expect(screen.getByText('Import Data')).toBeInTheDocument();
    });

    // Click import
    const importButton = screen.getByText('Import Data');
    fireEvent.click(importButton);

    await waitFor(() => {
      expect(screen.getByText(/Import failed/)).toBeInTheDocument();
    });
  });

  it('parses JSON files correctly', async () => {
    render(<DataImport onDataImported={mockOnDataImported} />);

    const jsonContent = JSON.stringify({
      prospects: [
        { company: 'Test Company', address: '123 Test St', industry: 'Test Industry' }
      ],
      prices: [
        { category: 'Test', item: 'Test Item', min: 10, max: 20 }
      ]
    });

    const file = new File([jsonContent], 'test.json', { type: 'application/json' });
    (file.text as jest.Mock).mockResolvedValue(jsonContent);

    const fileInput = screen.getByTestId('file-input');
    fireEvent.change(fileInput, { target: { files: [file] } });

    const processButton = screen.getByText('Process File');
    fireEvent.click(processButton);

    await waitFor(() => {
      expect(screen.getByText(/Successfully imported 1 prospects, 1 prices/)).toBeInTheDocument();
    });

    const importButton = screen.getByText('Import Data');
    fireEvent.click(importButton);

    await waitFor(() => {
      expect(mockOnDataImported).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ company: 'Test Company' })
        ]),
        expect.arrayContaining([
          expect.objectContaining({ item: 'Test Item' })
        ]),
        []
      );
    });
  });

  it('rejects invalid file types', () => {
    render(<DataImport onDataImported={mockOnDataImported} />);

    const file = new File(['invalid content'], 'test.txt', { type: 'text/plain' });

    const fileInput = screen.getByTestId('file-input');
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText('Please upload a CSV or JSON file.')).toBeInTheDocument();
  });

  it('handles empty CSV files', async () => {
    render(<DataImport onDataImported={mockOnDataImported} />);

    const csvContent = `company,address,industry\n`;

    const file = new File([csvContent], 'empty.csv', { type: 'text/csv' });
    (file.text as jest.Mock).mockResolvedValue(csvContent);

    const fileInput = screen.getByTestId('file-input');
    fireEvent.change(fileInput, { target: { files: [file] } });

    const processButton = screen.getByText('Process File');
    fireEvent.click(processButton);

    await waitFor(() => {
      expect(screen.getByText(/Successfully imported 0 prospects/)).toBeInTheDocument();
    });
  });

  it('handles malformed CSV gracefully', async () => {
    render(<DataImport onDataImported={mockOnDataImported} />);

    const csvContent = `company,address,industry
Test Company,123 Test St
Another Company,456 Test Ave,Manufacturing,Extra Column`;

    const file = new File([csvContent], 'malformed.csv', { type: 'text/csv' });
    (file.text as jest.Mock).mockResolvedValue(csvContent);

    const fileInput = screen.getByTestId('file-input');
    fireEvent.change(fileInput, { target: { files: [file] } });

    const processButton = screen.getByText('Process File');
    fireEvent.click(processButton);

    await waitFor(() => {
      expect(screen.getByText(/Successfully imported 2 prospects/)).toBeInTheDocument();
    });
  });

  it('allows file removal', () => {
    render(<DataImport onDataImported={mockOnDataImported} />);

    const file = new File(['test content'], 'test.csv', { type: 'text/csv' });

    const fileInput = screen.getByTestId('file-input');
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getAllByText('test.csv')).toHaveLength(2); // One in drop zone, one in file display

    const removeButton = screen.getByLabelText('Remove file');
    fireEvent.click(removeButton);

    expect(screen.queryByText('test.csv')).not.toBeInTheDocument();
  });

  it('handles multiple file types in CSV', async () => {
    render(<DataImport onDataImported={mockOnDataImported} />);

    const csvContent = `company,address,industry,item,category,min,max,outreachId,cid,visitDate,notes
Test Company,123 Test St,Manufacturing,,,,,LID-001,company-001,2023-01-01,Test visit
,,General,Copper,Metal,4.50,4.75,,,
,,General,Aluminum,Metal,0.80,0.85,,,
`;

    const file = new File([csvContent], 'mixed.csv', { type: 'text/csv' });
    (file.text as jest.Mock).mockResolvedValue(csvContent);

    const fileInput = screen.getByTestId('file-input');
    fireEvent.change(fileInput, { target: { files: [file] } });

    const processButton = screen.getByText('Process File');
    fireEvent.click(processButton);

    await waitFor(() => {
      expect(screen.getByText(/Successfully imported 0 prospects, 2 prices, and 1 outreach records/)).toBeInTheDocument();
    });
  });

  it('handles backward compatibility with old data formats', async () => {
    render(<DataImport onDataImported={mockOnDataImported} />);

    const csvContent = `Company,Address,Industry,Lat,Lng,Priority Score,Last Outcome,Last Outreach Date,Next Step Due,Contact Status,Urgency Band,Close Probability,Competitor Mentioned,Email,Zip
Old Company,123 Old St,Old Industry,32.3845,-95.3321,85,Interested,2023-10-20,2023-11-04,Hot,High,75,None,old@company.com,75702`;

    const file = new File([csvContent], 'old_format.csv', { type: 'text/csv' });
    (file.text as jest.Mock).mockResolvedValue(csvContent);

    const fileInput = screen.getByTestId('file-input');
    fireEvent.change(fileInput, { target: { files: [file] } });

    const processButton = screen.getByText('Process File');
    fireEvent.click(processButton);

    await waitFor(() => {
      expect(screen.getByText(/Successfully imported 1 prospects/)).toBeInTheDocument();
    });

    const importButton = screen.getByText('Import Data');
    fireEvent.click(importButton);

    await waitFor(() => {
      expect(mockOnDataImported).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            company: 'Old Company',
            address: '123 Old St',
            industry: 'Old Industry',
            lat: 32.3845,
            lng: -95.3321,
            priorityScore: 85,
            lastOutcome: 'Interested',
            contactStatus: 'Hot',
            urgencyBand: 'High',
            closeProbability: 75,
            email: 'old@company.com',
            zip: '75702'
          })
        ]),
        [],
        []
      );
    });
  });

  it('handles drag and drop with multiple files (takes first)', () => {
    render(<DataImport onDataImported={mockOnDataImported} />);

    const dropZone = screen.getByText('Drop your CSV or JSON file here').closest('div');

    const file1 = new File(['content1'], 'test1.csv', { type: 'text/csv' });
    const file2 = new File(['content2'], 'test2.csv', { type: 'text/csv' });

    const dataTransfer = {
      files: [file1, file2],
    };

    fireEvent.drop(dropZone!, {
      dataTransfer,
    });

    expect(screen.getAllByText('test1.csv')).toHaveLength(2); // One in drop zone, one in file display
    expect(screen.queryByText('test2.csv')).not.toBeInTheDocument();
  });

  it('downloads template correctly', () => {
    // Mock URL.createObjectURL and document methods
    const mockCreateObjectURL = jest.fn(() => 'mock-url');
    const mockRevokeObjectURL = jest.fn();
    const mockClick = jest.fn();

    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    // Mock document.createElement
    const originalCreateElement = document.createElement;
    document.createElement = jest.fn((tagName: string) => {
      if (tagName === 'a') {
        return {
          href: '',
          download: '',
          click: mockClick,
        } as any;
      }
      return originalCreateElement.call(document, tagName);
    });

    render(<DataImport onDataImported={mockOnDataImported} />);

    const templateButton = screen.getByText('Template');
    fireEvent.click(templateButton);

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('mock-url');

    // Restore original methods
    global.URL.createObjectURL = originalCreateElement as any;
    global.URL.revokeObjectURL = originalCreateElement as any;
    document.createElement = originalCreateElement;
  });
});
