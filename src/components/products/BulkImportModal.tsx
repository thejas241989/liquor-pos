import React, { useState, useRef } from 'react';
import { X, Upload, Download, AlertCircle, CheckCircle, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (products: any[]) => Promise<void>;
  categories: Array<{ id: string; name: string }>;
}

interface ImportResult {
  success: boolean;
  message: string;
  data?: any[];
  errors?: string[];
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  categories
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImportResult(null);
      setPreviewData([]);
      processFile(selectedFile);
    }
  };

  const processFile = (file: File) => {
    setIsProcessing(true);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        // Validate and process the data
        const result = validateAndProcessData(jsonData);
        setImportResult(result);
        
        if (result.success && result.data) {
          setPreviewData(result.data.slice(0, 10)); // Show first 10 rows as preview
        }
      } catch (error) {
        setImportResult({
          success: false,
          message: 'Error reading Excel file. Please ensure it\'s a valid Excel file.',
          errors: [error instanceof Error ? error.message : 'Unknown error']
        });
      } finally {
        setIsProcessing(false);
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  const validateAndProcessData = (data: any[][]): ImportResult => {
    if (!data || data.length < 2) {
      return {
        success: false,
        message: 'Excel file must contain at least a header row and one data row.',
        errors: ['Insufficient data']
      };
    }

    const headers = data[0].map((h: any) => String(h).toLowerCase().trim());
    const requiredHeaders = ['name', 'price', 'category', 'volume', 'barcode'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

    if (missingHeaders.length > 0) {
      return {
        success: false,
        message: `Missing required columns: ${missingHeaders.join(', ')}`,
        errors: [`Required columns: ${requiredHeaders.join(', ')}`]
      };
    }

    const processedData: any[] = [];
    const errors: string[] = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.every((cell: any) => !cell)) continue; // Skip empty rows

      try {
        const product: any = {};
        
        // Map headers to product properties
        headers.forEach((header, index) => {
          const value = row[index];
          
          switch (header) {
            case 'name':
              product.name = String(value || '').trim();
              break;
            case 'price':
              product.price = parseFloat(value) || 0;
              break;
            case 'category':
              product.category_name = String(value || '').trim();
              break;
            case 'volume':
              product.volume = String(value || '').trim();
              break;
            case 'barcode':
              product.barcode = String(value || '').trim();
              break;
            case 'stock_quantity':
            case 'stock':
              product.stock_quantity = parseInt(value) || 0;
              break;
            case 'alcohol_content':
              product.alcohol_content = parseFloat(value) || undefined;
              break;
            case 'cost':
            case 'cost_price':
              product.cost_price = parseFloat(value) || undefined;
              break;
            case 'min_stock_level':
              product.min_stock_level = parseInt(value) || undefined;
              break;
            case 'status':
              product.status = String(value || 'active').trim();
              break;
          }
        });

        // Validate required fields
        if (!product.name) {
          errors.push(`Row ${i + 1}: Product name is required`);
          continue;
        }
        if (!product.price || product.price <= 0) {
          errors.push(`Row ${i + 1}: Valid price is required`);
          continue;
        }
        if (!product.category_name) {
          errors.push(`Row ${i + 1}: Category is required`);
          continue;
        }
        if (!product.volume) {
          errors.push(`Row ${i + 1}: Volume is required`);
          continue;
        }

        // Set defaults
        product.stock_quantity = product.stock_quantity || 0;
        product.status = product.status || 'active';

        processedData.push(product);
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Processing error'}`);
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        message: `Found ${errors.length} errors in the data`,
        errors: errors.slice(0, 10) // Show first 10 errors
      };
    }

    return {
      success: true,
      message: `Successfully processed ${processedData.length} products`,
      data: processedData
    };
  };

  const handleImport = async () => {
    if (!importResult?.success || !importResult.data) return;

    try {
      await onImport(importResult.data);
      setImportResult({
        success: true,
        message: `Successfully imported ${importResult.data.length} products!`
      });
      
      // Reset form after successful import
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      setImportResult({
        success: false,
        message: 'Error importing products',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  };

  const handleClose = () => {
    setFile(null);
    setImportResult(null);
    setPreviewData([]);
    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const downloadTemplate = () => {
    const templateData = [
      ['name', 'price', 'cost_price', 'category', 'volume', 'barcode', 'stock_quantity', 'alcohol_content', 'min_stock_level', 'status'],
      ['Sample Product 1', 150, 120, 'Whiskey', '750ml', '1234567890', 10, 40, 5, 'active'],
      ['Sample Product 2', 200, 160, 'Vodka', '1L', '0987654321', 15, 37.5, 3, 'active']
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    
    XLSX.writeFile(wb, 'product_import_template.xlsx');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold flex items-center">
            <FileSpreadsheet className="w-5 h-5 mr-2" />
            Bulk Import Products
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">📋 Import Instructions</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Download the template Excel file to see the required format</li>
              <li>• Required columns: name, price, category, volume, barcode</li>
              <li>• Optional columns: cost_price, stock_quantity, alcohol_content, min_stock_level, status</li>
              <li>• Categories must match existing categories in the system</li>
              <li>• Maximum file size: 10MB</li>
            </ul>
          </div>

          {/* Template Download */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Download Template</h3>
              <p className="text-sm text-gray-600">Get the Excel template with sample data</p>
            </div>
            <button
              onClick={downloadTemplate}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </button>
          </div>

          {/* File Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center space-y-2 text-gray-600 hover:text-gray-800"
            >
              <Upload className="w-12 h-12" />
              <div>
                <p className="font-medium">Click to upload Excel file</p>
                <p className="text-sm">or drag and drop your file here</p>
              </div>
            </button>
            {file && (
              <p className="mt-2 text-sm text-gray-500">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Processing Status */}
          {isProcessing && (
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Processing file...</span>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div className={`p-4 rounded-lg ${
              importResult.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-start">
                {importResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-2" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${
                    importResult.success ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {importResult.message}
                  </p>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-red-800 font-medium">Errors:</p>
                      <ul className="text-sm text-red-700 mt-1 space-y-1">
                        {importResult.errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Preview Data */}
          {previewData.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Preview (First 10 rows)</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cost Price</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Volume</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Barcode</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {previewData.map((product, index) => (
                      <tr key={index}>
                        <td className="px-3 py-2 text-sm text-gray-900">{product.name}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">₹{product.price}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{product.cost_price ? `₹${product.cost_price}` : 'N/A'}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{product.category_name}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{product.volume}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{product.barcode}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{product.stock_quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            {importResult?.success && (
              <button
                onClick={handleImport}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Import {importResult.data?.length} Products
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkImportModal;
